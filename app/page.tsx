"use client"

import { AuthenticatedShell } from "@/components/authenticated-shell"
import { EventsDashboard } from "@/components/events-dashboard"

export default function Home() {
  return (
    <AuthenticatedShell>
      <EventsDashboard />
    </AuthenticatedShell>
  )
}
