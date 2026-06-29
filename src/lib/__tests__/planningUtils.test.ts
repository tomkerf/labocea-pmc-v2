import { describe, it, expect } from 'vitest'
import { shiftDateFin } from '../planningUtils'

describe('shiftDateFin', () => {
  it('retourne undefined si pas de dateFin (événement jour unique)', () => {
    expect(shiftDateFin('2026-06-29', '2026-07-03', undefined)).toBeUndefined()
  })

  it('décale dateFin du même nombre de jours que le début (préserve la durée)', () => {
    // début 29/06 → 03/07 = +4 jours ; fin 01/07 → 05/07
    expect(shiftDateFin('2026-06-29', '2026-07-03', '2026-07-01')).toBe('2026-07-05')
  })

  it('gère un décalage vers le passé', () => {
    // début 10/06 → 05/06 = -5 jours ; fin 12/06 → 07/06
    expect(shiftDateFin('2026-06-10', '2026-06-05', '2026-06-12')).toBe('2026-06-07')
  })

  it('gère le passage de mois', () => {
    // +3 jours : fin 30/06 → 03/07
    expect(shiftDateFin('2026-06-27', '2026-06-30', '2026-06-30')).toBe('2026-07-03')
  })

  it('conserve dateFin == date pour un événement multi-jours d\'un seul jour de durée', () => {
    expect(shiftDateFin('2026-06-29', '2026-06-29', '2026-06-29')).toBe('2026-06-29')
  })
})
