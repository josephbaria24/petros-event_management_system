//components\event-card.tsx
"use client"

import { Calendar, MapPin, Users, CheckCircle2, CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Event } from "@/types/event"


type EventWithStats = Omit<Event, "attendees"> & {
  attendees: {
    registered: number
    attended: number
    paid: number
  }
}

export function EventCard({ event, onSelect }: { event: EventWithStats; onSelect: () => void }) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
      onClick={onSelect}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
              {event.type}
            </div>
            <h3 className="text-lg font-bold text-foreground line-clamp-2">{event.name}</h3>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4" />
            <span>{event.venue}</span>
          </div>

          {/* 🧾 Attendee Stats */}
          <div className="grid grid-cols-3 text-center text-sm mt-4 border rounded-md divide-x">
            <div className="py-2">
              <Users className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <p className="font-semibold text-foreground">{event.attendees?.registered ?? 0}</p>
              <p className="text-xs text-muted-foreground">Registered</p>
            </div>
            <div className="py-2">
              <CheckCircle2 className="h-4 w-4 mx-auto text-green-600 mb-1" />
              <p className="font-semibold text-foreground">{event.attendees?.attended ?? 0}</p>
              <p className="text-xs text-muted-foreground">Attended</p>
            </div>
            <div className="py-2">
              <CreditCard className="h-4 w-4 mx-auto text-amber-600 mb-1" />
              <p className="font-semibold text-foreground">{event.attendees?.paid ?? 0}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-3">
            <Calendar className="h-4 w-4" />
            <span>₱{Number(event.price).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
