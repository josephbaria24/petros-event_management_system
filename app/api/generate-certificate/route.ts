//app\api\generate-certificate\route.ts
// ============================================
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// UPDATED: Capitalize ALL letters
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
    console.log(`Fetching ${templateType} template for event ID: ${eventId}`);
    
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", eventId)
      .eq("template_type", templateType)
      .maybeSingle();

    // ADDED: Get event topics
    const { data: eventData } = await supabase
      .from("events")
      .select("topics")
      .eq("id", eventId)
      .single();

    const topics = eventData?.topics || [];

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

    let templateImageBytes: ArrayBuffer | Buffer;
    
    if (template?.image_url) {
      console.log("Fetching custom template from:", template.image_url);
      const response = await fetch(template.image_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch template image: ${response.statusText}`);
      }
      templateImageBytes = await response.arrayBuffer();
    } else {
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

      // ADDED: Replace topic placeholders
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

export async function POST(req: Request) {
  try {
    const { referenceId } = await req.json();

    const { data: attendee } = await supabase
      .from("attendees")
      .select("*, events(*)")
      .eq("reference_id", referenceId)
      .single();

    const event = attendee.events;
    
    // UPDATED: Capitalize ALL letters
    const firstName = capitalizeAllLetters(attendee.personal_name);
    const lastName = capitalizeAllLetters(attendee.last_name);
    const fullName = `${firstName} ${lastName}`;

    const eventDate = formatEventDate(event.start_date, event.end_date);

    const pdf = await generateCertificatePDF(
      fullName,
      event.name,
      eventDate,
      event.venue || "Philippines",
      event.id,
      "participation"
    );

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Certificate_${fullName.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}