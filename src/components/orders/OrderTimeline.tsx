"use client"

import { getStatusTimeline, statusLabel, type OrderStatusValue } from "@/lib/orderStatus"

interface OrderTimelineProps {
  status: OrderStatusValue
}

export default function OrderTimeline({ status }: OrderTimelineProps) {
  if (status === "CANCELLED") {
    return (
      <div style={{ padding: "1rem", border: "1px solid #fee2e2", borderRadius: "10px", background: "#fef2f2" }}>
        <div style={{ color: "#b91c1c", fontWeight: 600 }}>Cancelled</div>
        <div style={{ color: "#7f1d1d", fontSize: "0.9rem" }}>This order was cancelled.</div>
      </div>
    )
  }

  const steps = getStatusTimeline(status)

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {steps.map((step) => (
        <div key={step.status} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "9999px",
              backgroundColor: step.current ? "#2563eb" : step.completed ? "#10b981" : "#cbd5e1",
            }}
          />
          <span
            style={{
              fontSize: "0.9rem",
              color: step.current ? "#1e3a8a" : step.completed ? "#065f46" : "#475569",
              fontWeight: step.current ? 700 : 500,
            }}
          >
            {statusLabel(step.status)}
          </span>
        </div>
      ))}
    </div>
  )
}

