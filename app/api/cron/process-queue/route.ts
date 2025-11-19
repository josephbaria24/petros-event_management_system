// app/api/cron/process-queue/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { EmailQueueManager } from "@/lib/email-queue";
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

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

function capitalizeAllLetters(str: string): string {
  if (!str) return str;
  return str.trim().toUpperCase();
}

function formatEventDate(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', options);
  } else {
    const startFormatted = start.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
    const endFormatted = end.toLocaleDateString('en-US', options);
    return `${startFormatted}-${endFormatted.split(' ')[1]}, ${end.getFullYear()}`;
  }
}

async function generateCertificatePDF(
  attendeeName: string,
  eventName: string,
  eventDate: string,
  eventVenue: string,
  eventId: number,
  templateType: "participation" | "awardee" | "attendance" = "participation"
): Promise<Buffer> {
  try {
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", eventId)
      .eq("template_type", templateType)
      .maybeSingle();

    const { data: eventData } = await supabase
      .from("events")
      .select("topics")
      .eq("id", eventId)
      .single();

    const topics = eventData?.topics || [];

    if (templateError || !template) {
      throw new Error(`${templateType} template not configured`);
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);

    let templateImageBytes: ArrayBuffer | Buffer;
    
    if (template?.image_url) {
      const response = await fetch(template.image_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch template image: ${response.statusText}`);
      }
      templateImageBytes = await response.arrayBuffer();
    } else {
      throw new Error("Template image not found");
    }

    const templateImage = await pdfDoc.embedPng(templateImageBytes);
    page.drawImage(templateImage, {
      x: 0,
      y: 0,
      width: 842,
      height: 595,
    });

    const fields = template?.fields && Array.isArray(template.fields) && template.fields.length > 0 
      ? template.fields 
      : [];

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const field of fields) {
      let text = field.value
        .replace(/\{\{attendee_name\}\}/g, attendeeName)
        .replace(/\{\{event_name\}\}/g, eventName)
        .replace(/\{\{event_date\}\}/g, eventDate)
        .replace(/\{\{event_venue\}\}/g, eventVenue);

      if (topics && Array.isArray(topics)) {
        const allTopics = topics.map((t: any) => t.topic || t).filter(Boolean);
        text = text
          .replace(/\{\{covered_topics\}\}/g, allTopics.join(", "))
          .replace(/\{\{topic_1\}\}/g, allTopics[0] || "")
          .replace(/\{\{topic_2\}\}/g, allTopics[1] || "")
          .replace(/\{\{topic_3\}\}/g, allTopics[2] || "")
          .replace(/\{\{topic_4\}\}/g, allTopics[3] || "")
          .replace(/\{\{topic_5\}\}/g, allTopics[4] || "");
      }

      const font = field.fontWeight === "bold" ? helveticaBold : helvetica;
      const color = hexToRgb(field.color);
      const textWidth = font.widthOfTextAtSize(text, field.fontSize);

      let x = field.x;
      if (field.align === "center") {
        x = field.x - textWidth / 2;
      } else if (field.align === "right") {
        x = field.x - textWidth;
      }

      const pdfY = 595 - field.y;

      page.drawText(text, {
        x: x,
        y: pdfY,
        size: field.fontSize,
        font: font,
        color: rgb(color.r, color.g, color.b),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

function getTemplateTypeLabel(templateType: string): string {
  switch (templateType) {
    case "participation":
      return "Participation";
    case "awardee":
      return "Award";
    case "attendance":
      return "Attendance";
    default:
      return "Participation";
  }
}

// Main cron handler - can be called via GET (for cron) or POST (for manual trigger)
export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  try {
    console.log("🚀 Starting email queue processor...");

    // Get today's pending queue
    const pendingQueue = await EmailQueueManager.getTodaysPendingQueue();
    
    if (pendingQueue.length === 0) {
      console.log("✅ No pending emails to process");
      return NextResponse.json({ 
        success: true, 
        message: "No pending emails",
        processed: 0,
        timestamp: new Date().toISOString()
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

    if (remainingSlots <= 0) {
      return NextResponse.json({
        success: true,
        message: "Daily rate limit reached",
        processed: 0,
        rateLimitInfo: todayCount,
        timestamp: new Date().toISOString()
      });
    }

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

      // Small delay between emails to avoid overwhelming SMTP server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`🎉 Queue processing complete: ✅ ${results.sent} sent, ❌ ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      results,
      remaining: pendingQueue.length - itemsToProcess.length,
      rateLimitInfo: await EmailQueueManager.getTodayEmailCount(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("❌ Queue processor error:", error);
    return NextResponse.json(
      { error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

async function processEvaluationEmail(item: any) {
  const { eventName, referenceId, name } = item.payload;

  const evaluationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/evaluate?ref=${referenceId}`;

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
  const { referenceId, templateType, eventId } = item.payload;

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
  const firstName = capitalizeAllLetters(attendee.personal_name);
  const lastName = capitalizeAllLetters(attendee.last_name);
  const fullName = `${firstName} ${lastName}`;
  const eventDate = formatEventDate(event.start_date, event.end_date);

  // Generate certificate PDF
  const certificatePDF = await generateCertificatePDF(
    fullName,
    event.name,
    eventDate,
    event.venue || "Philippines",
    eventId || event.id,
    templateType as "participation" | "awardee" | "attendance"
  );

  const certificateLabel = getTemplateTypeLabel(templateType);

  await transporter.sendMail({
    from: '"Petros" <no-reply@petros-global.com>',
    to: item.email,
    subject: `Certificate of ${certificateLabel} - ${event.name}`,
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
              Please find attached your <strong>Certificate of ${certificateLabel}</strong> for <strong>${event.name}</strong>.
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
        filename: `Certificate_${certificateLabel}_${fullName.replace(/\s+/g, "_")}.pdf`,
        content: certificatePDF,
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
          sent_to: item.email,
        },
      ],
    })
    .eq("id", attendee.id);
}