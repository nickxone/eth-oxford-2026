import { ethers, web3 } from "hardhat";
import { Wallet, Client } from "xrpl";
import { submitAttestationRequest, retrieveDataAndProofBaseWithRetry } from "./utils/fdc";

// --- CONFIGURATION ---
const POOL_ADDRESS = "0xa828384C083F8Cbb398125e9BbC16eCef568de8e";
// ⚠️ YOUR SECRET (Keep this correct!)
const USER_XRP_SEED = "sEdStxLAsGY7wTDah3ZGAfoKFHVN5CP";
const LOTS = 1;

// --- DYNAMIC AGENT FINDER ---
async function findBestAgent(assetManager: any) {
    console.log("   🔎 Scanning for active Agents...");
    const agents = (await assetManager.getAvailableAgentsDetailedList(0, 100))._agents;
    let availableAgents = agents.filter((a: any) => Number(a.freeCollateralLots) >= LOTS && Number(a.status) === 0);
    if (availableAgents.length === 0) throw new Error("No agents available!");
    availableAgents.sort((a: any, b: any) => Number(a.feeBIPS) - Number(b.feeBIPS));
    const bestAgentSummary = availableAgents[0];
    const fullInfo = await assetManager.getAgentInfo(bestAgentSummary.agentVault);

    return {
        vaultAddress: bestAgentSummary.agentVault,
        xrpAddress: fullInfo.underlyingAddressString,
        feeBIPS: bestAgentSummary.feeBIPS,
    };
}

// --- HELPER: DELAY ---
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function main() {
    console.log("🚀 STARTING 'BRIDGE & BET' (With Delay)");
    console.log("---------------------------------------");

    // 0. Validate Seed
    const wallet = Wallet.fromSeed(USER_XRP_SEED);
    console.log(`   👤 User XRP Address: ${wallet.classicAddress}`);

    // 1. SETUP
    const IAssetManager = artifacts.require("IAssetManager");
    const assetManager = await IAssetManager.at("0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA");

    // 2. FIND AGENT
    const agent = await findBestAgent(assetManager);
    console.log(`   ✅ Agent Found: ${agent.vaultAddress}`);
    console.log(`   🏦 Agent XRP:   ${agent.xrpAddress}`);

    // 3. RESERVE
    console.log("\n1️⃣  Reserving Collateral...");
    const reservationFee = await assetManager.collateralReservationFee(LOTS);
    const txReserve = await assetManager.reserveCollateral(
        agent.vaultAddress,
        LOTS,
        agent.feeBIPS,
        ethers.ZeroAddress,
        { value: reservationFee }
    );

    const log = txReserve.logs.find((l: any) => l.event === "CollateralReserved");
    const reservationId = log.args.collateralReservationId;
    const paymentRef = log.args.paymentReference;
    const amountToPay = BigInt(log.args.valueUBA) + BigInt(log.args.feeUBA);

    console.log(`   ✅ Reserved! ID: ${reservationId}`);
    console.log(`   💰 Pay Amount:   ${amountToPay} drops`);

    // 4. USER SENDS XRP
    console.log("\n2️⃣  User Sending XRP...");
    const client = new Client("wss://s.altnet.rippletest.net:51233");
    await client.connect();

    const cleanRef = paymentRef.replace(/^0x/, "").toUpperCase();
    const paymentTx = {
        TransactionType: "Payment",
        Account: wallet.classicAddress,
        Destination: agent.xrpAddress,
        Amount: amountToPay.toString(),
        Memos: [{ Memo: { MemoData: cleanRef } }],
    };

    const prepared = await client.autofill(paymentTx as any);
    const signed = wallet.sign(prepared);
    console.log("   ⏳ Submitting to XRPL...");
    const result = await client.submitAndWait(signed.tx_blob);
    console.log(`   ✅ XRP Sent! Hash: ${signed.hash}`);
    await client.disconnect();

    // --- CRITICAL DELAY ---
    console.log("\n   ⏳ Waiting 15s for XRP Ledger propagation...");
    await delay(15000);

    // 5. GENERATE PROOF
    console.log("\n3️⃣  Verifying Payment...");

    const verifierUrl = "https://fdc-verifiers-testnet.flare.network/verifier/xrp/Payment/prepareRequest";
    const req = await fetch(verifierUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": process.env.VERIFIER_API_KEY_TESTNET || "" },
        body: JSON.stringify({
            attestationType: "0x5061796d656e7400000000000000000000000000000000000000000000000000",
            sourceId: "0x7465737458525000000000000000000000000000000000000000000000000000",
            requestBody: { transactionId: signed.hash, inUtxo: "0", utxo: "0" },
        }),
    });
    const data = await req.json();

    // ⚠️ ERROR CHECKING
    if (!data.abiEncodedRequest && !data.data) {
        console.error("   ❌ API ERROR:", data);
        throw new Error("Verifier API returned an error.");
    }

    const abiEncodedRequest = data.abiEncodedRequest || data.data;

    const roundId = await submitAttestationRequest(abiEncodedRequest);
    console.log(`   ✅ Request Submitted (Round ${roundId}). Waiting for finalization...`);

    const DA_URL = process.env.COSTON2_DA_LAYER_URL || "https://ctn2-data-availability.flare.network";
    const proof = await retrieveDataAndProofBaseWithRetry(
        `${DA_URL}/api/v1/fdc/proof-by-request-round-raw`,
        abiEncodedRequest,
        roundId
    );

    if (!proof) throw new Error("Proof failed");
    console.log("   ✅ Proof Acquired!");

    // Decode Proof
    const IPaymentVerification = await artifacts.require("IPaymentVerification");
    const responseType = IPaymentVerification._json.abi[0].inputs[0].components[1];
    const decodedResponse = web3.eth.abi.decodeParameter(responseType, proof.response_hex);

    // 6. EXECUTE MINT
    console.log("\n4️⃣  Executing Minting...");
    await assetManager.executeMinting({ merkleProof: proof.proof, data: decodedResponse }, reservationId);
    console.log("   ✅ Minted fXRP!");

    // 7. DEPOSIT TO POOL
    console.log("\n5️⃣  Depositing to Insurance Pool...");
    const [signer] = await ethers.getSigners();
    const fXRPAddr = await assetManager.fAsset();
    const fxrp = await ethers.getContractAt("IERC20", fXRPAddr);
    const poolContract = await ethers.getContractAt("InsurancePool", POOL_ADDRESS);

    // We use valueUBA (drops) directly
    // NOTE: In the time it took to mint, the balance is now in the Signer's wallet.
    console.log(`   📲 Transferring ${amountToPay} drops...`);

    await fxrp.approve(POOL_ADDRESS, amountToPay);
    await fxrp.transfer(POOL_ADDRESS, amountToPay);
    await poolContract.recordDeposit(signer.address, amountToPay);

    console.log("   🎉 SUCCESS! Funds are in the Pool.");
    console.log(`   User ${signer.address} has successfully bridged & insured!`);
}

main().catch(console.error);
