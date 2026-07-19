import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { useSpotlightResults } from '@/hooks/useSpotlightResults'
import type { Client, Plan } from '@/types'

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    nom: 'Aven',
    siteNom: 'Aven',
    frequence: 'Mensuel',
    meteo: 'pluie',
    nature: 'Rivière',
    methode: 'Ponctuel',
    lat: '',
    lng: '',
    gpsApprox: false,
    customMonths: [],
    bimensuelMonths: [],
    defaultDay: 4,
    customDays: {},
    samplings: [],
    ...overrides,
  }
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    annee: '2026',
    nom: 'DREAL CORPEP',
    numClient: '',
    nouvelleDemande: 'Avenant',
    interlocuteur: '',
    telephone: '',
    mobile: '',
    email: '',
    fonction: '',
    mission: '',
    segment: 'SRA',
    numDevis: '',
    numConvention: '',
    preleveur: 'THK',
    dureeContrat: '',
    periodeIntervention: '',
    sites: [],
    montantTotal: 0,
    partPMC: 0,
    partSousTraitance: 0,
    plans: [],
    createdBy: '',
    updatedBy: '',
    updatedAt: Timestamp.now(),
    ...overrides,
  }
}

describe('useSpotlightResults', () => {
  it('retourne des listes vides pour une recherche vide', () => {
    const clients = [makeClient()]
    const { result } = renderHook(() => useSpotlightResults(clients, ''))
    expect(result.current.clients).toEqual([])
    expect(result.current.plans).toEqual([])
  })

  it('trouve un client par nom, insensible à la casse et aux accents', () => {
    const clients = [makeClient({ id: 'c1', nom: 'Mairie du Faoû' })]
    const { result } = renderHook(() => useSpotlightResults(clients, 'faou'))
    expect(result.current.clients.map((c) => c.id)).toEqual(['c1'])
  })

  it('trouve un client par segment ou par préleveur', () => {
    const clients = [
      makeClient({ id: 'c1', nom: 'Client A', segment: 'RSDE' }),
      makeClient({ id: 'c2', nom: 'Client B', preleveur: 'ROD' }),
    ]
    const bySegment = renderHook(() => useSpotlightResults(clients, 'rsde'))
    expect(bySegment.result.current.clients.map((c) => c.id)).toEqual(['c1'])

    const byPreleveur = renderHook(() => useSpotlightResults(clients, 'rod'))
    expect(byPreleveur.result.current.clients.map((c) => c.id)).toEqual(['c2'])
  })

  it('trouve un point de prélèvement par nom ou par site, avec référence au client parent', () => {
    const plan = makePlan({ id: 'p1', nom: 'CD29 — Le Faou', siteNom: 'Le Faou' })
    const clients = [makeClient({ id: 'c1', nom: 'Mairie du Faou', plans: [plan] })]

    const byNom = renderHook(() => useSpotlightResults(clients, 'cd29'))
    expect(byNom.result.current.plans).toEqual([{ plan, client: clients[0] }])

    const bySite = renderHook(() => useSpotlightResults(clients, 'faou'))
    expect(bySite.result.current.plans).toEqual([{ plan, client: clients[0] }])
  })

  it('limite à 6 résultats par catégorie', () => {
    const clients = Array.from({ length: 10 }, (_, i) =>
      makeClient({ id: `c${i}`, nom: `Client Test ${i}` })
    )
    const { result } = renderHook(() => useSpotlightResults(clients, 'client test'))
    expect(result.current.clients).toHaveLength(6)
  })

  it("n'inclut pas les clients dont aucun champ ne correspond", () => {
    const clients = [makeClient({ id: 'c1', nom: 'Client A' })]
    const { result } = renderHook(() => useSpotlightResults(clients, 'zzz'))
    expect(result.current.clients).toEqual([])
  })
})
