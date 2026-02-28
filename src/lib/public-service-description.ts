export function sanitizePublicServiceDescription(description?: string | null): string {
  if (!description) return ""

  const cleanedSegments = description
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !/^(type|tags)\s*:/i.test(segment))

  return cleanedSegments.join(" | ")
}

