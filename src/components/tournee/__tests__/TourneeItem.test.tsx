import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TourneeItem } from '../TourneeItem'
import type { TourneeItemData } from '../TourneeItem'

const baseItem: TourneeItemData = {
  samplingId: 's1',
  clientId: 'c1',
  planId: 'p1',
  clientNom: 'Plounerin',
  siteNom: 'Rivière Jaudy',
  planNom: 'Mensuel',
  time: '09:00',
  meteo: '',
  nature: 'Eau de rivière',
  lat: '',
  lng: '',
  status: 'todo',
  motif: '',
  rapportPrevu: false,
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('TourneeItem — statut todo', () => {
  it('affiche le nom client et le site', () => {
    renderWithRouter(<TourneeItem item={baseItem} onAction={vi.fn()} />)
    expect(screen.getByText('Plounerin')).toBeTruthy()
    expect(screen.getByText(/Rivière Jaudy/)).toBeTruthy()
  })

  it('affiche les boutons Réalisé et Non effectué', () => {
    renderWithRouter(<TourneeItem item={baseItem} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /réalisé/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /non effectué/i })).toBeTruthy()
  })

  it('appelle onAction("done") au clic Réalisé', () => {
    const onAction = vi.fn()
    renderWithRouter(<TourneeItem item={baseItem} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /réalisé/i }))
    expect(onAction).toHaveBeenCalledWith('s1', 'done')
  })

  it('appelle onAction("non_effectue") au clic Non effectué', () => {
    const onAction = vi.fn()
    renderWithRouter(<TourneeItem item={baseItem} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /non effectué/i }))
    expect(onAction).toHaveBeenCalledWith('s1', 'non_effectue')
  })
})

describe('TourneeItem — statut done', () => {
  it('masque les boutons quand done', () => {
    renderWithRouter(<TourneeItem item={{ ...baseItem, status: 'done' }} onAction={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /réalisé/i })).toBeNull()
  })

  it('affiche icône météo si meteo pluie', () => {
    renderWithRouter(<TourneeItem item={{ ...baseItem, meteo: 'pluie' }} onAction={vi.fn()} />)
    expect(screen.getByTitle('Prélèvement temps de pluie')).toBeTruthy()
  })
})

describe('TourneeItem — GPS', () => {
  it('affiche le bouton GPS si lat/lng présents', () => {
    renderWithRouter(<TourneeItem item={{ ...baseItem, lat: '48.1', lng: '-3.2' }} onAction={vi.fn()} />)
    expect(screen.getByRole('link', { name: /gps/i })).toBeTruthy()
  })

  it('masque le bouton GPS si lat vide', () => {
    renderWithRouter(<TourneeItem item={baseItem} onAction={vi.fn()} />)
    expect(screen.queryByRole('link', { name: /gps/i })).toBeNull()
  })
})
