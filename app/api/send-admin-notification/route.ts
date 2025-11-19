//app\api\send-admin-notification\route.ts
import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.sendlayer.net",
  port: 587,
  secure: false,
  auth: {
    user: "2433A8191660728E311639BB642398DC",
    pass: process.env.SENDLAYER_SMTP_PASSWORD!,
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      personal_name,
      middle_name,
      last_name,
      email,
      mobile_number,
      date_of_birth,
      address,
      company,
      position,
      company_address,
      reference_id,
      event_name,
      venue,
      price,
    } = body

    const fullName = middle_name 
      ? `${personal_name} ${middle_name} ${last_name}`
      : `${personal_name} ${last_name}`

    const employmentInfo = company 
      ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Company:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${company}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Position:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${position || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Company Address:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${company_address || 'N/A'}</td>
        </tr>
      `
      : ''

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Registration - ${event_name}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 30px; background: linear-gradient(135deg, #017C7C 0%, #015555 100%); text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      🎉 New Registration
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #e0f2f1; font-size: 16px;">
                      ${event_name}
                    </p>
                  </td>
                </tr>

                <!-- Event Info -->
                <tr>
                  <td style="padding: 30px; background-color: #f8f9fa;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #017C7C;">📍 Venue:</strong> ${venue}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #017C7C;">💰 Price:</strong> ₱${Number(price).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #017C7C;">🔖 Reference ID:</strong> ${reference_id}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Registrant Details -->
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                      Registrant Information
                    </h2>
                    
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; background-color: #f9fafb;">Full Name:</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${fullName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; background-color: #f9fafb;">Email:</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                          <a href="mailto:${email}" style="color: #017C7C; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; background-color: #f9fafb;">Mobile:</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${mobile_number}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; background-color: #f9fafb;">Date of Birth:</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(date_of_birth).toLocaleDateString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; background-color: #f9fafb;">Address:</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${address}</td>
                      </tr>
                      ${employmentInfo}
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      This is an automated notification from your event registration system.
                    </p>
                    <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                      Registration received on ${new Date().toLocaleString()}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: '"Event Registration System" <no-reply@petros-global.com>',
      to: "no-reply@petros-global.com",
      subject: `New Registration: ${fullName} - ${event_name}`,
      html: htmlContent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to send admin notification:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}