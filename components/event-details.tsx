//components\event-details.tsx
"use client"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventDetailsCard } from "@/components/event-details-card"
import { AttendeesList } from "@/components/attendees-list"
import type { Event } from "@/types/event"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"


export function EventDetails({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  // Mock event data - in a real app, this would be fetched
  

  const [event, setEvent] = useState<Event | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, magic_link, schedules")
        .eq("id", parseInt(eventId))
        .single()
  
      if (data) {
        const attendeeCount = await supabase
          .from("attendees")
          .select("*", { count: "exact", head: true })
          .eq("event_id", data.id)
  
        setEvent({
          id: data.id.toString(),
          name: data.name,
          type: data.type,
          price: Number(data.price),
          venue: data.venue,
          schedule: data.schedules ?? [],
          attendees: attendeeCount.count ?? 0,
          createdAt: data.created_at,
          magic_link: data.magic_link,
        })
      }
    }
  
    fetchEvent()
  }, [eventId])


  if (!event) {
    return (
      <main className="p-6">
        <p className="text-muted-foreground">Loading event...</p>
      </main>
    )
  }

  


  return (
    <main className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-lg bg-transparent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
            <p className="text-muted-foreground">
              {event.type} • {event.venue}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {event ? (
              <>
                <EventDetailsCard event={event} />
                <AttendeesList
                  eventId={eventId}
                  scheduleDates={event.schedule.map((s) => ({ date: s.date }))}
                />

              </>
            ) : (
              <p>Loading event...</p>
            )}

        </div>
      </div>
    </main>
  )
}
