// app/api/send-evaluations/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

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

    // Fetch attendees
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

    // ✅ Unlimited email mode: Send all immediately
    const successful: any[] = [];
    const failed: any[] = [];

    for (const attendee of attendees) {
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

        // Mark as sent
        await supabase
          .from("attendees")
          .update({ hassentevaluation: true })
          .eq("id", attendee.id);

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
      queue: null, // no more queue
      rateLimitInfo: null, // no more rate limits
    });
  } catch (error: any) {
    console.error("Send evaluations error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
