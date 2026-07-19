import { describe, expect, it } from 'vitest'
import { normalize } from '@/lib/textUtils'

describe('normalize', () => {
  it('met en minuscules', () => {
    expect(normalize('LE FAOU')).toBe('le faou')
  })

  it('retire les accents', () => {
    expect(normalize('Le Faoû')).toBe('le faou')
    expect(normalize('ÉCOLE')).toBe('ecole')
  })

  it('laisse une chaîne déjà normalisée inchangée', () => {
    expect(normalize('cd29')).toBe('cd29')
  })

  it('gère une chaîne vide', () => {
    expect(normalize('')).toBe('')
  })
})
