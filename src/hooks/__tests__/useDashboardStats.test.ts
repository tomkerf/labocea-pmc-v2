import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import type { Client, Plan, Sampling } from '@/types'

function makeSampling(overrides: Partial<Sampling> = {}): Sampling {
  return {
    id: 'sampling-1',
    num: 1,
    plannedMonth: 0,
    plannedDay: 1,
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

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    nom: 'Rejet',
    siteNom: 'Rejet',
    frequence: 'Mensuel',
    meteo: '',
    nature: 'Eau usée',
    methode: 'Ponctuel',
    lat: '',
    lng: '',
    gpsApprox: false,
    customMonths: [],
    bimensuelMonths: [],
    defaultDay: 1,
    customDays: {}, defaultWeeklyDay: 0,
    samplings: [],
    ...overrides,
  }
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    annee: '2026',
    nom: 'Ezide',
    numClient: '',
    nouvelleDemande: 'Annuelle',
    interlocuteur: '',
    telephone: '',
    mobile: '',
    email: '',
    fonction: '',
    mission: '',
    segment: 'SRA',
    numDevis: '',
    numConvention: '',
    preleveur: '',
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

describe('useDashboardStats — badge J1/J2 bilan 24h dans "Planning du jour"', () => {
  it('affiche J1 quand le bilan 24h est planifié aujourd\'hui (pas encore fait)', () => {
    vi.setSystemTime(new Date('2026-07-30T08:00:00'))

    const sampling = makeSampling({ plannedMonth: 6, plannedDay: 30, status: 'planned' })
    const client = makeClient({ plans: [makePlan({ methode: 'Automatique', samplings: [sampling] })] })

    const { result } = renderHook(() => useDashboardStats({
      clients: [client], verifications: [], equipements: [], evenements: [], maintenances: [], todos: [],
      uid: 'uid-1', initiales: null, isGeneraliste: true,
    }))

    const item = result.current.jourItems.find((i) => i.kind === 'sampling')
    expect(item && 'bilan24' in item ? item.bilan24 : undefined).toBe('J1')
  })

  it('affiche J2 le lendemain quand le bilan 24h est toujours en attente de relève', () => {
    vi.setSystemTime(new Date('2026-07-30T08:00:00'))

    const sampling = makeSampling({ plannedMonth: 6, plannedDay: 29, status: 'planned' })
    const client = makeClient({ plans: [makePlan({ methode: 'Automatique', samplings: [sampling] })] })

    const { result } = renderHook(() => useDashboardStats({
      clients: [client], verifications: [], equipements: [], evenements: [], maintenances: [], todos: [],
      uid: 'uid-1', initiales: null, isGeneraliste: true,
    }))

    const item = result.current.jourItems.find((i) => i.kind === 'sampling')
    expect(item && 'bilan24' in item ? item.bilan24 : undefined).toBe('J2')
  })

  it('affiche J2 (pas J1) quand le bilan 24h vient d\'être marqué "réalisé" aujourd\'hui — régression', () => {
    vi.setSystemTime(new Date('2026-07-30T08:00:00'))

    // doneDate = aujourd'hui : le technicien vient de clôturer le cycle → c'est forcément J2 (relève),
    // même si status ne peut plus être 'planned' pour le détecter directement.
    const sampling = makeSampling({ plannedMonth: 6, plannedDay: 29, status: 'done', doneDate: '2026-07-30' })
    const client = makeClient({ plans: [makePlan({ methode: 'Automatique', samplings: [sampling] })] })

    const { result } = renderHook(() => useDashboardStats({
      clients: [client], verifications: [], equipements: [], evenements: [], maintenances: [], todos: [],
      uid: 'uid-1', initiales: null, isGeneraliste: true,
    }))

    const item = result.current.jourItems.find((i) => i.kind === 'sampling')
    expect(item && 'bilan24' in item ? item.bilan24 : undefined).toBe('J2')
  })
})

describe('useDashboardStats — client en pause', () => {
  it('exclut les prélèvements en retard d\'un client mis en pause', () => {
    vi.setSystemTime(new Date('2026-07-17T08:00:00'))

    const overdueSampling = makeSampling({ id: 'retard-1', plannedMonth: 0, plannedDay: 1, status: 'planned' })
    const client = makeClient({ id: 'ezide', nom: 'Ezide', pause: true, plans: [makePlan({ samplings: [overdueSampling] })] })

    const { result } = renderHook(() => useDashboardStats({
      clients: [client],
      verifications: [],
      equipements: [],
      evenements: [],
      maintenances: [],
      todos: [],
      uid: 'uid-1',
      initiales: null,
      isGeneraliste: true,
    }))

    expect(result.current.prelevementsEnRetard.some((r) => r.clientId === 'ezide')).toBe(false)
  })
})
