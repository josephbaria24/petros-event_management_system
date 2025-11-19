// app/api/cron/process-email-queue/route.ts
/**
 * CRON JOB: Process Email Queue
 * 
 * This should run daily (e.g., at 12:00 AM) to process pending queued emails
 * 
 * Setup in Vercel:
 * 1. Go to Project Settings > Cron Jobs
 * 2. Add new cron job:
 *    - Path: /api/cron/process-email-queue
 *    - Schedule: 0 0 * * * (daily at midnight)

 */

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { EmailQueueManager } from "@/lib/email-queue";

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

export async function GET(req: Request) {
  // Verify cron secret (security)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("🚀 Starting email queue processor...");

    // Get today's pending queue
    const pendingQueue = await EmailQueueManager.getTodaysPendingQueue();
    
    if (pendingQueue.length === 0) {
      console.log("✅ No pending emails to process");
      return NextResponse.json({ 
        success: true, 
        message: "No pending emails",
        processed: 0 
      });
    }

    console.log(`📧 Processing ${pendingQueue.length} queued emails...`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Check today's rate limit
    const todayCount = await EmailQueueManager.getTodayEmailCount();
    const remainingSlots = 100 - todayCount.total;

    console.log(`📊 Rate limit: ${todayCount.total}/100 used, ${remainingSlots} remaining`);

    // Process only what fits in remaining slots
    const itemsToProcess = pendingQueue.slice(0, remainingSlots);

    for (const item of itemsToProcess) {
      try {
        if (item.type === "evaluation") {
          await processEvaluationEmail(item);
        } else if (item.type === "certificate") {
          await processCertificateEmail(item);
        }

        await EmailQueueManager.markAsSent(item.id);
        results.sent++;
        
        console.log(`✅ Sent ${item.type} to ${item.email}`);
      } catch (error: any) {
        console.error(`❌ Failed to send ${item.type} to ${item.email}:`, error.message);
        
        await EmailQueueManager.markAsFailed(item.id);
        results.failed++;
        results.errors.push(`${item.email}: ${error.message}`);
      }
    }

    console.log(`
🎉 Queue processing complete:
   ✅ Sent: ${results.sent}
   ❌ Failed: ${results.failed}
   📋 Remaining in queue: ${pendingQueue.length - itemsToProcess.length}
    `);

    return NextResponse.json({
      success: true,
      results,
      remaining: pendingQueue.length - itemsToProcess.length,
    });
  } catch (error: any) {
    console.error("❌ Queue processor error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function processEvaluationEmail(item: any) {
  const { eventName, referenceId, name } = item.payload;

  const evaluationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/evaluation/${referenceId}`;

  await transporter.sendMail({
    from: '"Petros" <no-reply@petros-global.com>',
    to: item.email,
    subject: `Evaluation Request - ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hello ${name},</h2>
        <p>Thank you for attending <strong>${eventName}</strong>!</p>
        <p>Please complete our evaluation form:</p>
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
    .eq("id", item.attendee_id);
}


async function processCertificateEmail(item: any) {
    const { referenceId, templateType } = item.payload;
  
    // Fetch attendee and generate certificate
    const { data: attendee } = await supabase
      .from("attendees")
      .select("*, events(*)")
      .eq("reference_id", referenceId)
      .single();
  
    if (!attendee) {
      throw new Error("Attendee not found");
    }
  
    const event = attendee.events;
    const fullName = `${attendee.personal_name.toUpperCase()} ${attendee.last_name.toUpperCase()}`;
  
    // Generate certificate PDF (you need to add this function)
    // const certificatePDF = await generateCertificatePDF(...)
  
    await transporter.sendMail({
      from: '"Petros" <no-reply@petros-global.com>',
      to: item.email,
      subject: `Certificate - ${event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Congratulations, ${fullName}!</h2>
          <p>Please find your certificate attached.</p>
        </div>
      `,
      attachments: [
        {
          filename: `Certificate_${fullName.replace(/\s+/g, "_")}.pdf`,
          content: Buffer.from([]), // certificatePDF
          contentType: "application/pdf",
        },
      ],
    });
  
    // ✅ ADD THIS: Update certificate_sent badge
    const currentCerts = attendee.certificate_sent || [];
    await supabase
      .from("attendees")
      .update({
        certificate_sent: [
          ...currentCerts,
          {
            type: templateType,
            sent_at: new Date().toISOString(),
            sent_to: item.email,
          },
        ],
      })
      .eq("id", attendee.id);
  }