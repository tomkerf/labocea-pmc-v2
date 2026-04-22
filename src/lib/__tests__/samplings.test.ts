import { describe, it, expect } from 'vitest'
import { generateSamplings } from '../samplings'
import type { Plan } from '@/types'

// Plan minimal réutilisable dans les tests
function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    nom: 'Plan test',
    siteNom: 'Site A',
    frequence: 'Mensuel',
    meteo: '',
    nature: 'Rivière',
    methode: 'Ponctuel',
    lat: '',
    lng: '',
    gpsApprox: false,
    customMonths: [],
    bimensuelMonths: [],
    defaultDay: 15,
    customDays: {},
    samplings: [],
    ...overrides,
  }
}

// ─── generateSamplings ────────────────────────────────────────

describe('generateSamplings', () => {

  describe('Personnalisé', () => {
    it('retourne [] — les prélèvements sont saisis manuellement', () => {
      const result = generateSamplings(makePlan({ frequence: 'Personnalisé' }))
      expect(result).toHaveLength(0)
    })
  })

  describe('Mensuel', () => {
    it('génère 12 prélèvements, un par mois', () => {
      const result = generateSamplings(makePlan({ frequence: 'Mensuel' }))
      expect(result).toHaveLength(12)
    })

    it('les mois vont de 0 (jan) à 11 (déc)', () => {
      const result = generateSamplings(makePlan({ frequence: 'Mensuel' }))
      const months = result.map((s) => s.plannedMonth)
      expect(months).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    })

    it('utilise defaultDay si customDays est vide', () => {
      const result = generateSamplings(makePlan({ frequence: 'Mensuel', defaultDay: 10 }))
      expect(result.every((s) => s.plannedDay === 10)).toBe(true)
    })

    it('utilise customDays pour les mois concernés', () => {
      const result = generateSamplings(makePlan({
        frequence: 'Mensuel',
        defaultDay: 15,
        customDays: { '2': 5, '7': 20 },
      }))
      // Mars (index 2) → jour 5, Août (index 7) → jour 20, reste → 15
      expect(result[2].plannedDay).toBe(5)
      expect(result[7].plannedDay).toBe(20)
      expect(result[0].plannedDay).toBe(15)
    })

    it('les numéros de prélèvement (num) sont consécutifs à partir de 1', () => {
      const result = generateSamplings(makePlan({ frequence: 'Mensuel' }))
      const nums = result.map((s) => s.num)
      expect(nums).toEqual(Array.from({ length: 12 }, (_, i) => i + 1))
    })

    it('chaque prélèvement a le statut "planned"', () => {
      const result = generateSamplings(makePlan({ frequence: 'Mensuel' }))
      expect(result.every((s) => s.status === 'planned')).toBe(true)
    })

    it('chaque prélèvement a un id unique', () => {
      const result = generateSamplings(makePlan({ frequence: 'Mensuel' }))
      const ids = new Set(result.map((s) => s.id))
      expect(ids.size).toBe(12)
    })
  })

  describe('Mensuel avec customMonths', () => {
    it('utilise les mois personnalisés au lieu des 12 mois par défaut', () => {
      const result = generateSamplings(makePlan({
        frequence: 'Mensuel',
        customMonths: [1, 4, 10], // fév, mai, nov
        defaultDay: 15,
      }))
      expect(result).toHaveLength(3)
      expect(result.map((s) => s.plannedMonth)).toEqual([1, 4, 10])
    })
  })

  describe('Bimensuel', () => {
    it('génère 24 prélèvements (2 par mois × 12 mois)', () => {
      const result = generateSamplings(makePlan({ frequence: 'Bimensuel' }))
      expect(result).toHaveLength(24)
    })

    it('plannedDay = 0 pour tous (jour non fixé)', () => {
      const result = generateSamplings(makePlan({ frequence: 'Bimensuel' }))
      expect(result.every((s) => s.plannedDay === 0)).toBe(true)
    })

    it('chaque mois apparaît exactement 2 fois', () => {
      const result = generateSamplings(makePlan({ frequence: 'Bimensuel' }))
      for (let m = 0; m < 12; m++) {
        const count = result.filter((s) => s.plannedMonth === m).length
        expect(count, `Mois ${m} devrait apparaître 2 fois`).toBe(2)
      }
    })

    it('les numéros sont de 1 à 24', () => {
      const result = generateSamplings(makePlan({ frequence: 'Bimensuel' }))
      const nums = result.map((s) => s.num)
      expect(nums).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
    })
  })

  describe('Trimestriel', () => {
    it('génère 4 prélèvements aux mois 0, 3, 6, 9', () => {
      const result = generateSamplings(makePlan({ frequence: 'Trimestriel' }))
      expect(result).toHaveLength(4)
      expect(result.map((s) => s.plannedMonth)).toEqual([0, 3, 6, 9])
    })
  })

  describe('Semestriel', () => {
    it('génère 2 prélèvements aux mois 0 et 6', () => {
      const result = generateSamplings(makePlan({ frequence: 'Semestriel' }))
      expect(result).toHaveLength(2)
      expect(result.map((s) => s.plannedMonth)).toEqual([0, 6])
    })
  })

  describe('Annuel', () => {
    it('génère 1 prélèvement au mois défini par customMonths[0]', () => {
      const result = generateSamplings(makePlan({ frequence: 'Annuel', customMonths: [8] }))
      expect(result).toHaveLength(1)
      expect(result[0].plannedMonth).toBe(8)
    })

    it('utilise le mois 0 par défaut si customMonths est vide', () => {
      const result = generateSamplings(makePlan({ frequence: 'Annuel', customMonths: [] }))
      expect(result).toHaveLength(1)
      expect(result[0].plannedMonth).toBe(0)
    })

    it('ignore les mois suivants dans customMonths (prend uniquement [0])', () => {
      const result = generateSamplings(makePlan({ frequence: 'Annuel', customMonths: [3, 7, 11] }))
      expect(result).toHaveLength(1)
      expect(result[0].plannedMonth).toBe(3)
    })
  })

  describe('Champs par défaut', () => {
    it('doneDate, comment, nappe sont vides', () => {
      const result = generateSamplings(makePlan({ frequence: 'Semestriel' }))
      for (const s of result) {
        expect(s.doneDate).toBe('')
        expect(s.comment).toBe('')
        expect(s.nappe).toBe('')
      }
    })

    it('rapportPrevu = false, tente = false, doneBy = ""', () => {
      const result = generateSamplings(makePlan({ frequence: 'Semestriel' }))
      for (const s of result) {
        expect(s.rapportPrevu).toBe(false)
        expect(s.tente).toBe(false)
        expect(s.doneBy).toBe('')
      }
    })

    it('reportHistory est un tableau vide', () => {
      const result = generateSamplings(makePlan({ frequence: 'Semestriel' }))
      for (const s of result) {
        expect(Array.isArray(s.reportHistory)).toBe(true)
        expect(s.reportHistory).toHaveLength(0)
      }
    })
  })
})
