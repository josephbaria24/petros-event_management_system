"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QRScanner } from "@/components/qr-scanner"

export default function QRScanPage() {
  const params = useParams()
  const eventId = params.id as string

  return (
    <div className="relative">
      <div className="p-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href={`/events/${eventId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Details
          </Link>
        </Button>
      </div>
      <QRScanner eventId={eventId} />
    </div>
  )
}
