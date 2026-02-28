import type { PrismaClient } from "@prisma/client"

export interface ActiveLoyaltyRules {
  earnRate: number
  minOrderAmountForPoints: number
  redeemRate: number
  minRedeemPoints: number
  maxRedeemPercentOfOrder: number | null
}

const DEFAULT_LOYALTY_RULES: ActiveLoyaltyRules = {
  earnRate: 1,
  minOrderAmountForPoints: 0,
  redeemRate: 1,
  minRedeemPoints: 100,
  maxRedeemPercentOfOrder: null,
}

export async function getActiveLoyaltyConfig(prisma: PrismaClient): Promise<ActiveLoyaltyRules> {
  const config = await prisma.loyaltyConfiguration.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  if (!config) {
    return DEFAULT_LOYALTY_RULES
  }

  return {
    earnRate: Math.max(0, config.pointsPerOrderCurrency ?? DEFAULT_LOYALTY_RULES.earnRate),
    minOrderAmountForPoints: Math.max(0, config.minOrderForPoints ?? DEFAULT_LOYALTY_RULES.minOrderAmountForPoints),
    redeemRate: Math.max(
      0.0001,
      Number(process.env.LOYALTY_REDEEM_RATE_PER_POINT ?? DEFAULT_LOYALTY_RULES.redeemRate)
    ),
    minRedeemPoints: Math.max(
      1,
      Number(process.env.LOYALTY_MIN_REDEEM_POINTS ?? DEFAULT_LOYALTY_RULES.minRedeemPoints)
    ),
    maxRedeemPercentOfOrder: process.env.LOYALTY_MAX_REDEEM_PERCENT
      ? Math.max(0, Math.min(100, Number(process.env.LOYALTY_MAX_REDEEM_PERCENT)))
      : DEFAULT_LOYALTY_RULES.maxRedeemPercentOfOrder,
  }
}

