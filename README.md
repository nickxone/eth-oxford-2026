# Project Overview

FlareSure is a decentralized insurance dApp built on the Flare Network that solves the transparency and delay issues in traditional travel insurance. By leveraging the Flare Data Connector (FDC), we provide proof for the data originating from our externally hosted flight status API. Users purchase policies on Flare using fXRP, and as soon as a flight delay is verified by the Flare Oracle, the smart contract triggers an automated redemption process that sends native XRP back to the user’s wallet.

### Flare-Specific Integrations & Technical Stack

1. Flare Data Connector (FDC) — Web2Json Attestation
   We use the FDC Web2Json type to trustlessly fetch real-world flight data from airport APIs.
   The Workflow: When a user checks their status, the dApp requests a Web2Json attestation for a specific flight ID.
   On-Chain Verification: Our InsurancePolicy smart contract verifies the Merkle proof provided by the Flare Attestation Providers. If the delayMinutes field exceeds the policy threshold, the payout is triggered.
2. XRP to fXRP Cross-Chain Bridge
   To make the dApp accessible to the XRP community, we implemented a custom bridge relayer:
   Inbound: Users can fund their insurance premiums directly using their XRP secret key. Our bridge service handles the Collateral Reservation and Minting process on Flare, converting their XRP into fXRP deposited directly into the Insurance Pool.
   Outbound: Unlike other dApps that pay out in tokens, FlareSure uses the F-Asset redemption logic. Upon a valid claim, the InsurancePool contract initiates a redemption.
3. Flare Smart Contracts (Solidity)
   InsurancePool.sol: A liquidity-provider vault that manages fXRP. It handles automated approve and redeem calls to the Flare Asset Manager contract.
   InsurancePolicy.sol: The core logic engine that stores flight metadata and interfaces with the IFdcVerifier to settle or expire policies based on oracle data.

### How it Works

Quote & Bridge: The user enters their flight details and XRP secret. XRP is bridged to fXRP on Flare and locked in the InsurancePool.
Verify: The user clicks "Activate," and the InsurancePolicy contract is notified of the locked liquidity.
Monitor: The dApp tracks the flight. If a delay occurs, the user (or a bot) provides the FDC proof.
Payout: The Flare contract verifies the proof, and issues the refund


## Flight Insurance Security Measures

These are the main safety controls in the `InsurancePool` and `InsurancePolicy` contracts:

- Access control: only the pool `owner` can update ownership and set the policy contract; only the policy contract can lock/release coverage or execute payouts.
- Liquidity protection: withdrawals are blocked if they would breach locked coverage; available liquidity is enforced at withdraw time.
- Coverage accounting: each policy locks coverage once; release/payout clears the lock and updates totals to prevent double‑spend of coverage.
- Proof verification: policy resolution uses FDC Web2Json verification (or a configured custom verifier) before deciding payout vs expiry.
- Flight reference binding: the proof’s flight reference must match the policy’s recorded flight ref to prevent cross‑claiming.
- Sanity checks: non‑zero addresses and amounts are required for critical operations (pool token, owner, policy contract, payout recipient).

## Dev Instructions

`cd` into the `backend` folder, then run the following command:

```
npm install --legacy-peer-deps
```

Once the dependencies are installed, do `cp .env.example .env`, then open `.env` file and replace `PRIVATE_KEY` with an actual key obtained from the Metamask account.

To compile smart contracts run:

```
npx hardhat compile
```

Deploy the Smart Contracts using corresponding scripts.

### Mock Flights API Instructions

`cd` into `mock-api` folder, go through the following steps

Environment setup:

```
python3 -m venv .venv
source .venv/bin/activate  # Mac/Linux
# .venv\Scripts\activate   # Windows
```

Install the dependencies:

```
pip install -r requirements.txt
```

To add `ngrok` token and host the API:

```
ngrok config add-authtoken
uvicorn main:app --reload --port 8000
ngrok http 8000
```

### Run the server:

Supports minting(XRP to fXRP) as well redemption(fXRP to XRP)

```
cd backend/engine
npx tsx --env-file=.env src/bridge-server.ts
```

#### Test the server:

```
curl -X POST http://localhost:4000/api/bridge -H "Content-Type: application/json" -d '{"xrplSeed":"sEdSmNfuDCSvseYo734a279W31tJQLP","recipientAddress":"0x0e0d3685463395dF3BCa251B6941084B3F3C264a","lots":1}'
```
