# Flight Insurance Tests

This folder contains tests for the flight‑insurance contracts.

## `InsurancePool.test.ts`
Covers the liquidity pool share accounting and withdrawal limits:
- **Share minting**: first deposit is 1:1 shares, later deposits are pro‑rata.
- **Withdrawals**: burning shares returns the correct FXRP amount.
- **Locked coverage**: withdrawals are blocked when coverage is locked.
- **Share valuation**: `sharesToAmount` matches pool balance.

## `InsurancePolicyAndPool.test.ts`
Covers the combined policy + pool flow using a mock FDC verifier:
- **Policy acceptance**: locks coverage and transfers premium to the pool.
- **Claim payout**: resolves a claim with a mocked proof and pays the holder.
- **Expiry flow**: expires a policy and releases coverage back to the pool.

See `InsurancePool.test.md` for a step‑by‑step breakdown of each test.
