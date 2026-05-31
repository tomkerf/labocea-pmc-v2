import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { usePlanningData } from '@/hooks/usePlanningData'
import type {
  AppUser,
  Client,
  EvenementPersonnel,
  Maintenance,
  Plan,
  Sampling,
  Equipement,
} from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'

function makeSampling(overrides: Partial<Sampling> = {}): Sampling {
  return {
    id: 'sampling-1',
    num: 1,
    plannedMonth: 3,
    plannedDay: 4,
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

const EMPTY_MAINTENANCES: Maintenance[] = []
const EMPTY_EQUIPEMENTS: Equipement[] = []
const EMPTY_EVENEMENTS: EvenementPersonnel[] = []
const EMPTY_USERS: AppUser[] = []
const EMPTY_PRELEVEURS: Preleveur[] = []

describe('usePlanningData', () => {
  it('place un prélèvement réalisé à sa date réelle même si le mois prévu est différent', () => {
    vi.setSystemTime(new Date('2026-05-21T08:00:00'))

    const sampling = makeSampling({
      id: 'corpep-avril',
      plannedMonth: 3,
      plannedDay: 4,
      status: 'done',
      doneDate: '2026-05-04',
      doneBy: 'uid-thk',
    })
    const client = makeClient({
      plans: [makePlan({ samplings: [sampling] })],
    })

    const { result } = renderHook(() => usePlanningData({
      clients: [client],
      maintenances: EMPTY_MAINTENANCES,
      equipements: EMPTY_EQUIPEMENTS,
      evenements: EMPTY_EVENEMENTS,
      todos: [],
      users: EMPTY_USERS,
      preleveurs: EMPTY_PRELEVEURS,
      selectedDay: null,
    }))

    expect(result.current.eventsByDate['2026-05-04']?.map((e) => e.id) ?? []).toContain('corpep-avril')
    expect(result.current.eventsByDate['2026-04-04']?.map((e) => e.id) ?? []).not.toContain('corpep-avril')
  })
})
