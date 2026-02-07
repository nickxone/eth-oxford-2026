# InsurancePool Tests

This document describes each test in `backend/test/flightInsurance/InsurancePool.test.ts`.

## mints shares 1:1 on first deposit and pro-rata after
- Deploys a USDC-like `TestERC20` and the `InsurancePool`.
- First LP deposits 100 USDC and receives 100 shares (1:1 when pool is empty).
- Second LP deposits 50 USDC and receives 50 shares (pro‑rata based on current pool balance).
- Verifies `totalShares` and each LP’s share balance.

## withdraw burns shares and pays USDC
- LP deposits 200 USDC and receives 200 shares.
- LP withdraws 50 shares.
- Verifies share balance decreases to 150 and that the LP receives 50 USDC.

## respects locked coverage when withdrawing
- LP deposits 100 USDC.
- Policy contract locks 80 USDC as coverage.
- Attempt to withdraw 100 shares reverts due to insufficient free liquidity.
- After coverage is released, withdrawal of 100 shares succeeds and LP’s shares are zero.

## sharesToAmount matches pool balance
- LP deposits 123 USDC.
- Calls `sharesToAmount(123 shares)` and expects it to equal 123 USDC.
