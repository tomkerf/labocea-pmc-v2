import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TourneeFinEcran } from '../TourneeFinEcran'

const items = [
  { samplingId: 's1', clientNom: 'Plounerin', siteNom: 'Rivière Jaudy', status: 'done' as const, motif: '' },
  { samplingId: 's2', clientNom: 'Lannion',   siteNom: 'AEP',           status: 'non_effectue' as const, motif: 'Accès impossible' },
]

describe('TourneeFinEcran', () => {
  it('affiche le titre et le nombre de sites', () => {
    render(<TourneeFinEcran items={items} onRetour={vi.fn()} />)
    expect(screen.getByText('Tournée terminée !')).toBeTruthy()
    expect(screen.getByText(/2 prélèvements/)).toBeTruthy()
  })

  it('affiche chaque item avec son statut', () => {
    render(<TourneeFinEcran items={items} onRetour={vi.fn()} />)
    expect(screen.getByText('Plounerin — Rivière Jaudy')).toBeTruthy()
    expect(screen.getByText('Lannion — AEP')).toBeTruthy()
    expect(screen.getByText('Accès impossible')).toBeTruthy()
  })

  it('appelle onRetour au clic du bouton', () => {
    const onRetour = vi.fn()
    render(<TourneeFinEcran items={items} onRetour={onRetour} />)
    fireEvent.click(screen.getByRole('button', { name: /retour/i }))
    expect(onRetour).toHaveBeenCalledOnce()
  })
})
