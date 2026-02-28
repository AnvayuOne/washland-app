"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"
import InventoryConsole from "@/components/InventoryConsole"

export default function WashlandInventoryPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("Washland Admin")

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    const email = localStorage.getItem("userEmail")
    const name = localStorage.getItem("userName")

    if (role !== "SUPER_ADMIN" && role !== "washland") {
      router.push("/washland/login")
      return
    }

    setUserRole("SUPER_ADMIN")
    setUserEmail(email || "")
    if (name) setUserName(name)
    setReady(true)
  }, [router])

  function handleSignOut() {
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")
    localStorage.removeItem("userName")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  if (!ready) return null

  return (
    <DashboardLayout userRole={userRole} userName={userName} userEmail={userEmail} onSignOut={handleSignOut}>
      <InventoryConsole
        title="Network Inventory"
        subtitle="Monitor and manage operational stock across all franchises and stores."
      />
    </DashboardLayout>
  )
}
