//app\api\generate-certificate\route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCertificatePDF } from "@/lib/generateCertificatePDF";
import { capitalizeFirstLetter, formatEventDate } from "@/lib/textHelpers"; // optional

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { referenceId } = await req.json();

    const { data: attendee } = await supabase
      .from("attendees")
      .select("*, events(*)")
      .eq("reference_id", referenceId)
      .single();

    const event = attendee.events;
    const fullName = `${capitalizeFirstLetter(attendee.personal_name)} ${capitalizeFirstLetter(attendee.last_name)}`;

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
