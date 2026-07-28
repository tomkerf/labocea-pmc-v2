import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import YearMatrixView from '../YearMatrixView'
import type { Client } from '@/types'

function renderYearMatrix(props: Partial<React.ComponentProps<typeof YearMatrixView>> = {}) {
  const defaults: React.ComponentProps<typeof YearMatrixView> = {
    clients: [] as Client[],
    year: 2026,
    filterTech: '',
    filterSite: '',
    preleveurs: [],
  }
  const merged = { ...defaults, ...props }
  return render(<MemoryRouter><YearMatrixView {...merged} /></MemoryRouter>)
}

describe('YearMatrixView — plein écran', () => {
  it('affiche le bouton "Plein écran" au rendu initial', () => {
    renderYearMatrix()
    expect(screen.getByRole('button', { name: 'Plein écran' })).toBeTruthy()
  })

  it('bascule vers "Quitter le plein écran" au clic', () => {
    renderYearMatrix()
    fireEvent.click(screen.getByRole('button', { name: 'Plein écran' }))
    expect(screen.getByRole('button', { name: 'Quitter le plein écran' })).toBeTruthy()
  })

  it('la touche Échap quitte le plein écran une fois actif', () => {
    renderYearMatrix()
    fireEvent.click(screen.getByRole('button', { name: 'Plein écran' }))
    expect(screen.getByRole('button', { name: 'Quitter le plein écran' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Plein écran' })).toBeTruthy()
  })

  it('la touche Échap ne fait rien quand le plein écran est déjà inactif', () => {
    renderYearMatrix()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Plein écran' })).toBeTruthy()
  })
})
