import { describe, it, expect } from 'vitest'
import type { VisitePreliminaire } from '@/types'
import { Timestamp } from 'firebase/firestore'

describe('visiteService — types', () => {
  it('VisitePreliminaire a les champs requis', () => {
    const visite: VisitePreliminaire = {
      id: 'v1',
      linkedTo: { type: 'client', id: 'c1', nom: 'Plounerin' },
      date: '2026-05-26',
      technicienUid: 'uid1',
      technicienNom: 'Thomas K.',
      notes: '',
      points: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    expect(visite.linkedTo.type).toBe('client')
    expect(visite.points).toHaveLength(0)
  })
})
