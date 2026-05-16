import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import type { Client, Sampling, Plan, Equipement, Verification, Maintenance, EvenementPersonnel } from '@/types'
import { Timestamp } from 'firebase/firestore'

// ─── Factories ────────────────────────────────────────────────────────────────

const THIS_MONTH_DATE = new Date().toISOString().slice(0, 7) + '-01'
const LAST_MONTH_DATE = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7) + '-01'
})()

function makeSampling(overrides: Partial<Sampling> = {}): Sampling {
  return {
    id: 's1', num: 1, plannedMonth: 0, plannedDay: 15,
    status: 'planned', doneDate: '', comment: '', nappe: '',
    rapportPrevu: false, rapportDate: '', tente: false,
    reportHistory: [], doneBy: '',
    ...overrides,
  }
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan1', nom: 'Plan A', siteNom: 'Site X',
    frequence: 'Mensuel', meteo: '', nature: 'Rivière', methode: 'Ponctuel',
    lat: '', lng: '', gpsApprox: false,
    customMonths: [], bimensuelMonths: [], defaultDay: 15, customDays: {},
    samplings: [],
    ...overrides,
  }
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1', annee: '2026', nom: 'Client Test', numClient: '',
    nouvelleDemande: 'Annuelle', interlocuteur: '', telephone: '', mobile: '',
    email: '', fonction: '', mission: '', segment: 'SRA',
    numDevis: '', numConvention: '', preleveur: 'THK',
    dureeContrat: '', periodeIntervention: '', sites: [],
    montantTotal: 0, partPMC: 0, partSousTraitance: 0,
    plans: [],
    createdBy: '', updatedBy: '', updatedAt: Timestamp.now(),
    ...overrides,
  }
}

function makeEquipement(overrides: Partial<Equipement> = {}): Equipement {
  return {
    id: 'eq1', nom: 'YSI', marque: 'YSI', modele: 'Pro30', numSerie: 'SN1',
    categorie: 'multiparametre', dateAcquisition: '2024-01-01',
    etat: 'operationnel', localisation: 'labo', notes: '',
    prochainEtalonnage: '', createdBy: 'uid1', updatedAt: Timestamp.now(),
    ...overrides,
  }
}

function makeVerification(overrides: Partial<Verification> = {}): Verification {
  return {
    id: 'v1', equipementId: 'eq1', equipementNom: 'YSI',
    type: 'etalonnage_interne', date: '2026-01-01',
    resultat: 'conforme', remarques: '', prochainControle: '',
    technicienUid: 'uid1', technicienNom: 'Tom', documentUrl: '',
    createdAt: Timestamp.now(),
    ...overrides,
  }
}

const NO_EVENEMENTS: EvenementPersonnel[] = []
const NO_MAINTENANCES: Maintenance[] = []
const BASE_PARAMS = {
  uid: 'uid1', initiales: 'THK', isGeneraliste: false,
  evenements: NO_EVENEMENTS, maintenances: NO_MAINTENANCES,
  verifications: [], equipements: [], clients: [],
}

// ─── missionsCeMois ───────────────────────────────────────────────────────────

describe('useDashboardStats — missionsCeMois', () => {
  it('compte les prélèvements done ce mois', () => {
    const client = makeClient({
      plans: [makePlan({ samplings: [
        makeSampling({ id: 's1', status: 'done', doneDate: THIS_MONTH_DATE }),
        makeSampling({ id: 's2', status: 'done', doneDate: THIS_MONTH_DATE }),
      ]})],
    })
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, clients: [client] })
    )
    expect(result.current.missionsCeMois).toBe(2)
  })

  it('ignore les prélèvements done le mois dernier', () => {
    const client = makeClient({
      plans: [makePlan({ samplings: [
        makeSampling({ status: 'done', doneDate: LAST_MONTH_DATE }),
      ]})],
    })
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, clients: [client] })
    )
    expect(result.current.missionsCeMois).toBe(0)
  })

  it('ignore les prélèvements non done', () => {
    const client = makeClient({
      plans: [makePlan({ samplings: [
        makeSampling({ status: 'planned', doneDate: '' }),
        makeSampling({ status: 'overdue', doneDate: '' }),
      ]})],
    })
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, clients: [client] })
    )
    expect(result.current.missionsCeMois).toBe(0)
  })

  it('retourne 0 si pas de clients', () => {
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, clients: [] })
    )
    expect(result.current.missionsCeMois).toBe(0)
  })
})

