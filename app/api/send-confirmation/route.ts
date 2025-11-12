import nodemailer from "nodemailer"
import QRCode from "qrcode"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { email, name, reference_id, event_name, venue, link } = body

  try {
    // 1️⃣ Generate QR Code (based on reference_id)
    const qrCodeDataUrl = await QRCode.toDataURL(reference_id)

    // 2️⃣ Configure SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: "no-reply@petros-global.com",
        pass: "@Notsotrickypassword123",
      },
    })

    // 3️⃣ Email HTML Template
    const html = `
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:20px;font-family:Arial,sans-serif;">
        <h2>Hi, ${name}!</h2>
        <p>We have received your registration for the <strong>${event_name}</strong>.</p>
        <p>You may view your submission / QR code details by clicking the button below:</p>
        <a href="${link}" style="display:inline-block;background:#00c04b;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:bold;">View Submission</a>
        <p style="margin-top:20px;">Kindly present your submission details on the day of the event to confirm your attendance.</p>
        <hr style="margin:30px 0;">
        <div style="display:flex;align-items:center;gap:16px;">
          <img src="${qrCodeDataUrl}" alt="QR Code" width="120" height="120"/>
          <div>
            <p><strong>Event:</strong> ${event_name}</p>
            <p><strong>Venue:</strong> ${venue}</p>
            <p><strong>Reference ID:</strong> ${reference_id}</p>
          </div>
        </div>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
        If you have any questions, please don't hesitate to contact info@petros-global.com
      </p>
      </div>
    `

    // 4️⃣ Send Email
    await transporter.sendMail({
      from: `"Petrosphere Webinar Registration" <no-reply@petros-global.com>`,
      to: email,
      subject: `Your Registration for ${event_name}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Email error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
