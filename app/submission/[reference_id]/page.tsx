//app\submission\[reference_id]\page.tsx
export const dynamic = "force-dynamic"

import { supabaseServer } from "@/lib/supabase-server"
import QRCode from "qrcode"
import Image from "next/image"
import TicketDownloadButton from "@/components/ticket-download-button"

interface Attendee {
  personal_name: string
  last_name: string
  email: string
  reference_id: string
  event_id: number
}

interface Event {
  name: string
  venue: string
}

export default async function SubmissionPage(props: {
  params: Promise<{ reference_id: string }>
}) {
  const { reference_id } = await props.params
  
  // Decode the URL parameter to handle special characters
  const ref = decodeURIComponent(reference_id?.trim?.() ?? "")

  if (!ref) {
    return (
      <main className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(to bottom right, #1e3a8a, #047857, #1e3a8a)' }}>
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <p className="text-lg font-medium" style={{ color: '#f87171' }}>Invalid submission link.</p>
        </div>
      </main>
    )
  }

  // Use exact match instead of ilike for precise reference_id matching
  const { data: attendee, error: attendeeError } = await supabaseServer
    .from("attendees")
    .select("personal_name, last_name, email, reference_id, event_id")
    .eq("reference_id", ref)
    .single<Attendee>()

  if (attendeeError || !attendee) {
    console.log("❌ Attendee error:", attendeeError)
    console.log("🔍 Looking for reference_id:", ref)
    return (
      <main className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(to bottom right, #1e3a8a, #047857, #1e3a8a)' }}>
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <p className="text-lg font-medium" style={{ color: '#f87171' }}>Attendee not found.</p>
        </div>
      </main>
    )
  }

  const { data: event, error: eventError } = await supabaseServer
    .from("events")
    .select("name, venue")
    .eq("id", attendee.event_id)
    .single<Event>()

  if (eventError || !event) {
    console.log("❌ Event error:", eventError)
    return (
      <main className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(to bottom right, #1e3a8a, #047857, #1e3a8a)' }}>
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <p className="text-lg font-medium" style={{ color: '#f87171' }}>Event not found.</p>
        </div>
      </main>
    )
  }

  const qrCode = await QRCode.toDataURL(attendee.reference_id, {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff"
    }
  })

  return (
    <main className="flex justify-center items-center min-h-screen p-4" style={{ background: 'linear-gradient(to bottom right, #1e3a8a, #047857, #1e3a8a)' }}>
      <div className="w-full max-w-md">
        {/* Ticket Card */}
        <div id="ticket-card" className="rounded-3xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
          {/* Header Section */}
          <div
            className="relative px-6 pt-6 pb-5 text-white"
            style={{
              background: "linear-gradient(90deg, #16a34a 0%, #2563eb 100%)",
            }}
          >
            {/* CONFIRMED badge */}
            <span
              className="absolute top-4 right-4 text-xs font-semibold tracking-wide px-3 py-1 rounded-full"
              style={{
                backgroundColor: "#ffffff33",
                color: "#ffffff",
                letterSpacing: "0.05em",
              }}
            >
              CONFIRMED
            </span>

            {/* Ticket Label */}
            <p
              className="text-sm font-medium mb-2"
              style={{
                color: "#e5e7eb",
              }}
            >
              EVENT TICKET
            </p>

            {/* Event Title */}
            <h1
              className="text-2xl font-bold leading-tight mb-2"
              style={{
                color: "#ffffff",
              }}
            >
              {event.name}
            </h1>

            {/* Venue Row */}
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#d1fae5"
                strokeWidth="2"
                className="flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p
                className="text-sm font-medium"
                style={{
                  color: "#d1fae5",
                }}
              >
                {event.venue}
              </p>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-8 flex justify-center" style={{ background: 'linear-gradient(to bottom, #f9fafb, #ffffff)' }}>
            <div className="p-4 rounded-2xl shadow-lg" style={{ backgroundColor: '#ffffff' }}>
              <Image
                src={qrCode}
                alt="QR Code"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Attendee Details */}
          <div className="p-6" style={{ borderTop: '1px solid #f3f4f6' }}>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide mb-1 font-medium" style={{ color: '#6b7280' }}>Attendee Name</p>
                <p className="text-lg font-semibold" style={{ color: '#111827' }}>
                  {attendee.personal_name} {attendee.last_name}
                </p>
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-wide mb-1 font-medium" style={{ color: '#6b7280' }}>Email Address</p>
                <p className="text-sm" style={{ color: '#374151' }}>{attendee.email}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide mb-1 font-medium" style={{ color: '#6b7280' }}>Reference ID</p>
                <p className="text-sm font-mono px-3 py-2 rounded-lg inline-block" style={{ color: '#4b5563', backgroundColor: '#f3f4f6' }}>
                  {attendee.reference_id}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4" style={{ backgroundColor: '#f9fafb', borderTop: '1px solid #f3f4f6' }}>
            <p className="text-xs text-center" style={{ color: '#6b7280' }}>
              Please present this QR code at the event entrance
            </p>
          </div>
        </div>

        {/* Download Button */}
        <TicketDownloadButton referenceId={attendee.reference_id} />

        <p className="text-center text-sm mt-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Save this ticket for event entry
        </p>
      </div>
    </main>
  )
}