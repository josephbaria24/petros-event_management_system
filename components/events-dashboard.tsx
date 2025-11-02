"use client"

import { useState, useEffect } from "react"
import { Plus, CalendarDays, Clock4, Users, CheckCircle2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EventModal } from "@/components/event-modal"
import { EventCard } from "@/components/event-card"
import type { Event } from "@/types/event"
import { supabase } from "@/lib/supabase-client"

// Import the utility function (if you create the separate file)
// import { fetchAllAttendees } from "@/lib/fetch-all-attendees"

// 👇 Extended version of Event that adds attendee stats
type EventWithStats = Omit<Event, "attendees"> & {
  attendees: {
    registered: number
    attended: number
    paid: number
  }
}

// ⚡ Helper function to fetch ALL attendees (no 1000 limit)
async function fetchAllAttendees(eventId?: number) {
  const PAGE_SIZE = 1000
  let allAttendees: any[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("attendees")
      .select("event_id, attendance, payment_status")
      .range(from, to)

    if (eventId !== undefined) {
      query = query.eq("event_id", eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching attendees:", error)
      break
    }

    if (data && data.length > 0) {
      allAttendees = [...allAttendees, ...data]
      
      if (data.length < PAGE_SIZE) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  return allAttendees
}

export function EventsDashboard({ onSelectEvent }: { onSelectEvent: (id: string) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      
      // 🗓️ Get all events
      const { data: eventsData, error } = await supabase.from("events").select("*")
      if (error) {
        console.error("Error fetching events:", error)
        setIsLoading(false)
        return
      }

      if (!eventsData) {
        setIsLoading(false)
        return
      }

      // 👥 Get ALL attendees (no 1000 row limit) using pagination
      const attendeesData = await fetchAllAttendees()

      console.log(`✅ Fetched ${attendeesData.length} attendees total`)

      // 🧮 Build event stats
      const attendeeStatsMap = new Map<
        number,
        { registered: number; attended: number; paid: number }
      >()

      attendeesData.forEach((attendee) => {
        const eventId = Number(attendee.event_id)
        if (!eventId || isNaN(eventId)) return
      
        const stats = attendeeStatsMap.get(eventId) ?? {
          registered: 0,
          attended: 0,
          paid: 0,
        }
      
        // 📊 Registered: Count ALL attendees
        stats.registered += 1
      
        // ✅ Attended: Count attendees with non-empty attendance object
        if (
          attendee.attendance && 
          typeof attendee.attendance === 'object' && 
          Object.keys(attendee.attendance).length > 0
        ) {
          stats.attended += 1
        }
      
        // 💳 Paid: Count attendees with "Fully Paid" status
        if (attendee.payment_status === "Fully Paid") {
          stats.paid += 1
        }
      
        attendeeStatsMap.set(eventId, stats)
      })

      // 🧾 Format events
      const formattedEvents: EventWithStats[] = eventsData.map((event) => {
        const stats = attendeeStatsMap.get(event.id) ?? {
          registered: 0,
          attended: 0,
          paid: 0,
        }

        return {
          id: event.id.toString(),
          name: event.name,
          type: event.type,
          price: Number(event.price),
          venue: event.venue,
          schedule:
            event.schedules?.map((s: any) => ({
              day: s.day,
              inTime: s.timeIn,
              outTime: s.timeOut,
              coveredTopics: event.topics ?? [],
            })) ?? [],
          attendees: stats,
          createdAt: event.created_at,
          start_date: event.start_date,
          end_date: event.end_date,
        }
      })

      // ✅ Helper to safely parse optional date strings
      const parseDate = (value?: string) => (value ? new Date(value) : new Date(0))

      // 🧠 Sort events by date (upcoming first)
      const now = new Date()
      const upcoming = formattedEvents.filter((e) => parseDate(e.end_date) >= now)
      const past = formattedEvents.filter((e) => parseDate(e.end_date) < now)

      upcoming.sort((a, b) => parseDate(a.start_date).getTime() - parseDate(b.start_date).getTime())
      past.sort((a, b) => parseDate(b.start_date).getTime() - parseDate(a.start_date).getTime())

      setEvents([...upcoming, ...past])
      setIsLoading(false)
    }

    fetchEvents()
  }, [])

  const handleCreateEvent = (newEvent: Omit<Event, "id" | "attendees" | "createdAt">) => {
    const event: EventWithStats = {
      ...newEvent,
      id: Date.now().toString(),
      attendees: { registered: 0, attended: 0, paid: 0 },
      createdAt: new Date().toISOString(),
    }
    setEvents([...events, event])
    setIsModalOpen(false)
  }

  const now = new Date()
  const parseDate = (value?: string) => (value ? new Date(value) : new Date(0))
  const upcomingEvents = events.filter((e) => parseDate(e.end_date) >= now)
  const pastEvents = events.filter((e) => parseDate(e.end_date) < now)

  // 📊 Calculate total stats across all events
  const totalStats = events.reduce(
    (acc, event) => ({
      registered: acc.registered + event.attendees.registered,
      attended: acc.attended + event.attendees.attended,
      paid: acc.paid + event.attendees.paid,
    }),
    { registered: 0, attended: 0, paid: 0 }
  )

  // Calculate attendance rate (avoid division by zero)
  const attendanceRate = totalStats.registered > 0 
    ? Math.round((totalStats.attended / totalStats.registered) * 100) 
    : 0

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading events and attendees...</p>
          </div>
        </div>
      </main>
    )
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

        {/* 📊 Stats Overview Cards */}
        {events.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Events */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{events.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {upcomingEvents.length} upcoming • {pastEvents.length} past
                    </p>
                  </div>
                  <CalendarDays className="h-10 w-10 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Registered Attendees */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Registered</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{totalStats.registered}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total attendees</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Attended */}
            <Card className="border-l-4 border-l-green-600">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Attended</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{totalStats.attended}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {attendanceRate}% attendance rate
                    </p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            {/* Fully Paid */}
            <Card className="border-l-4 border-l-amber-600">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fully Paid</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{totalStats.paid}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalStats.registered > 0 
                        ? Math.round((totalStats.paid / totalStats.registered) * 100)
                        : 0}% payment rate
                    </p>
                  </div>
                  <CreditCard className="h-10 w-10 text-amber-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-8">
              <CalendarDays className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-foreground">Upcoming Events</h2>
              <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
                {upcomingEvents.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} onSelect={() => onSelectEvent(event.id)} />
              ))}
            </div>
          </>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-10">
              <Clock4 className="h-6 w-6 text-muted-foreground" />
              <h2 className="text-2xl font-semibold text-foreground">Past Events</h2>
              <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-400">
                {pastEvents.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} onSelect={() => onSelectEvent(event.id)} />
              ))}
            </div>
          </>
        )}

        {/* No Events Fallback */}
        {events.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-2">No events yet</p>
              <p className="text-muted-foreground mb-4">Create your first event to get started</p>
              <Button onClick={() => setIsModalOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first event
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateEvent}
      />
    </main>
  )
}