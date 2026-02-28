import Link from "next/link"

export default function AccessDeniedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
        padding: "1rem",
      }}
    >
      <section
        style={{
          maxWidth: "560px",
          width: "100%",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "1.25rem",
        }}
      >
        <h1 style={{ margin: 0, color: "#0f172a" }}>Access Denied</h1>
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          Your account is authenticated, but does not have permission to access this route.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-block",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              textDecoration: "none",
              color: "#0f172a",
              padding: "0.55rem 0.85rem",
            }}
          >
            Go Home
          </Link>
          <Link
            href="/auth/signin"
            style={{
              display: "inline-block",
              borderRadius: "8px",
              textDecoration: "none",
              background: "#1d4ed8",
              color: "white",
              padding: "0.55rem 0.85rem",
            }}
          >
            Switch Account
          </Link>
        </div>
      </section>
    </main>
  )
}

