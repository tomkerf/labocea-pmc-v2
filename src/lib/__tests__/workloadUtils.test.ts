import { describe, it, expect } from 'vitest'
import {
  getSamplingDurationHours,
  formatHours,
  DURATION_HOURS,
  DURATION_SOUTERRAINE_HOURS,
} from '../workloadUtils'
import type { Plan } from '@/types'

function makePlan(overrides: Partial<Pick<Plan, 'nature' | 'methode'>> = {}): Pick<Plan, 'nature' | 'methode'> {
  return {
    nature: 'Eau usée',
    methode: 'Ponctuel',
    ...overrides,
  }
}

describe('getSamplingDurationHours', () => {
  it('2h pour un Bilan 24h (Automatique)', () => {
    expect(getSamplingDurationHours(makePlan({ methode: 'Automatique' }))).toBe(2)
  })
  it('2h pour un Composite', () => {
    expect(getSamplingDurationHours(makePlan({ methode: 'Composite' }))).toBe(2)
  })
  it('15 min pour un Ponctuel', () => {
    expect(getSamplingDurationHours(makePlan({ methode: 'Ponctuel' }))).toBe(0.25)
  })
  it('1h pour une eau souterraine, quelle que soit la méthode', () => {
    expect(getSamplingDurationHours(makePlan({ nature: 'Souterraine', methode: 'Ponctuel' }))).toBe(DURATION_SOUTERRAINE_HOURS)
    expect(getSamplingDurationHours(makePlan({ nature: 'Souterraine', methode: 'Composite' }))).toBe(DURATION_SOUTERRAINE_HOURS)
    expect(getSamplingDurationHours(makePlan({ nature: 'Souterraine', methode: 'Automatique' }))).toBe(DURATION_SOUTERRAINE_HOURS)
  })
  it('les natures non souterraines suivent la durée de la méthode', () => {
    expect(getSamplingDurationHours(makePlan({ nature: 'Rivière', methode: 'Automatique' }))).toBe(2)
    expect(getSamplingDurationHours(makePlan({ nature: 'Eau usée', methode: 'Ponctuel' }))).toBe(0.25)
  })
  it('fallback Ponctuel quand la méthode est absente ou inconnue', () => {
    const plan = makePlan({ methode: '' as Plan['methode'] })
    expect(getSamplingDurationHours(plan)).toBe(DURATION_HOURS.Ponctuel)
  })
})

describe('formatHours', () => {
  it('0h quand zéro', () => {
    expect(formatHours(0)).toBe('0h')
  })
  it('minutes seules sous une heure', () => {
    expect(formatHours(0.25)).toBe('15min')
    expect(formatHours(0.5)).toBe('30min')
  })
  it('heures rondes sans minutes', () => {
    expect(formatHours(1)).toBe('1h')
    expect(formatHours(70)).toBe('70h')
  })
  it('heures et minutes combinées', () => {
    expect(formatHours(1.25)).toBe('1h15')
    expect(formatHours(3.5)).toBe('3h30')
  })
})
