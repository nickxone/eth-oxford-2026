# Flight Insurance Tests

This folder contains tests for the flight‑insurance contracts.

## `InsurancePool.test.ts`
Covers the liquidity pool share accounting and withdrawal limits:
- **Share minting**: first deposit is 1:1 shares, later deposits are pro‑rata.
- **Withdrawals**: burning shares returns the correct USDC amount.
- **Locked coverage**: withdrawals are blocked when coverage is locked.
- **Share valuation**: `sharesToAmount` matches pool balance.

See `InsurancePool.test.md` for a step‑by‑step breakdown of each test.
