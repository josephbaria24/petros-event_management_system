// app/api/send-evaluations/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { EmailQueueManager, canSendEmailsToday } from "@/lib/email-queue";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: "smtp.sendlayer.net",
  port: 587,
  secure: false,
  auth: {
    user: "2433A8191660728E311639BB642398DC",
    pass: process.env.SENDLAYER_SMTP_PASSWORD!,
  },
});

export async function POST(req: Request) {
  try {
    const { eventId, attendeeIds } = await req.json();

    if (!eventId || !attendeeIds?.length) {
      return NextResponse.json(
        { error: "Missing eventId or attendeeIds" },
        { status: 400 }
      );
    }

    // Fetch attendees and event
    const { data: attendees, error: attendeeError } = await supabase
      .from("attendees")
      .select("id, personal_name, last_name, email, reference_id")
      .in("id", attendeeIds);

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("name")
      .eq("id", eventId)
      .single();

    if (attendeeError || eventError || !attendees || !event) {
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: 500 }
      );
    }

    // Check rate limit
    const rateLimitCheck = await canSendEmailsToday("evaluation", attendees.length);

    // Prepare queue items
    const queueItems = attendees.map(a => ({
      attendee_id: a.id,
      email: a.email,
      type: "evaluation" as const,
      payload: {
        eventId,
        eventName: event.name,
        referenceId: a.reference_id,
        name: `${a.personal_name} ${a.last_name}`,
      },
    }));

    // Add to queue and get scheduling info
    const scheduleResult = await EmailQueueManager.addToQueue(queueItems);

    // Send immediate emails
    const successful: any[] = [];
    const failed: any[] = [];

    const immediateAttendees = attendees.slice(0, scheduleResult.immediate);

    for (const attendee of immediateAttendees) {
      try {
        const evaluationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/evaluation/${attendee.reference_id}`;

        await transporter.sendMail({
          from: '"Petrosphere" <info@petros-global.com>',
          to: attendee.email,
          subject: `Evaluation Request - ${event.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${attendee.personal_name} ${attendee.last_name},</h2>
              <p>Thank you for attending <strong>${event.name}</strong>!</p>
              <p>Please take a moment to complete our evaluation form:</p>
              <a href="${evaluationLink}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #0e026aff; 
                        color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Complete Evaluation
              </a>
              <p>Best regards,<br/>Petrosphere Team</p>
            </div>
          `,
        });

        // Mark as sent in attendees table
        await supabase
          .from("attendees")
          .update({ hassentevaluation: true })
          .eq("id", attendee.id);

        // Add to email_queue for tracking
        await supabase.from("email_queue").insert({
          attendee_id: attendee.id,
          email: attendee.email,
          type: "evaluation",
          payload: { eventId, referenceId: attendee.reference_id },
          status: "sent",
          last_attempt_at: new Date().toISOString(),
        });

        successful.push({
          id: attendee.id,
          name: `${attendee.personal_name} ${attendee.last_name}`,
          email: attendee.email,
        });
      } catch (error: any) {
        failed.push({
          id: attendee.id,
          name: `${attendee.personal_name} ${attendee.last_name}`,
          email: attendee.email,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      result: { successful, failed },
      queue: {
        immediate: scheduleResult.immediate,
        queued: scheduleResult.queued,
        scheduledDates: scheduleResult.scheduledDates,
      },
      rateLimitInfo: {
        message: rateLimitCheck.message,
        used: rateLimitCheck.available,
      },
    });
  } catch (error: any) {
    console.error("Send evaluations error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}