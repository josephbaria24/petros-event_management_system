import {
  formatAttendeeFullName,
  normalizeAttendeeNameFields,
  type NameParts,
} from "@/lib/format-attendee-name"

/** Full name for certificates — proper title case, normalized initials and suffixes. */
export function formatCertificateAttendeeName(attendee: NameParts): string {
  const normalized = normalizeAttendeeNameFields(attendee)
  return formatAttendeeFullName(normalized, {
    commaBeforeExtension: false,
    extensionWithPeriod: true,
  })
}

/** Sample name shown in Certificate Template Editor preview */
export const CERTIFICATE_PREVIEW_ATTENDEE_NAME = "Joseph M. Baria Jr."
