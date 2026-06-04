type NameParts = {
  personal_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  name_extension?: string | null
}

type FormatOptions = {
  uppercase?: boolean
}

function applyCase(value: string, uppercase?: boolean): string {
  return uppercase ? value.toUpperCase() : value
}

/** Middle name: period only for single-letter initials (e.g. M → M.). */
export function formatMiddleName(
  middle?: string | null,
  options: FormatOptions = {}
): string {
  if (!middle?.trim()) return ""

  const trimmed = middle.trim()
  const isInitial = /^[A-Za-z]\.?$/.test(trimmed)

  if (isInitial) {
    return applyCase(`${trimmed[0]}.`, options.uppercase)
  }

  return applyCase(trimmed, options.uppercase)
}

/** Last name and extension: comma before extension when present (e.g. Cruz, Jr.). */
export function formatLastNameWithExtension(
  last?: string | null,
  extension?: string | null,
  options: FormatOptions = {}
): string {
  const lastPart = last?.trim()
  const extPart = extension?.trim()

  if (!lastPart) {
    return extPart ? applyCase(extPart, options.uppercase) : ""
  }

  const formattedLast = applyCase(lastPart, options.uppercase)
  if (!extPart) return formattedLast

  const formattedExt = applyCase(extPart, options.uppercase)
  return `${formattedLast}, ${formattedExt}`
}

export function formatAttendeeFullName(
  attendee: NameParts,
  options: FormatOptions = {}
): string {
  const parts: string[] = []

  const first = attendee.personal_name?.trim()
  if (first) parts.push(applyCase(first, options.uppercase))

  const middle = formatMiddleName(attendee.middle_name, options)
  if (middle) parts.push(middle)

  const lastWithExt = formatLastNameWithExtension(
    attendee.last_name,
    attendee.name_extension,
    options
  )
  if (lastWithExt) parts.push(lastWithExt)

  return parts.join(" ")
}
