# Flight Insurance (FXRP)

This folder contains the FXRP‑based flight‑delay insurance contracts for the app.

## Contracts

### `InsurancePolicy`
- **Role:** Policy registry and claim resolver.
- **What it stores:**
  - Policyholder, flight reference, premium, and coverage.
- **Key flows:**
  - `createPolicy(...)` registers a new policy, transfers the deposited FXRP premium to the pool, and locks coverage.
  - `resolvePolicy(id, proof)` verifies an FDC Web2Json proof and pays out coverage if the flight is delayed.
  - If the flight is not delayed, coverage is released and the policy expires.
- **FDC usage:** The API is only queried when `resolvePolicy` is called (i.e., during a claim attempt).
- **Testing hook:** The constructor accepts an optional custom FDC verifier address. If set, it will be used instead of the on-chain FDC registry. This is intended for local/testing only.

### `InsurancePool`
- **Role:** Holds FXRP liquidity and pays claims.
- **Liquidity provider shares:**
  - LPs deposit FXRP and receive pool shares.
  - Shares represent a pro‑rata claim on the pool’s total FXRP balance.
  - Withdrawals are limited to the pool’s **available liquidity** (i.e., total balance minus locked coverage).
- **Key flows:**
  - `deposit(amount)` pulls FXRP from the LP and mints shares.
  - `withdraw(shareAmount)` burns shares and pays FXRP, if free liquidity is sufficient.
  - `lockCoverage(policyId, amount)` is called by `InsurancePolicy` when a policy is accepted.
  - `payoutPolicy(policyId, holder)` pays claim to the policyholder.
  - `releaseCoverage(policyId)` releases coverage when a policy expires.

## End‑to‑End Flow (High Level)
1. Liquidity providers fund the pool with FXRP.
2. Policyholder transfers FXRP premium to `InsurancePolicy` and creates a policy.
3. Coverage is locked during policy creation.
4. If a claim is filed, `resolvePolicy` verifies FDC proof and pays out coverage.
5. If no valid claim, policy expires and coverage is released back to the pool.

## Notes for Future XRPL Verification
A future XRPL transaction verification step can be inserted between policy acceptance and premium collection without breaking this architecture.
