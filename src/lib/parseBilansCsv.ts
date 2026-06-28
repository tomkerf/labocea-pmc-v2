import type { BilanRejet } from '@/types'

export interface ParsedBilanRow {
  point: string
  bilan: BilanRejet
}

export interface CsvParseError {
  line: number
  message: string
}

export interface CsvParseResult {
  rows: ParsedBilanRow[]
  errors: CsvParseError[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Format attendu : `point,date,pluie_mm,volume_m3`.
 * Séparateur `,` ou `;` (détecté). Décimale `.` ou `,`.
 * L'en-tête est détecté et ignoré s'il est présent.
 */
export function parseBilansCsv(text: string): CsvParseResult {
  const rows: ParsedBilanRow[] = []
  const errors: CsvParseError[] = []
  const rawLines = text.split(/\r?\n/)
  const firstNonEmpty = rawLines.find(l => l.trim() !== '') ?? ''
  const sep = firstNonEmpty.includes(';') ? ';' : ','

  let headerSkipped = false
  rawLines.forEach((raw, idx) => {
    const lineNo = idx + 1
    const line = raw.trim()
    if (line === '') return

    const cols = line.split(sep).map(c => c.trim())

    if (!headerSkipped && /point/i.test(cols[0]) && cols.some(c => /volume/i.test(c))) {
      headerSkipped = true
      return
    }
    headerSkipped = true

    if (cols.length < 4) {
      errors.push({ line: lineNo, message: 'colonnes manquantes (4 attendues)' })
      return
    }

    const [point, date, pluieStr, volStr] = cols
    if (!point) {
      errors.push({ line: lineNo, message: 'nom de point vide' })
      return
    }
    if (!DATE_RE.test(date)) {
      errors.push({ line: lineNo, message: 'date invalide (format YYYY-MM-DD attendu)' })
      return
    }
    const pluieMm = Number(pluieStr.replace(',', '.'))
    const volumeM3 = Number(volStr.replace(',', '.'))
    if (!Number.isFinite(pluieMm)) {
      errors.push({ line: lineNo, message: 'pluie_mm non numérique' })
      return
    }
    if (!Number.isFinite(volumeM3)) {
      errors.push({ line: lineNo, message: 'volume_m3 non numérique' })
      return
    }

    rows.push({ point, bilan: { date, pluieMm, volumeM3 } })
  })

  return { rows, errors }
}
