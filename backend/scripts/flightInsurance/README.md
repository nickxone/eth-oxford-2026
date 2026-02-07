# Flight Insurance Coston2 Smoke Script

This folder contains a deployment + smoke test script for Coston2.

## Script: `deployCoston2Smoke.ts`
This script performs a basic end‑to‑end flow on Coston2 using a mock FXRP token:
1. Deploys `TestERC20` with 6 decimals to act as FXRP.
2. Deploys `InsurancePool` with the mock FXRP address.
3. Deploys `InsurancePolicy` with the mock FXRP + pool addresses.
4. Sets the policy contract on the pool.
5. Deposits 1,000 FXRP into the pool.
6. Creates a sample policy and accepts it.
7. Prints the locked coverage amount.

## Requirements
- A funded Coston2 account in `backend/.env`:
  - `PRIVATE_KEY=0x...`
- Coston2 RPC access (default uses Flare public RPCs).

## Run
```bash
cd backend
npx hardhat run scripts/flightInsurance/deployCoston2Smoke.ts --network coston2
```

## Output
The script prints deployed contract addresses and the locked coverage amount.
