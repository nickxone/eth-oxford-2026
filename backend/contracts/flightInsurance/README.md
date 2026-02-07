# Flight Insurance (USDC)

This folder contains the USDC‑based flight‑delay insurance contracts for the app.

## Contracts

### `InsurancePolicy`
- **Role:** Policy registry and claim resolver.
- **What it stores:**
  - Policyholder, flight reference, time window, delay threshold, premium, and coverage.
- **Key flows:**
  - `createPolicy(...)` registers a new policy (no funds move here).
  - `acceptPolicy(id)` locks coverage in the pool and transfers the policy premium in USDC.
  - `resolvePolicy(id, proof)` verifies an FDC Web2Json proof and pays out coverage if delay criteria are met.
  - `expirePolicy(id)` releases coverage if the policy expired without a valid claim.
- **FDC usage:** The API is only queried when `resolvePolicy` is called (i.e., during a claim attempt).
- **Testing hook:** The constructor accepts an optional custom FDC verifier address. If set, it will be used instead of the on-chain FDC registry. This is intended for local/testing only.

### `InsurancePool`
- **Role:** Holds USDC liquidity and pays claims.
- **Liquidity provider shares:**
  - LPs deposit USDC and receive pool shares.
  - Shares represent a pro‑rata claim on the pool’s total USDC balance.
  - Withdrawals are limited to the pool’s **available liquidity** (i.e., total balance minus locked coverage).
- **Key flows:**
  - `deposit(amount)` pulls USDC from the LP and mints shares.
  - `withdraw(shareAmount)` burns shares and pays USDC, if free liquidity is sufficient.
  - `lockCoverage(policyId, amount)` is called by `InsurancePolicy` when a policy is accepted.
  - `payoutPolicy(policyId, holder)` pays claim to the policyholder.
  - `releaseCoverage(policyId)` releases coverage when a policy expires.

## End‑to‑End Flow (High Level)
1. Liquidity providers fund the pool with USDC.
2. Policyholder creates a policy in `InsurancePolicy`.
3. Policy is accepted, coverage is locked, premium is transferred to the pool.
4. If a claim is filed, `resolvePolicy` verifies FDC proof and pays out coverage.
5. If no valid claim, policy expires and coverage is released back to the pool.

## Notes for Future XRPL Verification
A future XRPL transaction verification step can be inserted between policy acceptance and premium collection without breaking this architecture.
