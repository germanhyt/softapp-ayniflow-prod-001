import type { OcrExtractResult } from '../../domain/models/finance.types'

const BANK_KEYWORDS = ['YAPE', 'PLIN', 'BCP', 'BBVA', 'INTERBANK', 'SCOTIABANK', 'BANBIF'] as const

export function parseVoucherText(text: string): OcrExtractResult {
  const normalized = text.replace(/\r/g, '\n')
  const upper = normalized.toUpperCase()

  const amountMatch =
    normalized.match(/S\/\s*\.?\s*([\d,]+(?:\.\d{1,2})?)/i) ??
    normalized.match(/(?:MONTO|TOTAL|PEN)\s*[:.]?\s*([\d,]+(?:\.\d{1,2})?)/i)

  const dateMatch = normalized.match(/(\d{2})[/-](\d{2})[/-](\d{4})/)
  const timeMatch = normalized.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/)

  const banco = BANK_KEYWORDS.find((bank) => upper.includes(bank)) ?? null

  let movimiento = 'Egreso'
  if (/RECIBIST|INGRES|ABONO|COBR|DEP[OÓ]SIT|TE ENVI/i.test(normalized)) {
    movimiento = 'Ingreso'
  }
  if (/ENVIAST|PAGAST|EGRES|TRANSFERISTE|PAGO A|PAGASTE/i.test(normalized)) {
    movimiento = 'Egreso'
  }

  const opMatch =
    normalized.match(
      /(?:N[°º]?\s*(?:OPER|OP|Operaci[oó]n|de operaci[oó]n)|C[OÓ]DIGO|ID)\s*[:.]?\s*([A-Z0-9-]{6,})/i,
    ) ?? normalized.match(/\b([A-Z0-9]{10,24})\b/)

  const destMatch = normalized.match(/(?:PARA|DESTINATARIO|A)\s*[:.]?\s*([^\n]{3,48})/i)

  let tipo: string | null = null
  if (upper.includes('QR')) tipo = 'PAGO QR'
  else if (upper.includes('YAPE')) tipo = 'YAPEO CELULAR'
  else if (/TRANSFER/i.test(normalized)) tipo = 'TRANSFERENCIA'

  const montoRaw = amountMatch?.[1]?.replace(',', '')
  const monto = montoRaw ? Number.parseFloat(montoRaw) : null

  return {
    fecha: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null,
    hora: timeMatch?.[1] ?? null,
    movimiento,
    banco,
    tipo,
    destinatario: destMatch?.[1]?.trim().replace(/\s{2,}/g, ' ') ?? null,
    monto: monto != null && !Number.isNaN(monto) ? monto : null,
    num_operacion: opMatch?.[1] ?? null,
    concepto: null,
  }
}

function hasUsefulFields(result: OcrExtractResult): boolean {
  return Boolean(result.monto || result.num_operacion || result.fecha || result.destinatario)
}

export async function extractVoucherLocally(file: File): Promise<OcrExtractResult> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa')
  try {
    const {
      data: { text },
    } = await worker.recognize(file)
    const parsed = parseVoucherText(text)
    if (!hasUsefulFields(parsed)) {
      throw new Error('No se detectaron datos útiles en la imagen')
    }
    return parsed
  } finally {
    await worker.terminate()
  }
}

export async function extractVoucherImage(
  file: File,
  options: {
    geminiEnabled: boolean
    extractRemote: (file: File) => Promise<OcrExtractResult>
  },
): Promise<{ data: OcrExtractResult; source: 'gemini' | 'browser' }> {
  if (options.geminiEnabled) {
    const data = await options.extractRemote(file)
    return { data, source: 'gemini' }
  }
  const data = await extractVoucherLocally(file)
  return { data, source: 'browser' }
}
