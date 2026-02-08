# Flight Insurance Operational Flow (FXRP)

This document describes how `InsurancePolicy` and `InsurancePool` interact for the flight-delay insurance product.

## Actors
- Policyholder: creates policies and submits claims
- Liquidity provider / Pool owner: funds the pool with FXRP and configures the policy contract
- Verifier: provides FDC proof data when a claim is made

## Contracts
- `InsurancePolicy`: policy registry + claim resolution
- `InsurancePool`: holds FXRP liquidity and pays claims

## Setup
1. Deploy `InsurancePool` with the FXRP token address.
2. Deploy `InsurancePolicy` with the FXRP token address and pool address.
3. Pool owner calls `InsurancePool.setPolicyContract(insurancePolicy)`.
4. Liquidity providers fund the pool using `InsurancePool.deposit(amount)`.

## Policy Creation
1. Policyholder transfers FXRP premium to `InsurancePolicy`.
2. Policyholder calls `InsurancePolicy.createPolicy(...)` with:
   - `flightRef`
   - `travelDate`
   - `predictedArrivalTime`
   - `premium` / `coverage`
   - `depositedAmount` (must match `premium`)
3. Policy is stored with status `Active`, the premium is forwarded to the pool, and coverage is locked.

## Claim (On-Chain Resolution)
1. Policyholder (or anyone) calls `InsurancePolicy.resolvePolicy(id, proof)`.
2. Contract verifies the FDC Web2Json proof and decodes the flight-delay DTO.
3. If the flight is delayed and flightRef matches, the policy settles:
   - `InsurancePolicy` calls `InsurancePool.payoutPolicy(id, holder)`.
   - Policy status becomes `Settled`.

## Expiry (Flight Not Delayed)
1. If `resolvePolicy` is called and the flight is not delayed, the policy expires.
2. Contract releases coverage back to the pool:
   - `InsurancePolicy` calls `InsurancePool.releaseCoverage(id)`.
   - Policy status becomes `Expired`.

## Notes for Future XRPL Verification Step
- XRPL proof can be added before `createPolicy` to validate the external payment.
- Current flow transfers premium during policy creation.
- Suggested extension:
  - `verifyXRPLPayment` validates XRPL tx
  - `createPolicy` transfers FXRP premium to pool

## Testing Note (FDC Down)
`InsurancePolicy` supports an optional custom FDC verifier address in the constructor. If provided, it will be used instead of the on-chain FDC registry. This allows mocking `verifyWeb2Json` during tests without altering production logic.
