export const ORDER_STATUS_VALUES = [
  "PAYMENT_PENDING",
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PAYMENT_PENDING: "Payment Pending",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Process",
  READY_FOR_PICKUP: "Ready for Pickup",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export const ORDER_STATUS_SEQUENCE: OrderStatusValue[] = [
  "PAYMENT_PENDING",
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]

const ORDER_STATUS_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PAYMENT_PENDING: ["PENDING", "CONFIRMED", "CANCELLED"],
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "READY_FOR_PICKUP", "CANCELLED"],
  IN_PROGRESS: ["READY_FOR_PICKUP", "DELIVERED", "COMPLETED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "COMPLETED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
}

export function isOrderStatus(value: string): value is OrderStatusValue {
  return ORDER_STATUS_VALUES.includes(value as OrderStatusValue)
}

export function statusLabel(status: OrderStatusValue | string): string {
  if (isOrderStatus(status)) {
    return ORDER_STATUS_LABELS[status]
  }
  return status
}

export function statusSortKey(status: OrderStatusValue | string): number {
  if (!isOrderStatus(status)) return Number.MAX_SAFE_INTEGER
  return ORDER_STATUS_SEQUENCE.indexOf(status)
}

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  if (from === to) return true
  return ORDER_STATUS_TRANSITIONS[from].includes(to)
}

export function getAllowedTransitions(
  from: OrderStatusValue,
  options?: { allowOverride?: boolean }
): OrderStatusValue[] {
  if (options?.allowOverride) {
    return ORDER_STATUS_VALUES.filter((status) => status !== from)
  }
  return ORDER_STATUS_TRANSITIONS[from]
}

export function getStatusTimeline(currentStatus: OrderStatusValue | string) {
  const currentIndex = statusSortKey(currentStatus)
  return ORDER_STATUS_SEQUENCE.filter((status) => status !== "CANCELLED").map((status, index) => ({
    status,
    label: statusLabel(status),
    completed: index < currentIndex,
    current: index === currentIndex,
  }))
}

