/** Parsea etiquetas desde una query Gmail (label:X o {label:A OR label:B}). */
export function parseGmailLabels(query: string | null | undefined): string[] {
  if (!query?.trim()) return []
  const labels: string[] = []
  const seen = new Set<string>()
  const re = /label:(?:"([^"]+)"|([^\s}\)]+))/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(query)) !== null) {
    const label = (match[1] || match[2] || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}

export function normalizeLabelName(raw: string): string {
  let value = raw.trim()
  if (value.toLowerCase().startsWith('label:')) {
    value = value.slice(6).trim()
  }
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    value = value.slice(1, -1).trim()
  }
  return value
}

export function buildGmailQueryFromLabels(labels: string[]): string {
  const cleaned: string[] = []
  const seen = new Set<string>()
  for (const item of labels) {
    const label = normalizeLabelName(item)
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(label)
  }
  if (!cleaned.length) return ''
  if (cleaned.length === 1) {
    const label = cleaned[0]
    return label.includes(' ') ? `label:"${label}"` : `label:${label}`
  }
  const parts = cleaned.map((label) =>
    label.includes(' ') ? `label:"${label}"` : `label:${label}`,
  )
  return `{${parts.join(' OR ')}}`
}
