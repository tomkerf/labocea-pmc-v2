import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ATraiterWidget } from '../ATraiterWidget'
import type { RetardItem } from '@/hooks/useDashboardStats'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const retard = (id: string): RetardItem => ({
  clientNom: 'Brest Métropole', siteNom: 'STEP Portuaire', planNom: 'Autosurveillance',
  clientId: 'c1', planId: 'p1', samplingId: id, meteo: '',
})

const empty = {
  todos: [], uid: 'u1',
  rapports: [], onMarkEnvoye: vi.fn(), retards: [],
  pluie: [], maintenances: [], metrologie: [],
}

describe('ATraiterWidget', () => {
  it('ne rend rien quand tout est vide', () => {
    const { container } = render(<ATraiterWidget {...empty} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche l\'onglet Retards en priorité quand des retards existent', () => {
    render(<ATraiterWidget {...empty} retards={[retard('s1'), retard('s2')]} />)
    expect(screen.getByText('Retards')).toBeInTheDocument()
    expect(screen.getAllByText('En retard').length).toBe(2)
  })

  // ── Régression ────────────────────────────────────────────────
  // Les stores Zustand sont vides au premier rendu : les données Firestore
  // arrivent via onSnapshot APRÈS le montage. Le widget doit donc s'afficher
  // quand les props passent de vide à non-vide, et pas seulement si les
  // données sont déjà là au montage.
  it('s\'affiche quand les données arrivent après le montage (Firestore async)', () => {
    const { container, rerender } = render(<ATraiterWidget {...empty} />)
    expect(container).toBeEmptyDOMElement()

    // Firestore répond : 2 prélèvements en retard
    rerender(<ATraiterWidget {...empty} retards={[retard('s1'), retard('s2')]} />)

    expect(container).not.toBeEmptyDOMElement()
    expect(screen.getByText('Retards')).toBeInTheDocument()
    expect(screen.getAllByText('En retard').length).toBe(2)
  })
})
