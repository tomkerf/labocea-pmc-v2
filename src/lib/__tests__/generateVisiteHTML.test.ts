import { describe, it, expect } from 'vitest'
import { generateVisiteHTML } from '@/lib/generateVisiteHTML'
import type { VisitePreliminaire } from '@/types'
import { Timestamp } from 'firebase/firestore'

const BASE_VISITE: VisitePreliminaire = {
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

describe('generateVisiteHTML', () => {
  it('contient le nom du client', () => {
    const html = generateVisiteHTML(BASE_VISITE)
    expect(html).toContain('Plounerin')
  })

  it('contient le technicien', () => {
    const html = generateVisiteHTML(BASE_VISITE)
    expect(html).toContain('Thomas K.')
  })

  it('affiche les points avec faisabilité colorée', () => {
    const visite: VisitePreliminaire = {
      ...BASE_VISITE,
      points: [
        {
          id: 'p1',
          nom: 'P1 regard aval',
          typeEau: 'Eau usée',
          methode: 'Ponctuel',
          faisabilite: 'ok',
          securite: 'Bottes requises',
          notes: '',
          photos: [],
        },
      ],
    }
    const html = generateVisiteHTML(visite)
    expect(html).toContain('P1 regard aval')
    expect(html).toContain('#34C759')
    expect(html).toContain('✓ OK')
  })

  it('affiche les notes générales si présentes', () => {
    const visite: VisitePreliminaire = { ...BASE_VISITE, notes: 'Accès difficile' }
    const html = generateVisiteHTML(visite)
    expect(html).toContain('Accès difficile')
  })

  it("n'affiche pas la section notes si vide", () => {
    const html = generateVisiteHTML(BASE_VISITE)
    expect(html).not.toContain('Notes générales')
  })
})
