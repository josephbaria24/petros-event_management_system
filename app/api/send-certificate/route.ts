//app\api\send-certificate\route.ts
import { NextResponse } from "next/server";
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
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "no-reply@petros-global.com",
    pass: "@Notsotrickypassword123",
  },
});

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

function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str
    .trim()
    .split(' ')
    .map(word => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
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
    // Get custom template from database
    console.log(`Fetching template for event ID: ${eventId}`);
    
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", eventId)
      .eq("template_type", templateType)
      .maybeSingle();

    if (templateError) {
      console.error("Error fetching template:", templateError);
    }

    if (template) {
      console.log("Template found:", {
        id: template.id,
        imageUrl: template.image_url?.substring(0, 50),
        fieldsCount: template.fields?.length || 0
      });
    } else {
      console.log("No custom template found, using defaults");
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);

    // Load template image
    let templateImageBytes: ArrayBuffer | Buffer;
    
    if (template?.image_url) {
      console.log("Fetching custom template from:", template.image_url);
      
      const response = await fetch(template.image_url);
      if (!response.ok) {
        console.error(`Failed to fetch template: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch template image: ${response.statusText}`);
      }
      templateImageBytes = await response.arrayBuffer();
      console.log("Template image fetched successfully");
    } else {
      console.log("Using default template from public folder");
      
      const templatePath = path.join(process.cwd(), "public", "certificate-template.png");
      templateImageBytes = await fs.readFile(templatePath);
    }

    const templateImage = await pdfDoc.embedPng(templateImageBytes);
    page.drawImage(templateImage, {
      x: 0,
      y: 0,
      width: 842,
      height: 595,
    });

    // Use custom fields if available, otherwise use defaults
    const fields = template?.fields && Array.isArray(template.fields) && template.fields.length > 0 
      ? template.fields 
      : [
          {
            id: "name",
            label: "Attendee Name",
            value: "{{attendee_name}}",
            x: 421,
            y: 260, // Changed from 335 to match other routes
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

    console.log(`Using ${fields.length} text fields:`, fields.map((f: any) => ({ 
      label: f.label, 
      x: f.x, 
      y: f.y, 
      fontSize: f.fontSize 
    })));

    // Load fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Draw each text field
    for (const field of fields) {
      // Replace placeholders
      let text = field.value
        .replace(/\{\{attendee_name\}\}/g, attendeeName)
        .replace(/\{\{event_name\}\}/g, eventName)
        .replace(/\{\{event_date\}\}/g, eventDate)
        .replace(/\{\{event_venue\}\}/g, eventVenue);

      const font = field.fontWeight === "bold" ? helveticaBold : helvetica;
      const color = hexToRgb(field.color);
      const textWidth = font.widthOfTextAtSize(text, field.fontSize);

      let x = field.x;
      if (field.align === "center") {
        x = field.x - textWidth / 2;
      } else if (field.align === "right") {
        x = field.x - textWidth;
      }

      // Convert Y coordinate from canvas (top=0) to PDF (bottom=0)
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

export async function POST(req: Request) {
  try {
    const { referenceId } = await req.json();

    if (!referenceId) {
      return NextResponse.json(
        { error: "Missing reference ID" },
        { status: 400 }
      );
    }

    console.log(`Processing certificate for reference: ${referenceId}`);

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

    if (!attendee.hasevaluation) {
      return NextResponse.json(
        { error: "Evaluation not completed" },
        { status: 400 }
      );
    }

    const event = attendee.events;
    // Capitalize first letter of first name and last name
    const firstName = capitalizeFirstLetter(attendee.personal_name);
    const lastName = capitalizeFirstLetter(attendee.last_name);
    const fullName = `${firstName} ${lastName}`;
    const eventDate = formatEventDate(event.start_date, event.end_date);

    console.log(`Generating certificate for: ${fullName}, Event ID: ${event.id}`);

    const certificatePDF = await generateCertificatePDF(
      fullName,
      event.name,
      eventDate,
      event.venue || "Philippines",
      event.id
    );

    console.log("Certificate PDF generated successfully");

    const mailOptions = {
      from: `"Petrosphere Inc." <no-reply@petros-global.com>`,
      to: email,
      subject: `Certificate of Participation - ${event.name}`,
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
                Thank you for completing the evaluation for <strong>${event.name}</strong>.
              </p>
              <p>
                Please find attached your <strong>Certificate of Participation</strong>.
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
          filename: `Certificate_${fullName.replace(/\s+/g, "_")}.pdf`,
          content: certificatePDF,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    console.log(`Certificate sent successfully to: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Certificate sent successfully",
    });
  } catch (error: any) {
    console.error("❌ Send Certificate Error:", error);
    return NextResponse.json(
      { error: "Failed to send certificate", details: error.message },
      { status: 500 }
    );
  }
}