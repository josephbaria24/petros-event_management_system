"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Navigation } from "@/components/navigation"
import { EventsDashboard } from "@/components/events-dashboard"
import { EventDetails } from "@/components/event-details"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
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
      <Navigation />
      {selectedEventId ? (
        <EventDetails eventId={selectedEventId} onBack={() => setSelectedEventId(null)} />
      ) : (
        <EventsDashboard onSelectEvent={setSelectedEventId} />
      )}
    </div>
  )
}
