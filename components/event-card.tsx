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
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <div className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-blue-500 mb-1.5">
              {event.type}
            </div>
            <h3 className="text-base font-bold text-foreground line-clamp-2">{event.name}</h3>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>

          {/* 🧾 Attendee Stats */}
          <div className="grid grid-cols-3 text-center text-sm border rounded-md divide-x">
            <div className="py-1.5">
              <Users className="h-3.5 w-3.5 mx-auto text-blue-500 mb-0.5" />
              <p className="font-semibold text-foreground text-sm">{event.attendees?.registered ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Registered</p>
            </div>
            <div className="py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-green-600 mb-0.5" />
              <p className="font-semibold text-foreground text-sm">{event.attendees?.attended ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Attended</p>
            </div>
            <div className="py-1.5">
              <CreditCard className="h-3.5 w-3.5 mx-auto text-amber-600 mb-0.5" />
              <p className="font-semibold text-foreground text-sm">{event.attendees?.paid ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Paid</p>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>₱{Number(event.price).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
