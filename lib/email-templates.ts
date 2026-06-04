/** Branded text header on navy background (no image — reliable in all email clients). */
export function buildEmailHeaderHtml(): string {
  return `
    <div style="background-color: #0e026a; text-align: center; padding: 24px 20px;">
      <p style="margin: 0; color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 0.5px; line-height: 1.3;">
        Petrosphere Incorporated
      </p>
    </div>
  `.trim()
}

export function buildEmailFooterHtml(): string {
  return `
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #666666; font-size: 12px; line-height: 1.5;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Petrosphere Inc. All rights reserved.</p>
    </div>
  `.trim()
}

/** Wrap email body with branded header and footer. */
export function wrapEmailHtml(bodyHtml: string, options?: { outerBackground?: string }): string {
  const outerBg = options?.outerBackground ?? "#f5f5f5"
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: ${outerBg}; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb;">
        ${buildEmailHeaderHtml()}
        <div style="padding: 30px; color: #333333; line-height: 1.6;">
          ${bodyHtml}
        </div>
        ${buildEmailFooterHtml()}
      </div>
    </div>
  `.trim()
}
