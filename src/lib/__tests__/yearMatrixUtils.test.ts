import { describe, it, expect, vi, afterEach } from 'vitest'
import { getStatusColor, getStatusLabel, getStatusIcon } from '../yearMatrixUtils'
import { COLORS } from '@/lib/constants'
import type { Sampling } from '@/types'

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

describe('getStatusColor', () => {
  it('transparent quand pas de prélèvement', () => {
    expect(getStatusColor(null, 2026)).toBe('transparent')
  })
  it('succès quand fait', () => {
    expect(getStatusColor(makeSampling({ status: 'done' }), 2026)).toBe(COLORS.SUCCESS)
  })
  it('neutre quand non effectué', () => {
    expect(getStatusColor(makeSampling({ status: 'non_effectue' }), 2026)).toBe('var(--color-neutral)')
  })
  it('danger quand en retard', () => {
    // planned dans un plan de l'année passée → deadline dépassée
    const s = makeSampling({ status: 'planned', plannedMonth: 0, plannedDay: 15 })
    expect(getStatusColor(s, 2020)).toBe(COLORS.DANGER)
  })
  it('warning quand planifié non échu', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1)) // 1er janvier
    const s = makeSampling({ status: 'planned', plannedMonth: 5, plannedDay: 15 }) // juin, futur
    expect(getStatusColor(s, 2026)).toBe(COLORS.WARNING)
  })
})

describe('getStatusLabel', () => {
  it('vide quand pas de prélèvement', () => {
    expect(getStatusLabel(null, 2026)).toBe('')
  })
  it('libellés des statuts terminaux', () => {
    expect(getStatusLabel(makeSampling({ status: 'done' }), 2026)).toBe('Fait')
    expect(getStatusLabel(makeSampling({ status: 'non_effectue' }), 2026)).toBe('Non fait')
  })
  it('"En retard" quand échu', () => {
    const s = makeSampling({ status: 'planned', plannedMonth: 0, plannedDay: 15 })
    expect(getStatusLabel(s, 2020)).toBe('En retard')
  })
  it('"Planifié" quand à venir', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
    const s = makeSampling({ status: 'planned', plannedMonth: 5, plannedDay: 15 })
    expect(getStatusLabel(s, 2026)).toBe('Planifié')
  })
})

describe('getStatusIcon', () => {
  it('✓ quand fait', () => {
    expect(getStatusIcon(makeSampling({ status: 'done' }), 2026)).toBe('✓')
  })
  it('✕ quand non effectué', () => {
    expect(getStatusIcon(makeSampling({ status: 'non_effectue' }), 2026)).toBe('✕')
  })
  it('! quand en retard', () => {
    const s = makeSampling({ status: 'planned', plannedMonth: 0, plannedDay: 15 })
    expect(getStatusIcon(s, 2020)).toBe('!')
  })
  it('vide quand planifié à venir', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
    const s = makeSampling({ status: 'planned', plannedMonth: 5, plannedDay: 15 })
    expect(getStatusIcon(s, 2026)).toBe('')
  })
})
