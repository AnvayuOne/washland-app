# Loyalty and Wallet

## Models Used

- `LoyaltyConfiguration`
  - Source of loyalty earning configuration.
- `LoyaltyPoint`
  - Stores loyalty ledger entries.
  - Positive `points` = earned.
  - Negative `points` = redeemed.
- `Wallet`
  - Current wallet balance per user.
- `WalletTransaction`
  - Wallet transaction ledger.
- `Order`
  - Triggers loyalty awarding when moved to `COMPLETED`.

## Rules

Server source of truth is `src/lib/loyaltyRules.ts`.

- `earnRate`: points per currency unit (`LoyaltyConfiguration.pointsPerOrderCurrency`)
- `minOrderAmountForPoints`: (`LoyaltyConfiguration.minOrderForPoints`)
- `redeemRate`: currency per point (env `LOYALTY_REDEEM_RATE_PER_POINT`, default `1`)
- `minRedeemPoints`: minimum points for redemption (env `LOYALTY_MIN_REDEEM_POINTS`, default `100`)
- `maxRedeemPercentOfOrder`: optional env-based ceiling (`LOYALTY_MAX_REDEEM_PERCENT`)

## Earning Formula

- `pointsEarned = floor(orderAmount * earnRate)`
- Award only when:
  - order status is `COMPLETED`
  - `orderAmount >= minOrderAmountForPoints`

## Redemption Formula

- `walletCredit = points * redeemRate`
- Redeem only when:
  - `points >= minRedeemPoints`
  - customer points balance is sufficient

## Idempotency

Order completion awarding is idempotent in `src/lib/loyalty.ts`:

- Loyalty earn source is `ORDER_EARN:<orderId>`
- If an entry with that source already exists for the user, awarding is skipped.

Referral reward idempotency:

- Referral reward source is `REFERRAL_REWARD:<referralId>`
- Duplicate reward writes are skipped.

## Security Rules

- Customer loyalty/wallet mutation APIs require NextAuth session + `CUSTOMER` role.
- Public mutation APIs are locked:
  - `/api/loyalty` requires valid `INTERNAL_API_KEY`
  - `/api/referral` requires valid `INTERNAL_API_KEY`

## Endpoints

### Customer Loyalty

- `GET /api/customer/loyalty`
  - Returns:
    - `pointsBalance`
    - `lifetimePointsEarned`
    - `lifetimePointsRedeemed`
    - `recentTransactions` (last 20 from `LoyaltyPoint`)

- `POST /api/customer/loyalty/redeem`
  - Body: `{ points: number }`
  - Uses Prisma transaction:
    - add negative loyalty entry
    - credit wallet
    - create wallet transaction

### Customer Wallet

- `GET /api/customer/wallet`
  - Returns:
    - `walletBalance`
    - `pendingTopups`
    - `totalSpent`
    - `transactions` (last 20 from `WalletTransaction`)

- `POST /api/customer/wallet/add-money`
  - MVP Option A implemented:
    - Creates a `WALLET_TOPUP_PENDING` transaction with metadata status `PENDING`
    - Does not credit wallet immediately
    - Returns `topupId`
  - Payment integration is intentionally deferred.

### Admin

- `GET /api/admin/loyalty`
  - Returns per-user summary:
    - `fullName`, `email`
    - `pointsBalance`
    - `lifetimePointsEarned`
    - `lifetimePointsRedeemed`
    - last activity metadata
  - Also returns `recentTransactions`.

## Completion Wiring

Order completion handlers call `processOrderCompletionRewards(orderId)` in `src/lib/loyalty.ts`, which:

1. awards order loyalty points idempotently
2. processes eligible referral reward idempotently
