import { ethers, web3 } from "hardhat"; // Added web3
import { retrieveDataAndProofBaseWithRetry } from "../utils/fdc"; 

// --- CONFIGURATION ---
const XRP_TX_HASH = "B6316EEC112EB2369F1D6388CEF55DE3A93E01BF27495036729086EF1094E63E";
const RESERVATION_ID = "25928403";
const ASSET_MANAGER_ADDRESS = "0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA";
const ROUND_ID = 1245023; // From your logs
const DA_URL = process.env.COSTON2_DA_LAYER_URL || "https://ctn2-data-availability.flare.network";

async function main() {
    console.log("🚀 STARTING FINAL MINTING PROCESS (With Decoding)");
    console.log("-------------------------------------------------");
    
    // 1. RE-FETCH PROOF (Fastest way to get data)
    // We fetch the raw ABI request again to ensure we get the right proof from DA
    console.log("1️⃣  Fetching Proof from DA Layer...");
    
    // Manually reconstruct the Request Bytes (since imports are tricky)
    const verifierUrl = "https://fdc-verifiers-testnet.flare.network/verifier/xrp/Payment/prepareRequest";
    const req = await fetch(verifierUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": process.env.VERIFIER_API_KEY_TESTNET || "" },
        body: JSON.stringify({
            attestationType: "0x5061796d656e7400000000000000000000000000000000000000000000000000",
            sourceId: "0x7465737458525000000000000000000000000000000000000000000000000000",
            requestBody: { transactionId: XRP_TX_HASH, inUtxo: "0", utxo: "0" }
        })
    });
    const data = await req.json();
    const abiEncodedRequest = data.abiEncodedRequest || data.data;

    const proof = await retrieveDataAndProofBaseWithRetry(
        `${DA_URL}/api/v1/fdc/proof-by-request-round-raw`, 
        abiEncodedRequest, 
        ROUND_ID
    );

    if (!proof) throw new Error("Proof not found");
    console.log("   ✅ Proof Acquired!");

    // 2. DECODE THE PROOF (The Missing Step!)
    console.log("\n2️⃣  Decoding Response Struct...");
    const IPaymentVerification = await artifacts.require("IPaymentVerification");
    const responseType = IPaymentVerification._json.abi[0].inputs[0].components[1];
    
    // Convert Hex String -> Struct Object
    const decodedResponse = web3.eth.abi.decodeParameter(responseType, proof.response_hex);
    console.log("   ✅ Decoded!");

    // 3. EXECUTE MINTING
    console.log("\n3️⃣  Executing Minting...");
    
    const IAssetManager = artifacts.require("IAssetManager");
    const assetManager = await IAssetManager.at(ASSET_MANAGER_ADDRESS);

    try {
        const tx = await assetManager.executeMinting(
            {
                merkleProof: proof.proof,
                data: decodedResponse // Pass the Object, not the Hex String!
            },
            RESERVATION_ID
        );
        
        console.log("   ⏳ Minting transaction sent...");
        console.log("\n   🎉 MINTING SUCCESSFUL!");
        console.log("   ===========================================");
        console.log(`   ✅ TX Hash: ${tx.tx}`);
        console.log("   ===========================================");

    } catch (e: any) {
        console.error("   ❌ Minting Failed:", e.reason || e.message);
    }
}

main().catch(console.error);