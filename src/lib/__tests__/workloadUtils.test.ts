import { describe, it, expect } from 'vitest'
import {
  getSamplingPoints,
  formatPoints,
  METHOD_POINTS,
  POINTS_SOUTERRAINE,
} from '../workloadUtils'
import type { Plan } from '@/types'

function makePlan(overrides: Partial<Pick<Plan, 'nature' | 'methode'>> = {}): Pick<Plan, 'nature' | 'methode'> {
  return {
    nature: 'Eau usée',
    methode: 'Ponctuel',
    ...overrides,
  }
}

describe('getSamplingPoints', () => {
  it('4 points pour un Bilan 24h (Automatique)', () => {
    expect(getSamplingPoints(makePlan({ methode: 'Automatique' }))).toBe(4)
  })
  it('4 points pour un Composite', () => {
    expect(getSamplingPoints(makePlan({ methode: 'Composite' }))).toBe(4)
  })
  it('1 point pour un Ponctuel', () => {
    expect(getSamplingPoints(makePlan({ methode: 'Ponctuel' }))).toBe(1)
  })
  it('2 points pour une eau souterraine, quelle que soit la méthode', () => {
    expect(getSamplingPoints(makePlan({ nature: 'Souterraine', methode: 'Ponctuel' }))).toBe(POINTS_SOUTERRAINE)
    expect(getSamplingPoints(makePlan({ nature: 'Souterraine', methode: 'Composite' }))).toBe(POINTS_SOUTERRAINE)
    expect(getSamplingPoints(makePlan({ nature: 'Souterraine', methode: 'Automatique' }))).toBe(POINTS_SOUTERRAINE)
  })
  it('les natures non souterraines suivent les points de la méthode', () => {
    expect(getSamplingPoints(makePlan({ nature: 'Rivière', methode: 'Automatique' }))).toBe(4)
    expect(getSamplingPoints(makePlan({ nature: 'Eau usée', methode: 'Ponctuel' }))).toBe(1)
  })
  it('fallback Ponctuel quand la méthode est absente ou inconnue', () => {
    const plan = makePlan({ methode: '' as Plan['methode'] })
    expect(getSamplingPoints(plan)).toBe(METHOD_POINTS.Ponctuel)
  })
})

describe('formatPoints', () => {
  it('0 pt quand zéro', () => {
    expect(formatPoints(0)).toBe('0 pt')
  })
  it('pt au singulier pour 1', () => {
    expect(formatPoints(1)).toBe('1 pt')
  })
  it('pts au pluriel pour > 1', () => {
    expect(formatPoints(2)).toBe('2 pts')
    expect(formatPoints(35)).toBe('35 pts')
  })
})

