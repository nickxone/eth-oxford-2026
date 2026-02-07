# Flight Insurance Operational Flow (USDC)

This document describes how `InsurancePolicy` and `InsurancePool` interact for the flight-delay insurance product.

## Actors
- Policyholder: creates policies and submits claims
- Liquidity provider / Pool owner: funds the pool with USDC and configures the policy contract
- Verifier: provides FDC proof data when a claim is made

## Contracts
- `InsurancePolicy`: policy registry + claim resolution
- `InsurancePool`: holds USDC liquidity and pays claims

## Setup
1. Deploy `InsurancePool` with the USDC token address.
2. Deploy `InsurancePolicy` with the USDC token address and pool address.
3. Pool owner calls `InsurancePool.setPolicyContract(insurancePolicy)`.
4. Liquidity providers fund the pool using `InsurancePool.deposit(amount)`.

## Policy Creation
1. Policyholder calls `InsurancePolicy.createPolicy(...)` with:
   - `flightRef`
   - `startTimestamp` / `expirationTimestamp`
   - `delayThresholdMins`
   - `premium` / `coverage`
2. Policy is stored with status `Unclaimed`.

## Policy Acceptance
1. Policyholder approves `InsurancePolicy` to transfer `premium` USDC.
2. Anyone can call `InsurancePolicy.acceptPolicy(id)`.
3. If called after `startTimestamp`, policy is `Retired` and premium is not transferred.
4. Otherwise:
   - `InsurancePolicy` calls `InsurancePool.lockCoverage(id, coverage)`.
   - `InsurancePolicy` transfers `premium` USDC to the pool.
   - Policy status becomes `Active`.

## Claim (On-Chain Resolution)
1. Policyholder (or anyone) calls `InsurancePolicy.resolvePolicy(id, proof)`.
2. Contract verifies the FDC Web2Json proof and decodes the flight-delay DTO.
3. If delay >= threshold and flightRef matches, the policy settles:
   - `InsurancePolicy` calls `InsurancePool.payoutPolicy(id, holder)`.
   - Policy status becomes `Settled`.

## Expiry (No Valid Claim)
1. After `expirationTimestamp`, anyone can call `InsurancePolicy.expirePolicy(id)`.
2. Contract releases coverage back to the pool:
   - `InsurancePolicy` calls `InsurancePool.releaseCoverage(id)`.
   - Policy status becomes `Expired`.

## Notes for Future XRPL Verification Step
- XRPL proof can be added after `acceptPolicy` and before premium transfer.
- Current flow already avoids premium transfer if acceptance is too late.
- Suggested extension:
  - `acceptPolicy` locks coverage
  - `verifyXRPLPayment` validates XRPL tx
  - `collectPremium` transfers USDC premium to pool
