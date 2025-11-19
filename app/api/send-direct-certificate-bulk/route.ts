// app/api/send-direct-certificate-bulk/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { EmailQueueManager, canSendEmailsToday } from "@/lib/email-queue";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "no-reply@petros-global.com",
    pass: "@Notsotrickypassword123",
  },
});

// Import PDF generation function from your existing route
// (Copy the entire generateCertificatePDF, hexToRgb, capitalizeAllLetters functions here)

export async function POST(req: Request) {
  try {
    const { attendeeIds, templateType = "participation" } = await req.json();

    if (!attendeeIds?.length) {
      return NextResponse.json(
        { error: "Missing attendee IDs" },
        { status: 400 }
      );
    }

    // Fetch attendees
    const { data: attendees, error: attendeeError } = await supabase
      .from("attendees")
      .select("*, events(*)")
      .in("id", attendeeIds);

    if (attendeeError || !attendees) {
      return NextResponse.json(
        { error: "Failed to fetch attendees" },
        { status: 500 }
      );
    }

    // Check rate limit
    const rateLimitCheck = await canSendEmailsToday("certificate", attendees.length);

    // Prepare queue items
    const queueItems = attendees.map(a => ({
      attendee_id: a.id,
      email: a.email,
      type: "certificate" as const,
      payload: {
        referenceId: a.reference_id,
        templateType,
        eventId: a.event_id,
      },
    }));

    // Add to queue and get scheduling info
    const scheduleResult = await EmailQueueManager.addToQueue(queueItems);

    // Send immediate certificates
    const successful: any[] = [];
    const failed: any[] = [];

    const immediateAttendees = attendees.slice(0, scheduleResult.immediate);

    for (const attendee of immediateAttendees) {
      try {
        // Generate PDF (use existing logic)
        const event = attendee.events;
        const firstName = attendee.personal_name.toUpperCase();
        const lastName = attendee.last_name.toUpperCase();
        const fullName = `${firstName} ${lastName}`;

        // Generate certificate PDF here (copy from existing route)
        // const certificatePDF = await generateCertificatePDF(...)

        // Send email
        await transporter.sendMail({
          from: '"Petros" <no-reply@petros-global.com>',
          to: attendee.email,
          subject: `Certificate - ${event.name}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Congratulations, ${firstName} ${lastName}!</h2>
              <p>Please find your certificate attached.</p>
            </div>
          `,
          attachments: [
            {
              filename: `Certificate_${fullName.replace(/\s+/g, "_")}.pdf`,
              content: Buffer.from([]), // certificatePDF,
              contentType: "application/pdf",
            },
          ],
        });

        // Update certificate_sent
        const currentCerts = attendee.certificate_sent || [];
        await supabase
          .from("attendees")
          .update({
            certificate_sent: [
              ...currentCerts,
              {
                type: templateType,
                sent_at: new Date().toISOString(),
                sent_to: attendee.email,
              },
            ],
          })
          .eq("id", attendee.id);

        // Track in queue
        await supabase.from("email_queue").insert({
          attendee_id: attendee.id,
          email: attendee.email,
          type: "certificate",
          payload: { templateType, referenceId: attendee.reference_id },
          status: "sent",
          last_attempt_at: new Date().toISOString(),
        });

        successful.push({
          id: attendee.id,
          name: fullName,
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
      },
    });
  } catch (error: any) {
    console.error("Send certificates error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}