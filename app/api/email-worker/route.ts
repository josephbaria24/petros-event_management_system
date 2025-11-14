import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { generateCertificatePDF } from "@/lib/generateCertificatePDF";
import { capitalizeFirstLetter, formatEventDate } from "@/lib/textHelpers";
import type { EmailQueueJob, AttendeeWithEvent } from "@/types/queue";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "no-reply@petros-global.com",
    pass: process.env.SMTP_PASS || "@Notsotrickypassword123",
  },
});

// Hostinger limits: 100 emails per hour
const MAX_PER_HOUR = 100;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 3;

// In-memory rate limiter (use Redis in production)
let emailsSent = 0;
let windowStart = Date.now();

function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Reset window if expired
  if (now - windowStart > WINDOW_MS) {
    emailsSent = 0;
    windowStart = now;
  }
  
  return emailsSent < MAX_PER_HOUR;
}

function incrementCounter() {
  emailsSent++;
}

async function sendEvaluationEmail(job: EmailQueueJob) {
  const evalLink = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/evaluation/${encodeURIComponent(
    (job.payload as any).referenceId
  )}`;

  const { data: attendee, error } = await supabase
    .from("attendees")
    .select("personal_name, last_name, events(name)")
    .eq("reference_id", (job.payload as any).referenceId)
    .single();

  if (error || !attendee) {
    throw new Error(`Attendee not found: ${error?.message || "Unknown error"}`);
  }

  // Supabase returns the related event as an object, not an array
  const event = attendee.events as unknown as { name: string };
  const eventName = event?.name || "Event";

  await transporter.sendMail({
    from: `"Petrosphere" <no-reply@petros-global.com>`,
    to: job.email,
    subject: `Evaluation Form - ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #ffffff; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #0e026aff; text-align: center; padding: 20px; border: 3px solid #1e1b4b;border-radius: 10px;">
            <img src="https://petrosphere.com.ph/wp-content/uploads/al_opt_content/IMAGE/petrosphere.com.ph/wp-content/uploads/2022/08/cropped-Petrosphere-Horizontal-Logo-white-with-clear-background-279x50.png.bv.webp?bv_host=petrosphere.com.ph" 
                alt="Petros Logo" 
                style="height: 60px;" />
          </div>
          <div style="padding: 30px; color: #333;">
            <h2>Hi, ${attendee?.personal_name} ${attendee?.last_name}!</h2>
            <p>
              Congratulations for completing the <strong>${eventName}</strong>.<br/><br/>
              We would like to invite you to complete an evaluation about the said Conference.
              Once done, you will receive another email with your digital certificate copy.
            </p>
            <p>You may take the evaluation by clicking the button below. Thank you!</p>
            <div style="text-align: center; margin-top: 25px;">
              <a href="${evalLink}"
                style="background-color: #1e1b4b; color: #ffffff; padding: 12px 25px;
                       border-radius: 6px; text-decoration: none; font-weight: bold;">
                Take Evaluation
              </a>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, please don't hesitate to contact info@petros-global.com
            </p>
          </div>
        </div>
      </div>
    `,
  });

  // Mark attendee as sent
  await supabase
    .from("attendees")
    .update({ hassentevaluation: true })
    .eq("id", job.attendee_id);
}

async function sendCertificateEmail(job: EmailQueueJob) {
  const payload = job.payload as any;
  
  const { data: attendee, error } = await supabase
    .from("attendees")
    .select("*, events(*)")
    .eq("reference_id", payload.referenceId)
    .single();

  if (error || !attendee) {
    throw new Error(`Attendee not found: ${error?.message || "Unknown error"}`);
  }

  // Cast to proper type - Supabase returns events as object
  const typedAttendee = attendee as unknown as AttendeeWithEvent;
  const event = typedAttendee.events;
  const firstName = capitalizeFirstLetter(typedAttendee.personal_name);
  const lastName = capitalizeFirstLetter(typedAttendee.last_name);
  const fullName = `${firstName} ${lastName}`;
  const eventDate = formatEventDate(event.start_date, event.end_date);

  const pdf = await generateCertificatePDF(
    fullName,
    event.name,
    eventDate,
    event.venue || "Philippines",
    event.id,
    payload.templateType || "participation"
  );

  const templateLabel = payload.templateType === "awardee" 
    ? "Award" 
    : payload.templateType === "attendance" 
    ? "Attendance" 
    : "Participation";

  await transporter.sendMail({
    from: `"Petrosphere Inc." <no-reply@petros-global.com>`,
    to: typedAttendee.email,
    subject: `Certificate of ${templateLabel} - ${event.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #0e026aff; text-align: center; padding: 20px; border: 3px solid #1e1b4b;border-radius: 10px;">
            <img src="https://petrosphere.com.ph/wp-content/uploads/al_opt_content/IMAGE/petrosphere.com.ph/wp-content/uploads/2022/08/cropped-Petrosphere-Horizontal-Logo-white-with-clear-background-279x50.png.bv.webp?bv_host=petrosphere.com.ph" 
                 alt="Petros Logo" 
                 style="height: 60px;" />
          </div>
          <div style="padding: 30px; color: #333;">
            <h2>Congratulations, ${firstName} ${lastName}!</h2>
            <p>
              Please find attached your <strong>Certificate of ${templateLabel}</strong> for <strong>${event.name}</strong>.
            </p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, please don't hesitate to contact info@petros-global.com
            </p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Petrosphere Inc. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Certificate_${templateLabel}_${fullName.replace(/\s+/g, "_")}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function GET() {
  try {
    // Check rate limit
    if (!checkRateLimit()) {
      return NextResponse.json({ 
        status: "rate_limited", 
        message: "Rate limit reached. Will retry in next window.",
        emailsSent,
        maxPerHour: MAX_PER_HOUR
      });
    }

    // Fetch next pending job
    const { data: job, error: jobError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempt", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        status: "idle",
        message: "No pending jobs in queue"
      });
    }

    // Cast to proper type
    const typedJob = job as unknown as EmailQueueJob;

    // Mark as processing
    await supabase
      .from("email_queue")
      .update({ 
        status: "processing",
        last_attempt_at: new Date().toISOString()
      })
      .eq("id", typedJob.id);

    // Send email based on type
    try {
      if (typedJob.type === "evaluation") {
        await sendEvaluationEmail(typedJob);
      } else if (typedJob.type === "certificate") {
        await sendCertificateEmail(typedJob);
      } else {
        throw new Error(`Unknown job type: ${typedJob.type}`);
      }

      // Mark as sent
      await supabase
        .from("email_queue")
        .update({ 
          status: "sent",
          last_attempt_at: new Date().toISOString()
        })
        .eq("id", typedJob.id);

      incrementCounter();

      return NextResponse.json({ 
        status: "success",
        jobId: typedJob.id,
        type: typedJob.type,
        email: typedJob.email,
        emailsSentThisHour: emailsSent
      });

    } catch (sendError: any) {
      console.error(`Error sending email (job ${typedJob.id}):`, sendError);

      // Increment attempt counter
      const newAttempt = typedJob.attempt + 1;
      
      if (newAttempt >= MAX_RETRIES) {
        // Max retries reached - mark as failed
        await supabase
          .from("email_queue")
          .update({ 
            status: "failed",
            attempt: newAttempt,
            last_attempt_at: new Date().toISOString()
          })
          .eq("id", typedJob.id);

        return NextResponse.json({ 
          status: "failed",
          jobId: typedJob.id,
          error: sendError.message,
          message: "Max retries reached"
        }, { status: 500 });
      } else {
        // Retry later
        await supabase
          .from("email_queue")
          .update({ 
            status: "pending",
            attempt: newAttempt,
            last_attempt_at: new Date().toISOString()
          })
          .eq("id", typedJob.id);

        return NextResponse.json({ 
          status: "retry",
          jobId: typedJob.id,
          attempt: newAttempt,
          maxRetries: MAX_RETRIES,
          error: sendError.message
        }, { status: 500 });
      }
    }

  } catch (error: any) {
    console.error("Worker error:", error);
    return NextResponse.json({ 
      status: "error",
      error: error.message 
    }, { status: 500 });
  }
}