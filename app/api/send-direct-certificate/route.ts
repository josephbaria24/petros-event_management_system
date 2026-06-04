//app/api/send-direct-certificate/route.ts
import { NextResponse } from "next/server";
import { formatCertificateAttendeeName } from "@/lib/format-certificate-attendee-name";
import { wrapEmailHtml } from "@/lib/email-templates";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

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

// ✅ ADD: Text wrapping function (was missing!)
function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

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

async function generateCertificatePDF(
  attendeeName: string,
  eventName: string,
  eventDate: string,
  eventVenue: string,
  eventId: number,
  templateType: "participation" | "awardee" | "attendance" = "participation"
): Promise<Buffer> {
  try {
    console.log(`Fetching ${templateType} template for event ID: ${eventId}`);
    
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

    if (templateError) {
      console.error("Error fetching template:", templateError);
      throw new Error("Template not found");
    }

    if (!template) {
      throw new Error(`${templateType} template not configured for this event`);
    }

    // ✅ FIX: Create new PDF document for each certificate
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);

    let templateImageBytes: ArrayBuffer | Buffer;
    
    if (template?.image_url) {
      console.log("Fetching template image...");
      const response = await fetch(template.image_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch template image: ${response.statusText}`);
      }
      templateImageBytes = await response.arrayBuffer();
      
      // ✅ FIX: Validate image data
      if (!templateImageBytes || templateImageBytes.byteLength === 0) {
        throw new Error("Template image is empty or corrupted");
      }
    } else {
      const templatePath = path.join(process.cwd(), "public", "certificate-template.png");
      templateImageBytes = await fs.readFile(templatePath);
    }

    // ✅ FIX: Try-catch for image embedding
    let templateImage;
    try {
      templateImage = await pdfDoc.embedPng(templateImageBytes);
    } catch (error) {
      console.error("Failed to embed PNG, trying as JPEG:", error);
      // Fallback to JPEG if PNG fails
      templateImage = await pdfDoc.embedJpg(templateImageBytes);
    }

    page.drawImage(templateImage, {
      x: 0,
      y: 0,
      width: 842,
      height: 595,
    });

    const fields = template?.fields && Array.isArray(template.fields) && template.fields.length > 0 
      ? template.fields 
      : [
          {
            id: "name",
            label: "Attendee Name",
            value: "{{attendee_name}}",
            x: 421,
            y: 260,
            fontSize: 36,
            fontWeight: "bold",
            color: "#2C3E50",
            align: "center"
          },
          {
            id: "event",
            label: "Event Name",
            value: "for having attended the {{event_name}}",
            x: 421,
            y: 275,
            fontSize: 14,
            fontWeight: "normal",
            color: "#34495E",
            align: "center"
          },
          {
            id: "date",
            label: "Event Date",
            value: "conducted on {{event_date}} at {{event_venue}}",
            x: 421,
            y: 250,
            fontSize: 14,
            fontWeight: "normal",
            color: "#34495E",
            align: "center"
          }
        ];

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

      const pdfY = 595 - field.y;

      // ✅ FIX: Add text wrapping with proper max width
      const MAX_TEXT_WIDTH = 700; // Adjusted for certificate width
      const lines = wrapText(text, font, field.fontSize, MAX_TEXT_WIDTH);
      const lineHeight = field.fontSize + 4;

      let lineY = pdfY;

      for (const line of lines) {
        const lineWidth = font.widthOfTextAtSize(line, field.fontSize);
        let drawX = field.x;

        if (field.align === "center") {
          drawX = field.x - lineWidth / 2;
        } else if (field.align === "right") {
          drawX = field.x - lineWidth;
        }

        // ✅ FIX: Validate coordinates before drawing
        if (isNaN(drawX) || isNaN(lineY)) {
          console.warn("Invalid coordinates, skipping line:", { drawX, lineY, line });
          continue;
        }

        page.drawText(line, {
          x: drawX,
          y: lineY,
          size: field.fontSize,
          font: font,
          color: rgb(color.r, color.g, color.b),
        });

        lineY -= lineHeight;
      }
    }

    // ✅ FIX: Ensure PDF is properly saved
    const pdfBytes = await pdfDoc.save();
    
    // ✅ FIX: Validate PDF output
    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error("Generated PDF is empty");
    }

    console.log(`PDF generated successfully, size: ${pdfBytes.length} bytes`);
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  email = email.trim();
  if (email.includes(" ")) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

export async function POST(req: Request) {
  try {
    const { referenceId, templateType = "participation" } = await req.json();

    if (!referenceId) {
      return NextResponse.json(
        { error: "Missing reference ID" },
        { status: 400 }
      );
    }

    console.log(`Processing ${templateType} certificate for reference: ${referenceId}`);

    const { data: attendee, error: attendeeError } = await supabase
      .from("attendees")
      .select("*, events(*)")
      .eq("reference_id", referenceId)
      .single();

    if (attendeeError || !attendee) {
      console.error("Attendee error:", attendeeError);
      return NextResponse.json(
        { error: "Attendee not found" },
        { status: 404 }
      );
    }

    const email = attendee.email?.trim();
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const event = attendee.events;
    const fullName = formatCertificateAttendeeName(attendee);
    const eventDate = formatEventDate(event.start_date, event.end_date);

    console.log(`Generating ${templateType} certificate for: ${fullName}, Event ID: ${event.id}`);

    // ✅ FIX: Wrap in try-catch for better error handling
    let certificatePDF: Buffer;
    try {
      certificatePDF = await generateCertificatePDF(
        fullName,
        event.name,
        eventDate,
        event.venue || "Philippines",
        event.id,
        templateType as "participation" | "awardee" | "attendance"
      );
    } catch (pdfError: any) {
      console.error("PDF Generation Error:", pdfError);
      return NextResponse.json(
        { error: "Failed to generate certificate PDF", details: pdfError.message },
        { status: 500 }
      );
    }

    console.log("Certificate PDF generated successfully");

    const certificateLabel = getTemplateTypeLabel(templateType);

    const mailOptions = {
      from: '"Petrosphere" <info@petros-global.com>',
      to: email,
      subject: `Certificate of ${certificateLabel} - ${event.name}`,
      html: wrapEmailHtml(`
        <h2 style="margin-top: 0;">Congratulations, ${fullName}!</h2>
        <p>
          Please find attached your <strong>Certificate of ${certificateLabel}</strong> for <strong>${event.name}</strong>.
        </p>
        <p style="margin-top: 30px; color: #666666; font-size: 14px;">
          If you have any questions or feedback, contact training-department@petrsphere.com.ph or info@petros-global.com
        </p>
      `),
      attachments: [
        {
          filename: `Certificate_${certificateLabel}_${fullName.replace(/\s+/g, "_")}.pdf`,
          content: certificatePDF,
          contentType: "application/pdf",
        },
      ],
    };

    // ✅ FIX: Add email sending error handling
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Certificate sent successfully to: ${email}`);
    } catch (emailError: any) {
      console.error("Email sending error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email", details: emailError.message },
        { status: 500 }
      );
    }

    // Update certificate_sent array in database
    const currentCertificates = attendee.certificate_sent || [];
    const updatedCertificates = [
      ...currentCertificates,
      {
        type: templateType,
        sent_at: new Date().toISOString(),
        sent_to: email
      }
    ];

    const { error: updateError } = await supabase
      .from("attendees")
      .update({ certificate_sent: updatedCertificates })
      .eq("id", attendee.id);

    if (updateError) {
      console.error("Error updating certificate_sent:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: "Certificate sent successfully",
    });
  } catch (error: any) {
    console.error("❌ Send Direct Certificate Error:", error);
    return NextResponse.json(
      { error: "Failed to send certificate", details: error.message },
      { status: 500 }
    );
  }
}