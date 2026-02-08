import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import BOTH logic functions
import { bridgeXrpToFxrp } from "./mint-and-transfer-logic";
import { payoutFxrpToXrp } from "./payout-logic";

dotenv.config();

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

console.log("-----------------------------------------");
console.log("🌉 FLARE-XRP BRIDGE RELAYER STARTING...");
console.log("-----------------------------------------");

// --- ENDPOINT 1: DEPOSIT (XRP -> fXRP) ---
app.post("/api/bridge", async (req, res) => {
    const { xrplSeed, recipientAddress, lots } = req.body;

    if (!xrplSeed || !recipientAddress) {
        return res.status(400).json({ success: false, error: "Missing xrplSeed or recipientAddress" });
    }

    console.log(`\n📥 [DEPOSIT] Request Received: ${lots || 1} Lots -> ${recipientAddress}`);

    try {
        const result = await bridgeXrpToFxrp(xrplSeed, recipientAddress, lots || 1);
        console.log("✅ [DEPOSIT] Success!");
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error("❌ [DEPOSIT] Failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- ENDPOINT 2: PAYOUT (fXRP Pool -> XRP) ---
app.post("/api/payout", async (req, res) => {
    const { destinationXrpAddress, lots } = req.body;

    if (!destinationXrpAddress) {
        return res.status(400).json({ success: false, error: "Missing destinationXrpAddress" });
    }

    console.log(`\n📤 [PAYOUT] Request Received: ${lots || 1} Lots -> ${destinationXrpAddress}`);

    try {
        // Call the new logic
        const result = await payoutFxrpToXrp(destinationXrpAddress, lots || 1);

        console.log("✅ [PAYOUT] Success!");
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error("❌ [PAYOUT] Failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Bridge Relayer running at http://localhost:${PORT}`);
    console.log(`   - POST /api/bridge (Deposit XRP -> fXRP)`);
    console.log(`   - POST /api/payout (Redeem fXRP -> XRP)`);
    console.log("-----------------------------------------\n");
});
