"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { EventsDashboard } from "@/components/events-dashboard"
import { EventDetails } from "@/components/event-details"

export default function Home() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

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
