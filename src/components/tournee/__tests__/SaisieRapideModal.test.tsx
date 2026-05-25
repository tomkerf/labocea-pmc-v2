// src/components/tournee/__tests__/SaisieRapideModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaisieRapideModal } from '../SaisieRapideModal'
import type { SaisieRapideData } from '../SaisieRapideModal'

const baseProps = {
  clientNom: 'Plounerin',
  siteNom: 'Rivière Jaudy',
  nature: 'Eau de rivière',
  initialStatus: 'done' as const,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe('SaisieRapideModal', () => {
  it('affiche le nom client et site', () => {
    render(<SaisieRapideModal {...baseProps} />)
    expect(screen.getByText('Plounerin')).toBeTruthy()
    expect(screen.getByText(/Rivière Jaudy/)).toBeTruthy()
  })

  it('masque le champ nappe si nature !== Souterraine', () => {
    render(<SaisieRapideModal {...baseProps} nature="Eau de rivière" />)
    expect(screen.queryByLabelText(/nappe/i)).toBeNull()
  })

  it('affiche le champ nappe si nature === Souterraine', () => {
    render(<SaisieRapideModal {...baseProps} nature="Souterraine" />)
    expect(screen.getByLabelText(/nappe/i)).toBeTruthy()
  })

  it('requiert le motif si statut Non effectué', () => {
    render(<SaisieRapideModal {...baseProps} initialStatus="non_effectue" />)
    fireEvent.click(screen.getByRole('button', { name: /valider/i }))
    expect(screen.getByText(/motif obligatoire/i)).toBeTruthy()
    expect(baseProps.onConfirm).not.toHaveBeenCalled()
  })

  it('appelle onConfirm avec les bonnes données', () => {
    const onConfirm = vi.fn()
    render(<SaisieRapideModal {...baseProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /valider/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining<Partial<SaisieRapideData>>({
      status: 'done',
      motif: '',
    }))
  })

  it('appelle onClose au clic Annuler', () => {
    const onClose = vi.fn()
    render(<SaisieRapideModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
