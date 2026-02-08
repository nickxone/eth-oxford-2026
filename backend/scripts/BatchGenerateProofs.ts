import { run, web3 } from "hardhat";
import {
    prepareAttestationRequestBase,
    submitAttestationRequest,
    retrieveDataAndProofBaseWithRetry,
} from "./utils/fdc";

// --- CONFIGURATION ---
const { VERIFIER_URL_TESTNET, VERIFIER_API_KEY_TESTNET, COSTON2_DA_LAYER_URL } = process.env;

// 1. YOUR API BASE URL (Must match your running Python Ngrok URL)
// ⚠️ REPLACE THIS WITH YOUR CURRENT NGROK URL
const API_BASE_URL = "https://stelliferous-fairy-nonsyntactically.ngrok-free.dev";

// 2. LIST OF FLIGHTS TO VERIFY
// These match the keys in your versatile Python script
const FLIGHT_LIST = [
    "BF1234", // ✅ Delayed (>30m) - Payout
    "BA001", // ✅ Delayed (>30m) - Payout
    "LH888", // ✅ Delayed (>30m) - Payout
    "AF777", // ❌ Delayed (<30m) - Reject
    "KL002", // ❌ Delayed (<30m) - Reject
    "QA999", // ❌ On Time        - Reject
    "US101", // ❌ On Time        - Reject
];

// 3. COMMON CONFIG (Same for all flights)
const POST_PROCESS_JQ = `{flight: .flightId, status: .status, delayMinutes: .delay_minutes}`;
const ABI_SIGNATURE = `{"components": [{"internalType": "string", "name": "flight", "type": "string"},{"internalType": "string", "name": "status", "type": "string"},{"internalType": "uint256", "name": "delayMinutes", "type": "uint256"}],"name": "task","type": "tuple"}`;
const HTTP_METHOD = "GET";
const HEADERS = JSON.stringify({
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "Flare-FDC-Test",
});

async function main() {
    console.log("🚀 STARTING BATCH PROOF GENERATION");
    console.log(`   Target API: ${API_BASE_URL}`);
    console.log(`   Flights: ${FLIGHT_LIST.join(", ")}\n`);

    const proofDatabase: Record<string, any> = {};
    const requestsToSubmit: any[] = [];

    // --- STEP 1: PREPARE ALL REQUESTS ---
    console.log("1️⃣  Preparing Attestation Requests...");

    for (const flightId of FLIGHT_LIST) {
        const apiUrl = `${API_BASE_URL}/status/${flightId}`;

        const requestBody = {
            url: apiUrl,
            httpMethod: HTTP_METHOD,
            headers: HEADERS,
            queryParams: "{}",
            body: "{}",
            postProcessJq: POST_PROCESS_JQ,
            abiSignature: ABI_SIGNATURE,
        };

        const response = await prepareAttestationRequestBase(
            `${VERIFIER_URL_TESTNET}/verifier/web2/Web2Json/prepareRequest`,
            VERIFIER_API_KEY_TESTNET!,
            "Web2Json",
            "PublicWeb2",
            requestBody
        );

        if (!response.abiEncodedRequest) {
            console.error(`❌ Failed to prepare ${flightId}:`, response);
            continue;
        }

        requestsToSubmit.push({
            flightId,
            abiEncodedRequest: response.abiEncodedRequest,
            requestBody: response.requestBody, // Save for final JSON
        });

        process.stdout.write(`   ✅ Prepared ${flightId}\n`);
    }

    // --- STEP 2: SUBMIT TO BLOCKCHAIN ---
    console.log("\n2️⃣  Submitting to Blockchain (Batch)...");

    // We submit them sequentially but fast.
    // Ideally, they land in the same Voting Round to save waiting time.
    const roundIds = new Set<number>();

    for (const req of requestsToSubmit) {
        process.stdout.write(`   🚀 Submitting ${req.flightId}... `);
        try {
            const roundId = await submitAttestationRequest(req.abiEncodedRequest);
            req.roundId = roundId;
            roundIds.add(roundId);
            console.log(`-> Round ${roundId}`);
        } catch (e) {
            console.log("❌ Failed:", e);
        }
    }

    // --- STEP 3: WAIT FOR PROOFS ---
    console.log(`\n3️⃣  Waiting for proofs in Round(s): ${Array.from(roundIds).join(", ")}`);
    console.log("   (This will take ~90 seconds... Grab a coffee ☕)");

    // We wait 5 seconds just to let the last tx settle, then rely on the retry logic inside retrieveData
    await new Promise((r) => setTimeout(r, 5000));

    for (const req of requestsToSubmit) {
        if (!req.roundId) continue;

        console.log(`   🔎 Retrieving proof for ${req.flightId}...`);

        const proofUrl = `${COSTON2_DA_LAYER_URL}/api/v1/fdc/proof-by-request-round-raw`;
        const proofData = await retrieveDataAndProofBaseWithRetry(proofUrl, req.abiEncodedRequest, req.roundId);

        if (proofData) {
            console.log(`      🎉 Got Proof!`);

            // CONSTRUCT THE FINAL OBJECT FOR YOUR FRONTEND
            // We combine the DA layer proof with the original request data
            proofDatabase[req.flightId] = {
                merkleProof: proofData.proof, // The array of 32-byte hashes
                data: {
                    attestationType: proofData.response.attestationType,
                    sourceId: proofData.response.sourceId,
                    votingRound: proofData.response.votingRound,
                    lowestUsedTimestamp: proofData.response.lowestUsedTimestamp,
                    requestBody: proofData.response.requestBody, // Verify this matches formatting
                    responseBody: proofData.response.responseBody,
                },
            };
        } else {
            console.error(`      ❌ Failed to get proof for ${req.flightId}`);
        }
    }

    // --- STEP 4: OUTPUT FINAL JSON ---
    console.log("\n=======================================================");
    console.log("✅ COPY THIS BLOCK INTO 'src/data/mockProofs.ts'");
    console.log("=======================================================\n");

    console.log(`export const PROOF_DATABASE = ${JSON.stringify(proofDatabase, null, 2)};`);

    console.log("\n=======================================================");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
