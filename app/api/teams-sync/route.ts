import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph"; // Your existing Graph auth helper
import { supabaseServer } from "@/lib/supabase-server"; // Use server client

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const meetingId = searchParams.get("meetingId");

  if (!eventId || !meetingId) {
    return NextResponse.json({ error: "Missing eventId or meetingId" }, { status: 400 });
  }

  try {
    const client = getGraphClient();

    // 1. Get attendance reports
    const reports = await client
      .api(`/communications/onlineMeetings/${meetingId}/attendanceReports`)
      .get();

    const reportId = reports.value?.[0]?.id;
    if (!reportId)
      return NextResponse.json({ error: "No attendance report found" }, { status: 404 });

    // 2. Get attendance records
    const records = await client
      .api(`/communications/onlineMeetings/${meetingId}/attendanceReports/${reportId}/attendanceRecords`)
      .get();

    const attendance = records.value || [];

    // 3. Match them in Supabase by email
    let updatedCount = 0;
    for (const person of attendance) {
      if (!person.emailAddress) continue;

      const { error } = await supabaseServer
        .from("attendees")
        .update({
          attendance: {
            joined: person.joinDateTime,
            left: person.leaveDateTime,
            duration: person.totalAttendanceInSeconds
          }
        })
        .eq("event_id", eventId)
        .ilike("email", person.emailAddress);

      if (!error) updatedCount++;
    }

    return NextResponse.json({ success: true, updatedCount });

  } catch (error: any) {
    console.error("Teams Sync Error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || JSON.stringify(error) },
      { status: 500 }
    );
  }
  
}
