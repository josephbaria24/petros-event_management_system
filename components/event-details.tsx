// ============================================
"use client"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventDetailsCard } from "@/components/event-details-card"
import { AttendeesList } from "@/components/attendees-list"
import type { Event } from "@/types/event"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"

// Extended Event type with stats
type EventWithStats = Omit<Event, "attendees"> & {
  attendees: {
    registered: number
    attended: number
    paid: number
  }
  teams_meeting_id?: string | null
  teams_join_url?: string | null
}

export function EventDetails({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const [event, setEvent] = useState<EventWithStats | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      // Fetch event details including topics
      const { data, error } = await supabase
        .from("events")
        .select("*, magic_link, schedules, topics")
        .eq("id", parseInt(eventId))
        .single()
  
      if (error) {
        console.error("Error fetching event:", error)
        return
      }

      if (!data) return

      // Fetch all attendees for this event with their attendance and payment data
      const { data: attendeesData, error: attendeesError } = await supabase
        .from("attendees")
        .select("attendance, payment_status")
        .eq("event_id", data.id)

      if (attendeesError) {
        console.error("Error fetching attendees:", attendeesError)
      }

      // Calculate stats
      const stats = {
        registered: 0,
        attended: 0,
        paid: 0,
      }

      attendeesData?.forEach((attendee) => {
        // Count all attendees as registered
        stats.registered += 1

        // Count attended (those with non-empty attendance object)
        if (
          attendee.attendance && 
          typeof attendee.attendance === 'object' && 
          Object.keys(attendee.attendance).length > 0
        ) {
          stats.attended += 1
        }

        // Count paid (those with "Fully Paid" status)
        if (attendee.payment_status === "Fully Paid") {
          stats.paid += 1
        }
      })

      // Map schedules and ensure topics are in coveredTopics
      const mappedSchedules = (data.schedules || []).map((s: any) => ({
        date: s.day || s.date,
        timeIn: s.timeIn,
        timeOut: s.timeOut,
        coveredTopics: data.topics || [] // Map topics from database to coveredTopics
      }))

      setEvent({
        id: data.id.toString(),
        name: data.name,
        description: data.description,
        type: data.type,
        price: Number(data.price),
        venue: data.venue,
        schedule: mappedSchedules,
        attendees: stats,
        createdAt: data.created_at,
        magic_link: data.magic_link,
        start_date: data.start_date,
        end_date: data.end_date,
        teams_meeting_id: data.teams_meeting_id,
        teams_join_url: data.teams_join_url,
      })
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
          <EventDetailsCard event={event} />
          <AttendeesList
            eventId={eventId}
            scheduleDates={event.schedule.map((s) => ({ date: s.date }))}
          />
        </div>
      </div>
    </main>
  )
}