## Backend Instructions

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