"use client"

import { Calendar, MapPin, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Event } from "@/types/event"

export function EventCard({ event, onSelect }: { event: Event; onSelect: () => void }) {
  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary" onClick={onSelect}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
              {event.type}
            </div>
            <h3 className="text-lg font-bold text-foreground line-clamp-2">{event.name}</h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{event.attendees} attendees</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>${event.price}</span>
            </div>
          </div>

          <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "100%" }}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
