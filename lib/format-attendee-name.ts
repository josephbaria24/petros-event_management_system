type NameParts = {
  personal_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  name_extension?: string | null
}

export type { NameParts }

type FormatOptions = {
  uppercase?: boolean
  /** When false, extension follows last name with a space (e.g. Baria Jr). Default: comma (Baria, Jr). */
  commaBeforeExtension?: boolean
  /** Append period to Jr./Sr. suffixes (e.g. Jr.). Roman numerals (II, III) are unchanged. */
  extensionWithPeriod?: boolean
}

const NAME_EXTENSION_PATTERN = /^(jr|sr|ii|iii|iv|v)\.?$/i

function toTitleCaseWord(word: string): string {
  if (!word) return ""
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/** Title-case each word; supports hyphenated names (e.g. mary-jane → Mary-Jane). */
export function toTitleCaseName(value?: string | null): string {
  if (!value?.trim()) return ""
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.split("-").map(toTitleCaseWord).join("-"))
    .join(" ")
}

function normalizeNameExtension(extension?: string | null): string {
  if (!extension?.trim()) return ""
  const cleaned = extension.trim().replace(/\.$/, "")
  const lower = cleaned.toLowerCase()
  if (["ii", "iii", "iv", "v"].includes(lower)) return lower.toUpperCase()
  if (lower === "jr") return "Jr"
  if (lower === "sr") return "Sr"
  return toTitleCaseName(cleaned)
}

function isNameExtension(value: string): boolean {
  return NAME_EXTENSION_PATTERN.test(value.trim().replace(/\.$/, ""))
}

/** Pull Jr/Sr/II/etc. off the end of last_name when not in name_extension column. */
export function splitLastNameAndExtension(lastName?: string | null): {
  last_name: string
  name_extension: string | null
} {
  if (!lastName?.trim()) return { last_name: "", name_extension: null }

  let last = lastName.trim()

  if (last.includes(",")) {
    const [lastPart, extPart] = last.split(",").map((s) => s.trim())
    if (lastPart && extPart && isNameExtension(extPart)) {
      return {
        last_name: lastPart,
        name_extension: normalizeNameExtension(extPart),
      }
    }
  }

  const parts = last.split(/\s+/)
  if (parts.length >= 2 && isNameExtension(parts[parts.length - 1])) {
    return {
      last_name: parts.slice(0, -1).join(" "),
      name_extension: normalizeNameExtension(parts[parts.length - 1]),
    }
  }

  return { last_name: last, name_extension: null }
}

/** Normalize imported/manual name fields (title case, initials, extensions). */
export function normalizeAttendeeNameFields(row: NameParts): {
  personal_name: string
  middle_name: string | null
  last_name: string
  name_extension: string | null
} {
  let personal_name = row.personal_name?.trim() || ""
  let middle_name = row.middle_name?.trim() || ""
  let name_extension = row.name_extension?.trim() || ""

  const split = splitLastNameAndExtension(row.last_name)
  let last_name = split.last_name
  if (!name_extension && split.name_extension) {
    name_extension = split.name_extension
  }

  personal_name = toTitleCaseName(personal_name)
  last_name = toTitleCaseName(last_name)

  if (middle_name) {
    const trimmedMiddle = middle_name.trim()
    if (/^[A-Za-z]\.?$/.test(trimmedMiddle)) {
      middle_name = `${trimmedMiddle[0].toUpperCase()}.`
    } else {
      middle_name = toTitleCaseName(trimmedMiddle)
    }
  }

  name_extension = name_extension ? normalizeNameExtension(name_extension) : ""

  return {
    personal_name,
    middle_name: middle_name || null,
    last_name,
    name_extension: name_extension || null,
  }
}

function formatNameExtensionForDisplay(
  extension: string,
  options: FormatOptions = {}
): string {
  const normalized = normalizeNameExtension(extension)
  if (!normalized) return ""

  if (!options.extensionWithPeriod) {
    return applyCase(normalized, options.uppercase)
  }

  if (["II", "III", "IV", "V"].includes(normalized)) {
    return applyCase(normalized, options.uppercase)
  }

  const withPeriod = normalized.endsWith(".") ? normalized : `${normalized}.`
  return applyCase(withPeriod, options.uppercase)
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

/** Last name and extension (e.g. Cruz, Jr. or Cruz Jr). */
export function formatLastNameWithExtension(
  last?: string | null,
  extension?: string | null,
  options: FormatOptions = {}
): string {
  const lastPart = last?.trim()
  const extPart = extension?.trim()
  const useComma = options.commaBeforeExtension !== false

  if (!lastPart) {
    return extPart ? formatNameExtensionForDisplay(extPart, options) : ""
  }

  const formattedLast = applyCase(toTitleCaseName(lastPart), options.uppercase)
  if (!extPart) return formattedLast

  const formattedExt = formatNameExtensionForDisplay(extPart, options)
  return useComma ? `${formattedLast}, ${formattedExt}` : `${formattedLast} ${formattedExt}`
}

export function formatAttendeeFullName(
  attendee: NameParts,
  options: FormatOptions = {}
): string {
  const normalized = normalizeAttendeeNameFields(attendee)
  const parts: string[] = []

  if (normalized.personal_name) {
    parts.push(applyCase(normalized.personal_name, options.uppercase))
  }

  const middle = formatMiddleName(normalized.middle_name, options)
  if (middle) parts.push(middle)

  const lastWithExt = formatLastNameWithExtension(
    normalized.last_name,
    normalized.name_extension,
    options
  )
  if (lastWithExt) parts.push(lastWithExt)

  return parts.join(" ")
}
