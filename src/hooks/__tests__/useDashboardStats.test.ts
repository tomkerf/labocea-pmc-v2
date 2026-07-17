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
    customDays: {},
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
