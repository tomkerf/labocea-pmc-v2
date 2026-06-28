import { describe, it, expect } from 'vitest'
import { estimateVolume, nearestBilans } from '../estimationVolume'
import type { BilanRejet } from '@/types'

const b = (pluieMm: number, volumeM3: number, date = '2026-01-01'): BilanRejet => ({ date, pluieMm, volumeM3 })

describe('estimateVolume', () => {
  it('retourne null avec moins de 3 bilans', () => {
    expect(estimateVolume([b(5, 100), b(10, 200)], 8)).toBeNull()
  })

  it('estime sur une relation linéaire parfaite (volume = 50 + 10*pluie)', () => {
    const bilans = [b(0, 50), b(10, 150), b(20, 250), b(30, 350)]
    const r = estimateVolume(bilans, 15)!
    expect(r).not.toBeNull()
    expect(r.coef).toBeCloseTo(10, 5)
    expect(r.base).toBeCloseTo(50, 5)
    expect(r.volumeEstime).toBeCloseTo(200, 5)
    expect(r.r2).toBeCloseTo(1, 5)
    expect(r.warnings).toHaveLength(0)
  })

  it('avertit en cas d\'extrapolation hors plage historique', () => {
    const bilans = [b(0, 50), b(10, 150), b(20, 250)]
    const r = estimateVolume(bilans, 40)!
    expect(r.warnings.map(w => w.type)).toContain('extrapolation')
  })

  it('avertit en cas de corrélation faible', () => {
    const bilans = [b(0, 100), b(10, 90), b(20, 110), b(5, 95)]
    const r = estimateVolume(bilans, 8)!
    expect(r.r2).toBeLessThan(0.5)
    expect(r.warnings.map(w => w.type)).toContain('correlation_faible')
  })

  it('ne renvoie jamais une borne basse négative', () => {
    const bilans = [b(0, 5), b(10, 8), b(20, 200)]
    const r = estimateVolume(bilans, 0)!
    expect(r.fourchetteBasse).toBeGreaterThanOrEqual(0)
  })

  it('ignore les bilans aux valeurs non finies', () => {
    const bilans = [b(0, 50), b(10, 150), b(20, 250), b(NaN, 999)]
    const r = estimateVolume(bilans, 5)!
    expect(r.nbPoints).toBe(3)
  })
})

describe('nearestBilans', () => {
  it('retourne les k bilans les plus proches en pluviométrie', () => {
    const bilans = [b(2, 60), b(9, 140), b(30, 400), b(11, 160)]
    const res = nearestBilans(bilans, 10, 2)
    expect(res.map(x => x.pluieMm)).toEqual([9, 11])
  })
})
