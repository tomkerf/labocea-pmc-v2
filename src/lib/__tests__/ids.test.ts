import { describe, it, expect } from 'vitest'
import { generateId } from '../ids'

// ─── generateId ───────────────────────────────────────────────

describe('generateId', () => {
  it('retourne une chaîne non vide', () => {
    expect(generateId()).toBeTruthy()
  })

  it('retourne un UUID v4 valide (format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)', () => {
    const uuid = generateId()
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(uuid).toMatch(uuidV4Regex)
  })

  it('génère des identifiants uniques à chaque appel', () => {
    const N = 1000
    const ids = new Set(Array.from({ length: N }, () => generateId()))
    expect(ids.size).toBe(N)
  })
})
