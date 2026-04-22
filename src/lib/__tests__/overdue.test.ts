import { describe, it, expect, vi, afterEach } from 'vitest'
import { isSamplingOverdue } from '../overdue'
import type { Sampling } from '@/types'

// Prélèvement minimal
function makeSampling(overrides: Partial<Sampling> = {}): Sampling {
  return {
    id: 's1',
    num: 1,
    plannedMonth: 0,
    plannedDay: 15,
    status: 'planned',
    doneDate: '',
    comment: '',
    nappe: '',
    rapportPrevu: false,
    rapportDate: '',
    tente: false,
    reportHistory: [],
    doneBy: '',
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

// ─── isSamplingOverdue ────────────────────────────────────────

describe('isSamplingOverdue', () => {

  describe('Statut "overdue"', () => {
    it('retourne true si status = "overdue", quel que soit le reste', () => {
      const s = makeSampling({ status: 'overdue', plannedMonth: 11, plannedDay: 31 })
      expect(isSamplingOverdue(s)).toBe(true)
    })
  })

  describe('Statuts terminaux', () => {
    it('retourne false pour status = "done"', () => {
      const s = makeSampling({ status: 'done', plannedMonth: 0, plannedDay: 1 })
      expect(isSamplingOverdue(s)).toBe(false)
    })

    it('retourne false pour status = "non_effectue"', () => {
      const s = makeSampling({ status: 'non_effectue', plannedMonth: 0, plannedDay: 1 })
      expect(isSamplingOverdue(s)).toBe(false)
    })
  })

  describe('Status "planned" avec jour fixé (plannedDay > 0)', () => {
    it('retourne false si la date limite n\'est pas encore dépassée', () => {
      // On fixe "maintenant" au 10 janvier 2026 — deadline = 15 jan 2026 23:59:59
      vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0))
      const s = makeSampling({ plannedMonth: 0, plannedDay: 15 })
      expect(isSamplingOverdue(s, 2026)).toBe(false)
    })

    it('retourne false exactement à la deadline (même journée 23:59)', () => {
      vi.setSystemTime(new Date(2026, 0, 15, 23, 59, 59))
      const s = makeSampling({ plannedMonth: 0, plannedDay: 15 })
      expect(isSamplingOverdue(s, 2026)).toBe(false)
    })

    it('retourne true si la deadline est dépassée (lendemain)', () => {
      vi.setSystemTime(new Date(2026, 0, 16, 0, 0, 1))
      const s = makeSampling({ plannedMonth: 0, plannedDay: 15 })
      expect(isSamplingOverdue(s, 2026)).toBe(true)
    })

    it('retourne true pour un prélèvement de l\'an passé', () => {
      vi.setSystemTime(new Date(2026, 3, 22)) // aujourd'hui = 22 avril 2026
      const s = makeSampling({ plannedMonth: 5, plannedDay: 10 }) // juin
      expect(isSamplingOverdue(s, 2025)).toBe(true) // juin 2025 → dépassé
    })
  })

  describe('Status "planned" sans jour fixé (plannedDay = 0)', () => {
    it('retourne false si on est encore dans le mois', () => {
      vi.setSystemTime(new Date(2026, 2, 15)) // 15 mars 2026
      const s = makeSampling({ plannedMonth: 2, plannedDay: 0 }) // mars
      expect(isSamplingOverdue(s, 2026)).toBe(false)
    })

    it('retourne false le dernier jour du mois', () => {
      vi.setSystemTime(new Date(2026, 2, 31, 23, 59, 59)) // 31 mars 23:59:59
      const s = makeSampling({ plannedMonth: 2, plannedDay: 0 })
      expect(isSamplingOverdue(s, 2026)).toBe(false)
    })

    it('retourne true dès le 1er du mois suivant', () => {
      vi.setSystemTime(new Date(2026, 3, 1, 0, 0, 1)) // 1er avril 00:00:01
      const s = makeSampling({ plannedMonth: 2, plannedDay: 0 }) // mars
      expect(isSamplingOverdue(s, 2026)).toBe(true)
    })

    it('gère correctement février en année non bissextile', () => {
      vi.setSystemTime(new Date(2026, 2, 1)) // 1er mars 2026 (2026 non bissextile)
      const s = makeSampling({ plannedMonth: 1, plannedDay: 0 }) // février
      expect(isSamplingOverdue(s, 2026)).toBe(true) // fév 2026 = 28 jours → dépassé le 1er mars
    })

    it('gère correctement décembre (mois 11)', () => {
      vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59)) // 31 déc
      const s = makeSampling({ plannedMonth: 11, plannedDay: 0 })
      expect(isSamplingOverdue(s, 2026)).toBe(false)
    })
  })

  describe('Paramètre year', () => {
    it('utilise l\'année courante si year est omis', () => {
      // Simule le 20 juin 2026 — un prélèvement planifié en mars (sans year) doit être en retard
      vi.setSystemTime(new Date(2026, 5, 20))
      const s = makeSampling({ plannedMonth: 2, plannedDay: 10 }) // mars 10
      // Sans paramètre year → utilise 2026 → mars 2026 dépassé
      expect(isSamplingOverdue(s)).toBe(true)
    })

    it('ne marque pas en retard un plan futur avec year = 2027', () => {
      vi.setSystemTime(new Date(2026, 5, 20)) // juin 2026
      const s = makeSampling({ plannedMonth: 2, plannedDay: 10 }) // mars
      // Avec year 2027 → mars 2027 pas encore arrivé
      expect(isSamplingOverdue(s, 2027)).toBe(false)
    })

    it('évite les faux positifs sur les plans d\'années passées', () => {
      vi.setSystemTime(new Date(2026, 0, 1))
      const s = makeSampling({ plannedMonth: 6, plannedDay: 15, status: 'planned' })
      // Plan de l'année courante 2026, juillet 2026 → pas encore dépassé en janvier
      expect(isSamplingOverdue(s, 2026)).toBe(false)
    })
  })
})
