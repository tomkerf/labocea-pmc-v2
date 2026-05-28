import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { EquipeSuiviWidget } from '../EquipeSuiviWidget'
import type { Client } from '@/types'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c1', nom: 'Kerjequel', annee: '2026', numClient: '', nouvelleDemande: 'Annuelle',
  interlocuteur: '', telephone: '', mobile: '', email: '', fonction: '', mission: '',
  segment: 'Réseau de mesure', numDevis: '', numConvention: '', preleveur: 'THK',
  dureeContrat: '', periodeIntervention: '', sites: [], montantTotal: 0,
  partPMC: 0, partSousTraitance: 0, plans: [], createdBy: 'uid1', updatedBy: 'uid1',
  updatedAt: Timestamp.now(), ...overrides,
})

const doneSampling = {
  id: 's1', num: 1, plannedMonth: 0, plannedDay: 10,
  status: 'done' as const, doneDate: '2026-01-10', doneBy: 'uid1',
  nappe: '' as const, comment: '', rapportPrevu: false, rapportDate: '',
  tente: false, reportHistory: [],
}

describe('EquipeSuiviWidget', () => {
  it('retourne null si aucun prélèvement incomplet', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Site', frequence: 'Mensuel',
      meteo: '', nature: 'Eau usée', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    const { container } = render(<EquipeSuiviWidget clients={[client]} />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche le titre "Suivi équipe"', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Site', frequence: 'Mensuel',
      meteo: '', nature: 'Souterraine', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    render(<EquipeSuiviWidget clients={[client]} />)
    expect(screen.getByText(/suivi équipe/i)).toBeTruthy()
  })

  it('affiche le nom du client dans la liste des incomplets', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Jaudy', frequence: 'Mensuel',
      meteo: '', nature: 'Souterraine', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    render(<EquipeSuiviWidget clients={[client]} />)
    expect(screen.getByText('Kerjequel')).toBeTruthy()
  })

  it('affiche le bon champ manquant', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Site', frequence: 'Mensuel',
      meteo: '', nature: 'Souterraine', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    render(<EquipeSuiviWidget clients={[client]} />)
    expect(screen.getByText(/nappe/i)).toBeTruthy()
  })
})
