import { ethers } from "ethers";

// --- CONFIGURATION ---
// ⚠️ Update this to your deployed FAssetsRedeem address
const POOL_CONTRACT_ADDRESS = "0x0e0d3685463395dF3BCa251B6941084B3F3C264a";
const COSTON2_RPC = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";

// --- MINIMAL ABIs (No file dependencies!) ---
const F_ASSETS_REDEEM_ABI = [
    "function payoutToXRP(uint256 _lots, string _targetXrpAddress) returns (uint256)",
    "function getFXRPAddress() view returns (address)",
    "function getSettings() view returns (uint256, uint256)",
];

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
];

const ASSET_MANAGER_ABI = [
    "event RedemptionRequested(address indexed redeemer, uint256 indexed requestId, uint256 amountUBA, string paymentAddress, uint256 value, uint256 firstUnderlyingBlock, uint256 lastUnderlyingBlock, uint256 lastUnderlyingTimestamp, bytes32 paymentReference, address indexed executor, uint256 executorFeeNatWei)",
];

export async function payoutFxrpToXrp(destinationXrpAddress: string, lots: number = 1) {
    console.log(`\n🚀 STARTING PAYOUT: ${lots} Lot(s) -> ${destinationXrpAddress}`);

    // 1. Setup Provider & Wallet (Admin)
    if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY missing in .env");

    const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // 2. Connect to Contracts
    const fAssetsRedeem = new ethers.Contract(POOL_CONTRACT_ADDRESS, F_ASSETS_REDEEM_ABI, wallet);

    // Get fXRP address dynamically
    const fxrpAddress = await fAssetsRedeem.getFXRPAddress();
    const fxrp = new ethers.Contract(fxrpAddress, ERC20_ABI, wallet);

    // 3. Check Pool Balance
    const [lotSizeAMG] = await fAssetsRedeem.getSettings();
    const amountNeeded = BigInt(lotSizeAMG) * BigInt(lots);
    const currentBalance = await fxrp.balanceOf(POOL_CONTRACT_ADDRESS);

    console.log(`   Pool Balance: ${ethers.formatUnits(currentBalance, 6)} fXRP`);
    console.log(`   Required:     ${ethers.formatUnits(amountNeeded, 6)} fXRP`);

    // 4. Fund if empty (Auto-Funding)
    if (currentBalance < amountNeeded) {
        console.log("⚠️ Pool balance low. Funding from Admin wallet...");
        const fundTx = await fxrp.transfer(POOL_CONTRACT_ADDRESS, amountNeeded);
        await fundTx.wait();
        console.log("✅ Pool Refilled.");
    }

    // 5. Trigger Payout
    console.log("Calling payoutToXRP...");
    const tx = await fAssetsRedeem.payoutToXRP(lots, destinationXrpAddress);
    console.log(`   Tx Sent: ${tx.hash}`);

    const receipt = await tx.wait();

    // 6. Parse Logs to find Redemption ID
    let requestId = null;
    const iface = new ethers.Interface(ASSET_MANAGER_ABI);

    for (const log of receipt.logs) {
        try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "RedemptionRequested") {
                requestId = parsed.args.requestId.toString();
                console.log(`🎫 Redemption Request Created! ID: ${requestId}`);
            }
        } catch (e) {
            /* ignore other events */
        }
    }

    return {
        success: true,
        txHash: tx.hash,
        requestId: requestId,
        message: "Redemption triggered successfully. Funds will arrive on XRPL shortly.",
    };
}
