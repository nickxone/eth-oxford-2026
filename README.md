## Backend Instructions

(`backend` folder)

`cd` into the `backend` folder, then run the following command:

```
npm install --legacy-peer-deps
```

Once the dependencies are installed, do `cp .env.example .env`, then open `.env` file and replace `PRIVATE_KEY` with an actual key obtained from the Metamask account.

To compile smart contracts run:

```
npx hardhat compile
```

Make sure that your account has sufficient funds, then run the following to deploy a contract:

```
npx hardhat run scripts/tryDeployment.ts --network coston2
```

To verify the API using FDC, run:

```
npx hardhat run scripts/VerifyFlightStatus.ts --network coston2
```

## Mock API Instructions

(`mock-api` folder)

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

### Smart accounts process

```
npx hardhat run scripts/deployPool.ts --network coston2
✅ InsurancePool deployed to: 0xa828384C083F8Cbb398125e9BbC16eCef568de8e
🔗 Token tracked: fXRP at 0x0b6A3645c240605887a5532109323A3E12273dc7

npx hardhat run scripts/BridgeAndBet.ts --network coston2
```

# Custom

### Run the server:

```
cd backend/engine
npx tsx --env-file=.env src/bridge-server.ts
```

### Test the server:

```
curl -X POST http://localhost:4000/api/bridge -H "Content-Type: application/json" -d '{"xrplSeed":"sEdSmNfuDCSvseYo734a279W31tJQLP","recipientAddress":"0x0e0d3685463395dF3BCa251B6941084B3F3C264a","lots":1}'
```
