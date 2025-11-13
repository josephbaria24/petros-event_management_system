import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const meetingId = request.nextUrl.searchParams.get("meetingId");
    const client = getGraphClient();

    // 1. List all attendance reports for this meeting
    const attendance = await client
      .api(`/communications/onlineMeetings/${meetingId}/attendanceReports`)
      .get();

    const reportId = attendance.value[0]?.id;

    if (!reportId) {
      return NextResponse.json({ error: "No attendance report found" }, { status: 404 });
    }

    // 2. Fetch the detailed records
    const records = await client
      .api(`/communications/onlineMeetings/${meetingId}/attendanceReports/${reportId}/attendanceRecords`)
      .get();

    return NextResponse.json(records.value);

  } catch (err) {
    console.error("Error fetching attendance:", err);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
