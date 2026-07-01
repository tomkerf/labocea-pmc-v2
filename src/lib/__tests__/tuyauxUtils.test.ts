import { describe, it, expect } from 'vitest'
import { matColor, fmtDate, MATERIAUX } from '../tuyauxUtils'

describe('matColor', () => {
  it('renvoie une couleur pour chaque matériau connu', () => {
    for (const m of MATERIAUX) {
      const c = matColor(m)
      expect(c).toBeDefined()
      expect(c.text).toMatch(/^#/)
    }
  })
  it('renvoie un défaut neutre (jamais undefined) pour un matériau inconnu', () => {
    const c = matColor('MATÉRIAU-INEXISTANT')
    expect(c).toBeDefined()
    expect(c.text).toBeTruthy()
    expect(c.bg).toBeTruthy()
    expect(c.border).toBeTruthy()
  })
})

describe('fmtDate', () => {
  it('formate une ISO en JJ/MM/AA', () => {
    expect(fmtDate('2026-07-01')).toBe('01/07/26')
    expect(fmtDate('2025-12-31')).toBe('31/12/25')
  })
  it('renvoie une chaîne vide pour une entrée vide', () => {
    expect(fmtDate('')).toBe('')
  })
})
