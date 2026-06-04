"use client"

import { useParams } from "next/navigation"
import { EventDetails } from "@/components/event-details"

export default function EventDetailsPage() {
  const params = useParams()
  const eventId = params.id as string

  return <EventDetails eventId={eventId} />
}
