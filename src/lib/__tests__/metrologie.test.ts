import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { calcStatut, useMetrologieRows } from '@/hooks/useMetrologieRows'
import type { Verification, Equipement } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function futureDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function pastDate(days: number): string {
  return futureDate(-days)
}

function makeVerif(overrides: Partial<Verification> = {}): Verification {
  return {
    id: 'v1',
    equipementId: 'eq1',
    equipementNom: 'YSI Pro30',
    type: 'etalonnage_interne',
    date: '2026-01-01',
    resultat: 'conforme',
    remarques: '',
    prochainControle: futureDate(60),
    technicienUid: 'uid1',
    technicienNom: 'Tom',
    documentUrl: '',
    createdAt: new Date(),
    ...overrides,
  }
}

function makeEquipement(overrides: Partial<Equipement> = {}): Equipement {
  return {
    id: 'eq2',
    nom: 'Turbidimètre',
    marque: 'HACH',
    modele: 'TL2300',
    numSerie: 'SN001',
    categorie: 'turbidimetre',
    dateAcquisition: '2024-01-01',
    etat: 'operationnel',
    localisation: 'labo',
    notes: '',
    prochainEtalonnage: futureDate(60),
    createdBy: 'uid1',
    updatedAt: new Date(),
    ...overrides,
  }
}

// ─── calcStatut ───────────────────────────────────────────────────────────────

describe('calcStatut', () => {
  it('retourne "none" si pas de date', () => {
    expect(calcStatut('').key).toBe('none')
  })

  it('retourne "late" si la date est dépassée', () => {
    expect(calcStatut(pastDate(1)).key).toBe('late')
  })

  it('retourne "soon" si la date est dans moins de 30 jours', () => {
    expect(calcStatut(futureDate(15)).key).toBe('soon')
  })

  it('retourne "ok" si la date est dans plus de 30 jours', () => {
    expect(calcStatut(futureDate(60)).key).toBe('ok')
  })

  it('retourne "late" avec le bon label et les bonnes couleurs', () => {
    const s = calcStatut(pastDate(5))
    expect(s.label).toBe('En retard')
    expect(s.bg).toContain('danger')
  })

  it('retourne "soon" avec le bon label', () => {
    expect(calcStatut(futureDate(10)).label).toBe('À prévoir')
  })

  it('retourne "ok" avec le bon label', () => {
    expect(calcStatut(futureDate(45)).label).toBe('À jour')
  })
})

// ─── useMetrologieRows ────────────────────────────────────────────────────────

describe('useMetrologieRows', () => {
  it('inclut les vérifications dans allRows', () => {
    const verif = makeVerif()
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [verif], equipements: [], filterStatut: '' })
    )
    expect(result.current.allRows).toHaveLength(1)
    expect(result.current.allRows[0].kind).toBe('verification')
  })

  it('inclut les équipements sans vérification dans allRows', () => {
    const eq = makeEquipement({ id: 'eq-orphan', nom: 'Orphelin' })
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [], equipements: [eq], filterStatut: '' })
    )
    expect(result.current.allRows).toHaveLength(1)
    expect(result.current.allRows[0].kind).toBe('equipement')
  })

  it('exclut les équipements qui ont déjà une vérification (par equipementId)', () => {
    const verif = makeVerif({ equipementId: 'eq1' })
    const eq = makeEquipement({ id: 'eq1' })
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [verif], equipements: [eq], filterStatut: '' })
    )
    // eq1 a une verif → pas doublon
    expect(result.current.allRows).toHaveLength(1)
  })

  it('trie late avant soon avant ok', () => {
    const late = makeVerif({ id: 'v-late', prochainControle: pastDate(5) })
    const soon = makeVerif({ id: 'v-soon', prochainControle: futureDate(10) })
    const ok   = makeVerif({ id: 'v-ok',   prochainControle: futureDate(60) })
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [ok, soon, late], equipements: [], filterStatut: '' })
    )
    const ids = result.current.allRows.map(r => r.data.id)
    expect(ids).toEqual(['v-late', 'v-soon', 'v-ok'])
  })

  it('filtre par statut', () => {
    const late = makeVerif({ id: 'v-late', prochainControle: pastDate(5) })
    const ok   = makeVerif({ id: 'v-ok',   prochainControle: futureDate(60) })
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [late, ok], equipements: [], filterStatut: 'late' })
    )
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].data.id).toBe('v-late')
  })

  it('sans filtre, filtered === allRows', () => {
    const verif = makeVerif()
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [verif], equipements: [], filterStatut: '' })
    )
    expect(result.current.filtered).toHaveLength(result.current.allRows.length)
  })

  it('compte correctement lateCount', () => {
    const late1 = makeVerif({ id: 'v1', prochainControle: pastDate(1) })
    const late2 = makeVerif({ id: 'v2', prochainControle: pastDate(10) })
    const ok    = makeVerif({ id: 'v3', prochainControle: futureDate(60) })
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [late1, late2, ok], equipements: [], filterStatut: '' })
    )
    expect(result.current.lateCount).toBe(2)
  })

  it('lateCount = 0 si aucun en retard', () => {
    const verif = makeVerif({ prochainControle: futureDate(60) })
    const { result } = renderHook(() =>
      useMetrologieRows({ verifications: [verif], equipements: [], filterStatut: '' })
    )
    expect(result.current.lateCount).toBe(0)
  })
})
