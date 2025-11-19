//app\api\send-evaluations\route.ts
import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"

// ✅ Setup Supabase (Server-side client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ Setup SMTP transporter (Hostinger)
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "no-reply@petros-global.com",
    pass: "@Notsotrickypassword123",
  },
})

// ✅ Email validation function
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false
  email = email.trim()
  if (email.includes(" ")) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(req: Request) {
  try {
    // 🧩 1. Parse request body
    const { eventId, attendeeIds } = await req.json()

    if (!eventId) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 })
    }

    // 🧠 2. Build query dynamically
    let query = supabase
      .from("attendees")
      .select("id, personal_name, last_name, email, reference_id, hassentevaluation")
      .eq("event_id", eventId)

    if (Array.isArray(attendeeIds) && attendeeIds.length > 0) {
      query = query.in("id", attendeeIds)
    } else {
      query = query.eq("hassentevaluation", false)
    }

    const { data: attendees, error } = await query

    if (error) throw error
    if (!attendees?.length) {
      return NextResponse.json({ message: "No attendees to send evaluations." })
    }

    // 🧩 3. Get event details
    const { data: event } = await supabase
      .from("events")
      .select("name")
      .eq("id", eventId)
      .single()

    // ✅ Determine base URL dynamically
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000"

    // ✅ 4. Send evaluation emails with detailed tracking
    const successful: Array<{ id: number; name: string; email: string }> = []
    const failed: Array<{ id: number; name: string; email: string; error: string }> = []

    for (const attendee of attendees) {
      const fullName = `${attendee.personal_name} ${attendee.last_name}`

      // Validate email
      if (!attendee.email) {
        failed.push({
          id: attendee.id,
          name: fullName,
          email: attendee.email || "N/A",
          error: "Email address is missing",
        })
        continue
      }

      const cleanEmail = attendee.email.trim()
      if (!isValidEmail(cleanEmail)) {
        let errorMsg = "Invalid email format"
        if (attendee.email.includes(" ")) {
          errorMsg = "Email contains spaces"
        }
        failed.push({
          id: attendee.id,
          name: fullName,
          email: attendee.email,
          error: errorMsg,
        })
        continue
      }

      try {
        // ✅ Dynamic evaluation link (changes between dev & prod)
        const evalLink = `${baseUrl}/evaluation/${encodeURIComponent(attendee.reference_id)}`

        const mailOptions = {
          from: `"Petrosphere" <no-reply@petros-global.com>`,
          to: cleanEmail,
          subject: `Evaluation Form - ${event?.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; background-color: #ffffff; padding: 30px;">
              <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
              <div style="background-color: #0e026aff; text-align: center; padding: 20px; border: 3px solid #1e1b4b;border-radius: 10px;">
                <img src="https://petrosphere.com.ph/wp-content/uploads/al_opt_content/IMAGE/petrosphere.com.ph/wp-content/uploads/2022/08/cropped-Petrosphere-Horizontal-Logo-white-with-clear-background-279x50.png.bv.webp?bv_host=petrosphere.com.ph" 
                    alt="Petros Logo" 
                    style="height: 60px;" />
              </div>
                <div style="padding: 30px; color: #333;">
                  <h2>Hi, ${attendee.personal_name} ${attendee.last_name}!</h2>
                  <p>
                    Congratulations for completing the <strong>${event?.name}</strong>.<br/><br/>
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
        }

        await transporter.sendMail(mailOptions)

        // 🧾 Mark attendee as "evaluation sent"
        await supabase
          .from("attendees")
          .update({ hassentevaluation: true })
          .eq("id", attendee.id)

        successful.push({
          id: attendee.id,
          name: fullName,
          email: cleanEmail,
        })
      } catch (emailError: any) {
        failed.push({
          id: attendee.id,
          name: fullName,
          email: cleanEmail,
          error: emailError.message || "Failed to send email",
        })
      }
    }

    return NextResponse.json({
      message: "✅ Email sending process completed.",
      result: { successful, failed },
    })
  } catch (error) {
    console.error("❌ Send Evaluations Error:", error)
    return NextResponse.json(
      { error: "Failed to send evaluations" },
      { status: 500 }
    )
  }
}
