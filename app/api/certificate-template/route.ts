//app/api/certificate-template/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    console.log(`Fetching template for event ID: ${eventId}`);

    // Get template from database
    const { data, error } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Template data:", data);

    // Return the data directly (send-certificate uses snake_case)
    return NextResponse.json({ template: data });
  } catch (error: any) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { eventId, imageUrl, fields } = await req.json();

    console.log("Saving template:", { eventId, imageUrl: imageUrl?.substring(0, 50), fieldsCount: fields?.length });

    if (!eventId || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if template exists
    const { data: existing } = await supabase
      .from("certificate_templates")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      console.log("Updating existing template ID:", existing.id);
      
      // Update existing template
      const { error } = await supabase
        .from("certificate_templates")
        .update({
          image_url: imageUrl,
          fields: fields,
          updated_at: new Date().toISOString()
        })
        .eq("event_id", eventId);

      if (error) {
        console.error("Update error:", error);
        throw error;
      }
    } else {
      console.log("Creating new template");
      
      // Insert new template
      const { error } = await supabase
        .from("certificate_templates")
        .insert({
          event_id: eventId,
          image_url: imageUrl,
          fields: fields
        });

      if (error) {
        console.error("Insert error:", error);
        throw error;
      }
    }

    console.log("Template saved successfully");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving template:", error);
    return NextResponse.json(
      { error: "Failed to save template", details: error.message },
      { status: 500 }
    );
  }
}