// app/api/email-queue/stats/route.ts
import { NextResponse } from "next/server";
import { EmailQueueManager } from "@/lib/email-queue";

export async function GET() {
  try {
    const stats = await EmailQueueManager.getQueueStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Error fetching queue stats:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}