// ─── conformitePct ────────────────────────────────────────────────────────────

describe('useDashboardStats — conformitePct', () => {
  it('calcule le pourcentage de conformité', () => {
    const verifs = [
      makeVerification({ id: 'v1', resultat: 'conforme' }),
      makeVerification({ id: 'v2', resultat: 'conforme' }),
      makeVerification({ id: 'v3', resultat: 'non_conforme' }),
      makeVerification({ id: 'v4', resultat: 'non_conforme' }),
    ]
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, verifications: verifs })
    )
    expect(result.current.conformitePct).toBe(50)
  })

  it('retourne null si aucune vérification', () => {
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, verifications: [] })
    )
    expect(result.current.conformitePct).toBeNull()
  })

  it('retourne 100 si tout est conforme', () => {
    const verifs = [
      makeVerification({ id: 'v1', resultat: 'conforme' }),
      makeVerification({ id: 'v2', resultat: 'conforme' }),
    ]
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, verifications: verifs })
    )
    expect(result.current.conformitePct).toBe(100)
  })
})

// ─── parcEtat ─────────────────────────────────────────────────────────────────

describe('useDashboardStats — parcEtat', () => {
  it('compte les équipements par état', () => {
    const equipements = [
      makeEquipement({ id: 'e1', etat: 'operationnel' }),
      makeEquipement({ id: 'e2', etat: 'operationnel' }),
      makeEquipement({ id: 'e3', etat: 'en_maintenance' }),
      makeEquipement({ id: 'e4', etat: 'hors_service' }),
      makeEquipement({ id: 'e5', etat: 'prete' }),
    ]
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, equipements })
    )
    expect(result.current.parcEtat.operationnel).toBe(2)
    expect(result.current.parcEtat.en_maintenance).toBe(1)
    expect(result.current.parcEtat.hors_service).toBe(1)
    expect(result.current.parcEtat.prete).toBe(1)
  })

  it('retourne 0 partout si aucun equipement', () => {
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, equipements: [] })
    )
    expect(result.current.parcEtat.operationnel).toBe(0)
    expect(result.current.parcEtat.en_maintenance).toBe(0)
  })
})

// ─── prelevementsEnRetard ─────────────────────────────────────────────────────

describe('useDashboardStats — prelevementsEnRetard', () => {
  it('inclut les prélèvements overdue', () => {
    const client = makeClient({
      annee: '2026',
      plans: [makePlan({ meteo: '', samplings: [
        makeSampling({ status: 'overdue', plannedMonth: 0, plannedDay: 1 }),
      ]})],
    })
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, clients: [client] })
    )
    expect(result.current.prelevementsEnRetard.length).toBeGreaterThanOrEqual(1)
  })

  it('exclut les plans pluie des alertes retard', () => {
    const client = makeClient({
      annee: '2026',
      plans: [makePlan({ meteo: 'pluie', samplings: [
        makeSampling({ status: 'overdue', plannedMonth: 0, plannedDay: 1 }),
      ]})],
    })
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, clients: [client] })
    )
    expect(result.current.prelevementsEnRetard).toHaveLength(0)
  })

  it('exclut les prélèvements done', () => {
    const client = makeClient({
      plans: [makePlan({ samplings: [
        makeSampling({ status: 'done', doneDate: THIS_MONTH_DATE }),
      ]})],
    })
    const { result } = renderHook(() =>
      useDashboardStats({ ...BASE_PARAMS, clients: [client] })
    )
    expect(result.current.prelevementsEnRetard).toHaveLength(0)
  })
})
