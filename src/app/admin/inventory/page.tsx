"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import StoreAdminLayout from "@/components/StoreAdminLayout"
import InventoryConsole from "@/components/InventoryConsole"
import { useToast } from "@/components/ToastProvider"

export default function AdminInventoryPage() {
  const router = useRouter()
  const toast = useToast()
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [storeId, setStoreId] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    const selectedStoreId = localStorage.getItem("storeId")
    const email = localStorage.getItem("userEmail")

    if (role !== "STORE_ADMIN" && role !== "store-admin") {
      router.push("/admin/login")
      return
    }

    if (!selectedStoreId) {
      toast.error("Error", "No store selected. Please login again.")
      router.push("/admin/login")
      return
    }

    setUserRole(role)
    setUserEmail(email || "")
    setStoreId(selectedStoreId)
    setReady(true)

    const handleAuthUpdate = (e: CustomEvent) => {
      if (e.detail?.name) setUserName(e.detail.name)
      if (e.detail?.storeName) setStoreName(e.detail.storeName)
    }

    window.addEventListener("auth:session", handleAuthUpdate as EventListener)
    return () => {
      window.removeEventListener("auth:session", handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  function handleSignOut() {
    localStorage.removeItem("userRole")
    localStorage.removeItem("storeId")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  return (
    <StoreAdminLayout
      userRole={userRole}
      userName={userName || "Store Admin"}
      userEmail={userEmail}
      storeName={storeName}
      onSignOut={handleSignOut}
    >
      {ready ? (
        <InventoryConsole
          title="Operational Inventory"
          subtitle="Manage detergents, chemicals, packaging, machines, and spare stock for this store."
          fixedStoreId={storeId}
          showStoreSelector={false}
        />
      ) : (
        <div style={{ color: "#64748b" }}>Loading inventory...</div>
      )}
    </StoreAdminLayout>
  )
}
