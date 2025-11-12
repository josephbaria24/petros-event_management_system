"use client"

import { useState } from "react"
import type React from "react"
import { Calendar, Settings, LogOut, Bell, Search, QrCode } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase-client"

interface NavigationProps {
  currentEventId?: string | null
  onQRScanClick?: () => void
}

export function Navigation({ currentEventId, onQRScanClick }: NavigationProps) {
  const [active, setActive] = useState<"events" | "qr" | "settings">("events")

  const handleComingSoon = () => {
    toast.info("🚧 This feature will be available soon!", { duration: 3000 })
  }

  const handleQRScanner = () => {
    if (!currentEventId) {
      toast.error("Please select an event first to use QR Scanner")
      return
    }

    setActive("qr")
    if (onQRScanClick) {
      onQRScanClick()
    } else {
      toast.success("📷 QR Scanner opened!")
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success("👋 You've been logged out successfully.")
      window.location.href = "/login"
    } catch (err: any) {
      console.error("Logout error:", err)
      toast.error("Failed to log out. Please try again.")
    }
  }

  return (
    <>
      {/* Top navigation bar */}
      <nav className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 relative">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent">
              <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
            </div>

            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-foreground text-lg">Petrosphere</span>
              <span className="text-sm text-muted-foreground">Event Management System</span>
            </div>
          </div>

          {/* Center Nav */}
          <div className="absolute left-1/2 transform -translate-x-1/2 hidden sm:flex gap-1">
           
            <NavIcon
              icon={QrCode}
              label="QR Scanner"
              onClick={handleQRScanner}
              disabled={!currentEventId}
              active={active === "qr"}
            />
            <NavIcon
              icon={Settings}
              label="Settings"
              onClick={() => {
                handleComingSoon()
                setActive("settings")
              }}
              active={active === "settings"}
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search (md+) */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Bell */}
            <button
              className="relative p-2 text-muted-foreground hover:text-foreground"
              onClick={handleComingSoon}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"></span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-destructive"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* 📱 Floating QR Scanner button */}
      <button
        onClick={handleQRScanner}
        disabled={!currentEventId}
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center rounded-full p-4 shadow-lg transition-all sm:hidden ${
          currentEventId
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
        title="Open QR Scanner"
      >
        <QrCode className="h-6 w-6" />
      </button>
    </>
  )
}

function NavIcon({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : disabled
          ? "text-muted-foreground/50 cursor-not-allowed"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
