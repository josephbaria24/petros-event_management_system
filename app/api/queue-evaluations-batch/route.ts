//app\api\queue-evaluations-batch\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { eventId, attendeeIds } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return NextResponse.json({ error: "No attendee IDs provided" }, { status: 400 });
    }

    // Fetch attendee details
    const { data: attendees, error } = await supabase
      .from("attendees")
      .select("id, email, reference_id")
      .in("id", attendeeIds);

    if (error) throw error;

    const safeAttendees = attendees ?? [];

    // Insert into queue table
    const rows = safeAttendees.map((a) => ({
      attendee_id: a.id,
      email: a.email,
      type: "evaluation",
      payload: {
        referenceId: a.reference_id,
        eventId,
      },
    }));

    await supabase.from("email_queue").insert(rows);

    return NextResponse.json({
      queued: rows.length,
      message: "Evaluation emails queued successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
