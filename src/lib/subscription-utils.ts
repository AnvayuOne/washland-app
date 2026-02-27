import { BillingCycle, SubscriptionPlanType } from "@prisma/client"

export function isPlanType(value: string): value is SubscriptionPlanType {
  return Object.values(SubscriptionPlanType).includes(value as SubscriptionPlanType)
}

export function isBillingCycle(value: string): value is BillingCycle {
  return Object.values(BillingCycle).includes(value as BillingCycle)
}

export function isJsonSerializable(value: unknown) {
  try {
    JSON.stringify(value)
    return true
  } catch {
    return false
  }
}

export function toPlanResponse(plan: any) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    planType: plan.planType,
    billingCycle: plan.billingCycle,
    price: Number(plan.price),
    currency: plan.currency,
    benefitsJson: plan.benefitsJson,
    isActive: plan.isActive,
    storeId: plan.storeId,
    store: plan.store
      ? {
          id: plan.store.id,
          name: plan.store.name,
          city: plan.store.city,
          state: plan.store.state,
        }
      : null,
    subscriptionsCount: plan._count?.subscriptions ?? 0,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }
}

export function toSubscriptionResponse(subscription: any) {
  return {
    id: subscription.id,
    userId: subscription.userId,
    planId: subscription.planId,
    storeId: subscription.storeId,
    status: subscription.status,
    startAt: subscription.startAt,
    endAt: subscription.endAt,
    renewAt: subscription.renewAt,
    autoRenew: subscription.autoRenew,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    plan: subscription.plan
      ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description,
          planType: subscription.plan.planType,
          billingCycle: subscription.plan.billingCycle,
          price: Number(subscription.plan.price),
          currency: subscription.plan.currency,
          benefitsJson: subscription.plan.benefitsJson,
          storeId: subscription.plan.storeId,
        }
      : null,
    store: subscription.store
      ? {
          id: subscription.store.id,
          name: subscription.store.name,
          city: subscription.store.city,
          state: subscription.store.state,
        }
      : null,
  }
}
