import { ethers, artifacts } from "hardhat";
import { formatUnits } from "ethers";

// SETTINGS - UPDATE THESE
const POOL_CONTRACT_ADDRESS = "0x0e0d3685463395dF3BCa251B6941084B3F3C264a";
const USER_XRP_ADDRESS = "r95Yi2uND3gyun4yXomw2hpqWeJBi8LAiM";
const LOTS_TO_SEND = 1;

async function main() {
    const [admin] = await ethers.getSigners();

    // 1. Connect to the existing contract
    // We use artifacts.require for the ABI but ethers for the interaction
    const FAssetsRedeem = await ethers.getContractAt("FAssetsRedeem", POOL_CONTRACT_ADDRESS);
    const AssetManagerABI = (
        await artifacts.readArtifact("@flarenetwork/flare-periphery-contracts/coston2/IAssetManager.sol:IAssetManager")
    ).abi;

    const fxrpAddress = await FAssetsRedeem.getFXRPAddress();
    const fxrp = await ethers.getContractAt("IERC20", fxrpAddress);

    // 2. Check Pool Balance
    const settings = await FAssetsRedeem.getSettings();
    const amountNeeded = settings.lotSizeAMG * BigInt(LOTS_TO_SEND);
    const currentBalance = await fxrp.balanceOf(POOL_CONTRACT_ADDRESS);

    console.log(`\n🏦 Pool Status:`);
    console.log(`   Address: ${POOL_CONTRACT_ADDRESS}`);
    console.log(`   Current Balance: ${formatUnits(currentBalance, 6)} fXRP`);
    console.log(`   Required for Payout: ${formatUnits(amountNeeded, 6)} fXRP`);

    // 4. Trigger the Payout to XRP Ledger
    console.log(`\n🚀 Triggering Payout...`);
    console.log(`   Destination XRP: ${USER_XRP_ADDRESS}`);

    const payoutTx = await FAssetsRedeem.payoutToXRP(LOTS_TO_SEND, USER_XRP_ADDRESS);
    const receipt = await payoutTx.wait();

    console.log(`✅ Payout Triggered! Tx Hash: ${payoutTx.hash}`);

    // 5. Extract Redemption Request ID from logs
    const iface = new ethers.Interface(AssetManagerABI);
    for (const log of receipt!.logs) {
        try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "RedemptionRequested") {
                console.log(`\n🎫 Redemption Request Created!`);
                console.log(`   Request ID: ${parsed.args.requestId}`);
                console.log(`   Wait ~1-3 mins for XRP arrival.`);
            }
        } catch (e) {
            /* skip logs not from AssetManager */
        }
    }
}

main().catch(console.error);
