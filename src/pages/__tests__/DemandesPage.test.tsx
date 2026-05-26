import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DemandesPage from '../DemandesPage'
import type { Demande } from '@/types'
import type { Timestamp } from 'firebase/firestore'

const navigate = vi.fn()
const timestamp = {} as Timestamp

const demande: Demande = {
  id: 'demande-1',
  contactNom: 'Jean Client',
  contactSociete: 'Station Keravel',
  contactEmail: 'jean@example.test',
  contactTel: '0600000000',
  lieu: 'Quimper',
  segment: 'SRA',
  description: 'Visite avant devis',
  frequence: '',
  nbPoints: '2',
  montantDevis: '',
  dateDevis: '',
  statut: 'visite_prelim',
  preleveurUid: '',
  notes: '',
  dateReception: '2026-05-25',
  createdBy: 'uid-1',
  createdAt: timestamp,
  updatedAt: timestamp,
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/hooks/useDemandes', () => ({
  useDemandesListener: vi.fn(),
  saveDemande: vi.fn(),
  createDemande: vi.fn(),
  deleteDemande: vi.fn(),
}))

vi.mock('@/stores/demandesStore', () => ({
  useDemandesStore: () => ({ demandes: [demande], loading: false }),
}))

vi.mock('@/stores/authStore', () => ({
  selectUid: (state: { uid: string }) => state.uid,
  useAuthStore: (selector: (state: { uid: string }) => string) => selector({ uid: 'uid-1' }),
}))

vi.mock('@/hooks/useUsers', () => ({
  useUsersListener: vi.fn(),
}))

vi.mock('@/stores/usersStore', () => ({
  useUsersStore: () => [],
}))

vi.mock('@/services/clientService', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/hooks/useVisites', () => ({
  useVisites: () => ({ visites: [], loading: false }),
}))

describe('DemandesPage', () => {
  beforeEach(() => {
    navigate.mockClear()
  })

  it('ouvre la création de visite préliminaire via le routeur depuis une demande', async () => {
    render(<DemandesPage />)

    fireEvent.click(screen.getByRole('button', { name: /station keravel/i }))
    fireEvent.click(screen.getByRole('button', { name: /^nouvelle$/i }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/visites/nouveau?type=demande&id=demande-1&nom=Station%20Keravel')
    })
  })
})
