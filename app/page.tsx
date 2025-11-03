"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Navigation } from "@/components/navigation"
import { EventsDashboard } from "@/components/events-dashboard"
import { EventDetails } from "@/components/event-details"
import { QRScanner } from "@/components/qr-scanner"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

type ViewMode = "dashboard" | "details" | "qr-scan"

export default function Home() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // 🚨 Redirect if not logged in
      if (!session) {
        router.replace("/login")
      } else {
        setLoading(false)
      }
    }

    checkUser()

    // ✅ Optional: Listen for logout or session expiration
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id)
    setCurrentView("details")
  }

  const handleBackToDashboard = () => {
    setSelectedEventId(null)
    setCurrentView("dashboard")
  }

  const handleOpenQRScanner = () => {
    if (selectedEventId) {
      setCurrentView("qr-scan")
    }
  }

  const handleBackToDetails = () => {
    setCurrentView("details")
  }

  // ⏳ Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        currentEventId={selectedEventId}
        onQRScanClick={handleOpenQRScanner}
      />
      
      {currentView === "dashboard" && (
        <EventsDashboard onSelectEvent={handleSelectEvent} />
      )}
      
      {currentView === "details" && selectedEventId && (
        <EventDetails 
          eventId={selectedEventId} 
          onBack={handleBackToDashboard} 
        />
      )}
      
      {currentView === "qr-scan" && selectedEventId && (
        <div className="relative">
          <div className="p-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToDetails}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event Details
            </Button>
          </div>
          <QRScanner eventId={selectedEventId} />
        </div>
      )}
    </div>
  )
}