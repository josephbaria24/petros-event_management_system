//app\api\queue-certificate-batch\route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { eventId, attendeeIds, templateType } = await req.json();

  if (!attendeeIds || attendeeIds.length === 0) {
    return NextResponse.json({ error: "No attendee IDs provided" }, { status: 400 });
  }

  // Fetch attendees
  const { data: attendees } = await supabase
  .from("attendees")
  .select("id, email, reference_id")
  .in("id", attendeeIds);

const safeAttendees = attendees ?? [];

  const rows = safeAttendees.map(a => ({
    attendee_id: a.id,
    email: a.email,
    type: "certificate",
    payload: {
      referenceId: a.reference_id,
      templateType
    }
  }));

  await supabase.from("email_queue").insert(rows);

  return NextResponse.json({
    queued: rows.length,
    message: "Certificates queued successfully."
  });
}
