import { run, web3 } from "hardhat";
import {
    prepareAttestationRequestBase,
    submitAttestationRequest,
    retrieveDataAndProofBaseWithRetry,
} from "./utils/fdc";

const { VERIFIER_URL_TESTNET, VERIFIER_API_KEY_TESTNET, COSTON2_DA_LAYER_URL } = process.env;

// --- 1. CONFIGURATION FOR YOUR FLIGHT API ---
// Ensure this URL is live and accessible
const apiUrl = "https://stelliferous-fairy-nonsyntactically.ngrok-free.dev/status/BF1234";

// JQ Filter: Matches your API keys EXACTLY
// API returns: {"flightId":..., "status":..., "delay_minutes":...}
const postProcessJq = `{flight: .flightId, status: .status, delayMinutes: .delay_minutes}`;

const httpMethod = "GET";

// Headers to bypass Ngrok warning page
const headers = JSON.stringify({
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "Flare-FDC-Test",
});

const queryParams = "{}";
const body = "{}";

// ABI Signature: Matches the keys inside your JQ Filter (left side)
const abiSignature = `{"components": [{"internalType": "string", "name": "flight", "type": "string"},{"internalType": "string", "name": "status", "type": "string"},{"internalType": "uint256", "name": "delayMinutes", "type": "uint256"}],"name": "task","type": "tuple"}`;

const attestationTypeBase = "Web2Json";
const sourceIdBase = "PublicWeb2";
const verifierUrlBase = VERIFIER_URL_TESTNET;

async function prepareAttestationRequest(apiUrl: string, postProcessJq: string, abiSignature: string) {
    const requestBody = {
        url: apiUrl,
        httpMethod: httpMethod,
        headers: headers,
        queryParams: queryParams,
        body: body,
        postProcessJq: postProcessJq,
        abiSignature: abiSignature,
    };

    const url = `${verifierUrlBase}/verifier/web2/Web2Json/prepareRequest`;
    const apiKey = VERIFIER_API_KEY_TESTNET;

    const response = await prepareAttestationRequestBase(url, apiKey, attestationTypeBase, sourceIdBase, requestBody);

    // 🔍 DEBUGGING
    if (!response.abiEncodedRequest) {
        console.error("❌ Verifier Error Response:", JSON.stringify(response, null, 2));
    }
    return response;
}

async function retrieveDataAndProof(abiEncodedRequest: string, roundId: number) {
    const url = `${COSTON2_DA_LAYER_URL}/api/v1/fdc/proof-by-request-round-raw`;
    console.log("Url:", url, "\n");
    return await retrieveDataAndProofBaseWithRetry(url, abiEncodedRequest, roundId);
}

async function decodeProofOnly(proof: any) {
    console.log("Proof hex:", proof.response_hex, "\n");

    const IWeb2JsonVerification = await artifacts.require("IWeb2JsonVerification");
    const responseType = IWeb2JsonVerification._json.abi[0].inputs[0].components[1];
    console.log("Response type:", responseType, "\n");

    const decodedResponse = web3.eth.abi.decodeParameter(responseType, proof.response_hex);

    console.log("✅ DECODED FLIGHT DATA:");
    console.log("-----------------------");
    console.log(decodedResponse);
    console.log("-----------------------");
}

async function main() {
    console.log("🚀 Verifying Flight: FB1234");

    const data = await prepareAttestationRequest(apiUrl, postProcessJq, abiSignature);

    // Safety check
    if (!data.abiEncodedRequest) {
        console.log("⚠️ Stopping due to verification error.");
        return;
    }

    console.log("Data Prepared:", data.abiEncodedRequest.slice(0, 30) + "...", "\n");

    const abiEncodedRequest = data.abiEncodedRequest;
    const roundId = await submitAttestationRequest(abiEncodedRequest);
    console.log(`Submitting to Round ${roundId}...`);

    const proof = await retrieveDataAndProof(abiEncodedRequest, roundId);

    await decodeProofOnly(proof);
}

void main().then(() => {
    process.exit(0);
});
