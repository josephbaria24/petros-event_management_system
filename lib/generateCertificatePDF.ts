//lib\generateCertificatePDF.ts
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

export async function generateCertificatePDF(
  attendeeName: string,
  eventName: string,
  eventDate: string,
  eventVenue: string,
  eventId: number,
  templateType: "participation" | "awardee" | "attendance" = "participation"
): Promise<Buffer> {
  try {
    // Fetch certificate template
    const { data: template } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", eventId)
      .eq("template_type", templateType)
      .maybeSingle();

    // Fetch event topics
    const { data: eventData } = await supabase
      .from("events")
      .select("topics")
      .eq("id", eventId)
      .single();

    const topics = eventData?.topics || [];

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);

    // Load background image
    let imageBytes: ArrayBuffer | Buffer;

    if (template?.image_url) {
      const response = await fetch(template.image_url);
      if (!response.ok) throw new Error("Failed to fetch template image");
      imageBytes = await response.arrayBuffer();
    } else {
      const templatePath = path.join(process.cwd(), "public", "certificate-template.png");
      imageBytes = await fs.readFile(templatePath);
    }

    const image = await pdfDoc.embedPng(imageBytes);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: 842,
      height: 595,
    });

    // Resolve fields
    const fields =
      template?.fields?.length > 0
        ? template.fields
        : [
            {
              id: "name",
              value: "{{attendee_name}}",
              x: 421,
              y: 260,
              fontSize: 36,
              fontWeight: "bold",
              color: "#2C3E50",
              align: "center",
            },
            {
              id: "event",
              value: "for having attended the {{event_name}}",
              x: 421,
              y: 275,
              fontSize: 14,
              fontWeight: "normal",
              color: "#34495E",
              align: "center",
            },
            {
              id: "date",
              value: "conducted on {{event_date}} at {{event_venue}}",
              x: 421,
              y: 250,
              fontSize: 14,
              fontWeight: "normal",
              color: "#34495E",
              align: "center",
            },
          ];

    // Load fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const field of fields) {
      let text = field.value
        .replace(/\{\{attendee_name\}\}/g, attendeeName)
        .replace(/\{\{event_name\}\}/g, eventName)
        .replace(/\{\{event_date\}\}/g, eventDate)
        .replace(/\{\{event_venue\}\}/g, eventVenue);

      // Insert topics if needed
      if (topics.length > 0) {
        const allTopics = topics.map((t: any) => t.topic).filter(Boolean);

        text = text
          .replace(/\{\{covered_topics\}\}/g, allTopics.join(", "))
          .replace(/\{\{topic_1\}\}/g, allTopics[0] || "")
          .replace(/\{\{topic_2\}\}/g, allTopics[1] || "")
          .replace(/\{\{topic_3\}\}/g, allTopics[2] || "")
          .replace(/\{\{topic_4\}\}/g, allTopics[3] || "")
          .replace(/\{\{topic_5\}\}/g, allTopics[4] || "");
      }

      const font =
        field.fontWeight === "bold" ? helveticaBold : helvetica;

      const color = hexToRgb(field.color);
      const textWidth = font.widthOfTextAtSize(text, field.fontSize);

      let textX = field.x;
      if (field.align === "center") textX -= textWidth / 2;
      if (field.align === "right") textX -= textWidth;

      const pdfY = 595 - field.y;

      page.drawText(text, {
        x: textX,
        y: pdfY,
        size: field.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (err) {
    console.error("PDF generation failed:", err);
    throw err;
  }
}
