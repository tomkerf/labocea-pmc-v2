import { describe, it, expect } from 'vitest'
import { parseBilansCsv } from '../parseBilansCsv'

describe('parseBilansCsv', () => {
  it('parse un CSV valide avec en-tête', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,2026-01-05,12.4,1200
STEP Brest,2026-02-10,8,950`
    const { rows, errors } = parseBilansCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ point: 'STEP Quimper', bilan: { date: '2026-01-05', pluieMm: 12.4, volumeM3: 1200 } })
  })

  it('détecte le séparateur point-virgule et le décimal virgule', () => {
    const csv = `point;date;pluie_mm;volume_m3
STEP Quimper;2026-01-05;12,4;1200`
    const { rows, errors } = parseBilansCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows[0].bilan.pluieMm).toBe(12.4)
  })

  it('ignore les lignes vides', () => {
    const csv = `point,date,pluie_mm,volume_m3

STEP Quimper,2026-01-05,12,1200

`
    const { rows } = parseBilansCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('signale une date invalide avec le numéro de ligne', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,05/01/2026,12,1200`
    const { rows, errors } = parseBilansCsv(csv)
    expect(rows).toHaveLength(0)
    expect(errors[0].line).toBe(2)
    expect(errors[0].message).toMatch(/date/i)
  })

  it('signale un nombre non numérique', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,2026-01-05,douze,1200`
    const { errors } = parseBilansCsv(csv)
    expect(errors[0].message).toMatch(/pluie/i)
  })

  it('signale les colonnes manquantes', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,2026-01-05`
    const { errors } = parseBilansCsv(csv)
    expect(errors[0].message).toMatch(/colonnes/i)
  })

  it('fonctionne sans ligne d\'en-tête', () => {
    const csv = `STEP Quimper,2026-01-05,12,1200`
    const { rows, errors } = parseBilansCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(1)
  })
})
