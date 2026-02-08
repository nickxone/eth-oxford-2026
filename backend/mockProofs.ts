import { ethers } from "ethers";

// Helper to ensure the mocked data matches the Oracle's format exactly
const ABI = new ethers.AbiCoder();
function encodeFlightData(flight: string, status: string, delay: number) {
    return ABI.encode(["tuple(string flight, string status, uint256 delayMinutes)"], [[flight, status, delay]]);
}

export const PROOF_DATABASE: Record<string, any> = {
    // ✅ SCENARIO 1: SUCCESS (Delayed > 30m)
    // This proof comes from your previous run (Round 1245423)
    BF1234: {
        merkleProof: [
            "0x84368fa80e202fd0766b5cee2f6f1c8f3e311b24fcbfd6fa46ce299d0b9bf1da",
            "0x8b8662752fea2b4ee037274fa801cb11bc8d61e836abf52ac690f8be1dc3bbee",
            "0x1bb22f443a29041a298b2e698aa6ddc8c7bfc6e40cc2ad585df20826d1c4fa0f",
            "0xc32ae1907ef1c0d5ea2bb200e5d10db44f89bd36dbc0d7cc4ef77c277223324c",
        ],
        data: {
            attestationType: "0x576562324a736f6e000000000000000000000000000000000000000000000000",
            sourceId: "0x5075626c69635765623200000000000000000000000000000000000000000000",
            votingRound: 1245423,
            lowestUsedTimestamp: 0,
            requestBody: {
                url: "https://stelliferous-fairy-nonsyntactically.ngrok-free.dev/status/BF1234",
                httpMethod: "GET",
                headers: '{"ngrok-skip-browser-warning":"true","User-Agent":"Flare-FDC-Test"}',
                queryParams: "{}",
                body: "{}",
                postProcessJq: "{flight: .flightId, status: .status, delayMinutes: .delay_minutes}",
                abiSignature:
                    '{"components": [{"internalType": "string", "name": "flight", "type": "string"},{"internalType": "string", "name": "status", "type": "string"},{"internalType": "uint256", "name": "delayMinutes", "type": "uint256"}],"name": "task","type": "tuple"}',
            },
            responseBody: {
                abiEncodedData: encodeFlightData("BF1234", "Delayed", 210),
            },
        },
    },

    // ❌ SCENARIO 2: REJECTION (On Time)
    // This proof comes from your FRESH log (Round 1245455)
    QA999: {
        merkleProof: [
            "0x3f9db1506571b763fc47d50d18fc3137f1e4d7566e1944377c98489ac6bf1525",
            "0x1cf6d346fddc2be034794bae6ccee34e9ed0a23f443e5d3ad51cf1e85665cb99",
            "0x121e1cd411ae989c1141613c075b026b3365bc655898818496f5b5e9d5d773d5",
        ],
        data: {
            attestationType: "0x576562324a736f6e000000000000000000000000000000000000000000000000",
            sourceId: "0x5075626c69635765623200000000000000000000000000000000000000000000",
            votingRound: 1245455,
            lowestUsedTimestamp: 0,
            requestBody: {
                url: "https://stelliferous-fairy-nonsyntactically.ngrok-free.dev/status/QA999",
                httpMethod: "GET",
                headers: '{"ngrok-skip-browser-warning":"true","User-Agent":"Flare-FDC-Test"}',
                queryParams: "{}",
                body: "{}",
                postProcessJq: "{flight: .flightId, status: .status, delayMinutes: .delay_minutes}",
                abiSignature:
                    '{"components": [{"internalType": "string", "name": "flight", "type": "string"},{"internalType": "string", "name": "status", "type": "string"},{"internalType": "uint256", "name": "delayMinutes", "type": "uint256"}],"name": "task","type": "tuple"}',
            },
            responseBody: {
                abiEncodedData: encodeFlightData("QA999", "On Time", 0),
            },
        },
    },
};
