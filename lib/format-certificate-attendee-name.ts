import { formatAttendeeFullName } from "@/lib/format-attendee-name"

/** Full name for certificates (uppercase). */
export function formatCertificateAttendeeName(attendee: {
  personal_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  name_extension?: string | null
}): string {
  return formatAttendeeFullName(attendee, { uppercase: true })
}

/** Sample name shown in Certificate Template Editor preview */
export const CERTIFICATE_PREVIEW_ATTENDEE_NAME = "JUAN M. CRUZ, JR."
