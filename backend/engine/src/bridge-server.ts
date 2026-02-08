import express from "express";
import cors from "cors";
import { bridgeXrpToFxrp } from "./mint-and-transfer-logic"; // The logic we just refactored
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 4000;

// Enable CORS so your Next.js app can talk to this server
app.use(cors());
app.use(express.json());

console.log("-----------------------------------------");
console.log("🌉 FLARE-XRP BRIDGE RELAYER STARTING...");
console.log("-----------------------------------------");

app.post("/api/bridge", async (req, res) => {
  const { xrplSeed, recipientAddress, lots } = req.body;

  // Basic validation
  if (!xrplSeed || !recipientAddress) {
    return res.status(400).json({
      success: false,
      error: "Missing xrplSeed or recipientAddress",
    });
  }

  console.log(`\n📥 Received Bridge Request:`);
  console.log(`   Recipient: ${recipientAddress}`);
  console.log(`   Amount: ${lots || 1} Lot(s) (~${(lots || 1) * 10} XRP)`);

  try {
    // We set a long timeout for the response because this process takes 3-5 mins
    // Note: Browsers might still timeout, so polling the balance on frontend is still recommended
    const result = await bridgeXrpToFxrp(xrplSeed, recipientAddress, lots || 1);

    console.log("✅ BRIDGE SEQUENCE SUCCESSFUL");
    res.json({
      success: true,
      message: "Minting and Transfer complete!",
      data: result,
    });
  } catch (error: any) {
    console.error("\n❌ BRIDGE SEQUENCE FAILED:");
    console.error(error.message);

    res.status(500).json({
      success: false,
      error: error.message || "An unknown error occurred during the bridge process.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bridge Relayer running at http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/bridge`);
  console.log("-----------------------------------------\n");
});
