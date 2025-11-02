"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EventModal } from "@/components/event-modal"
import { EventCard } from "@/components/event-card"
import type { Event } from "@/types/event"
import { useEffect } from "react"
import { supabase } from "@/lib/supabase-client"



export function EventsDashboard({ onSelectEvent }: { onSelectEvent: (id: string) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([]) // ✅ this was missing

  useEffect(() => {
    const fetchEvents = async () => {
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*")

      if (!error && eventsData) {
        const { data: attendeesData } = await supabase
          .from("attendees")
          .select("event_id", { count: "exact", head: true })

        const attendeeCountMap = new Map<number, number>()
        attendeesData?.forEach((attendee) => {
          const count = attendeeCountMap.get(attendee.event_id) ?? 0
          attendeeCountMap.set(attendee.event_id, count + 1)
        })

        const formattedEvents: Event[] = eventsData.map((event) => ({
          id: event.id.toString(),
          name: event.name,
          type: event.type,
          price: Number(event.price),
          venue: event.venue,
          schedule: event.schedules?.map((s: any) => ({
            day: s.day,
            inTime: s.timeIn,
            outTime: s.timeOut,
            coveredTopics: event.topics ?? [],
          })) ?? [],
          attendees: attendeeCountMap.get(event.id) ?? 0,
          createdAt: event.created_at,
        }))

        setEvents(formattedEvents)
      }
    }

    fetchEvents()
  }, [])
  

  const handleCreateEvent = (newEvent: Omit<Event, "id" | "attendees" | "createdAt">) => {
    const event: Event = {
      ...newEvent,
      id: Date.now().toString(),
      attendees: 0,
      createdAt: new Date().toISOString(),
    }
    setEvents([...events, event])
    setIsModalOpen(false)
  }

  return (
    <main className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground">Manage your events and attendees</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-accent"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </div>

        {/* Events Grid */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onSelect={() => onSelectEvent(event.id)} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No events yet</p>
              <Button onClick={() => setIsModalOpen(true)} variant="outline">
                Create your first event
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event Modal */}
      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateEvent} />
    </main>
  )
}
