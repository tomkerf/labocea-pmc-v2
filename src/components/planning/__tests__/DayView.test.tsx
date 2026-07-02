import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DayView from '../DayView'
import type { PlanningEvent } from '@/lib/planningUtils'

// ── Factory ─────────────────────────────────────────────────────
function ev(over: Partial<PlanningEvent> = {}): PlanningEvent {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    type: 'prelevement',
    title: 'Client A',
    subtitle: 'Point 1',
    statusLabel: 'Planifié',
    statusBg: '#EFF6FF',
    statusColor: '#0071E3',
    link: '/missions/x',
    isDone: false,
    priority: 2,
    technicien: 'THK',
    ...over,
  }
}

const noop = () => {}

function renderDay(props: Partial<React.ComponentProps<typeof DayView>> = {}) {
  const selectedDate = new Date(2026, 6, 1) // mercredi 1 juillet 2026, semaine ISO 27
  const defaults: React.ComponentProps<typeof DayView> = {
    selectedDate,
    today: new Date(2026, 6, 1),
    eventsByDate: {},
    filterTech: '',
    allowedTechs: [],
    filterRetard: false,
    showRain: false,
    handleTouchStart: noop,
    handleTouchEnd: noop,
    handleSelectEvent: vi.fn(),
    setSelectedDay: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  return { ...render(<MemoryRouter><DayView {...merged} /></MemoryRouter>), props: merged }
}

describe('DayView — en-tête', () => {
  it('affiche le numéro de semaine ISO', () => {
    renderDay()
    expect(screen.getByText('Semaine 27')).toBeTruthy()
  })

  it('affiche le compteur d\'interventions au pluriel', () => {
    renderDay({
      eventsByDate: {
        '2026-07-01': [ev({ id: 'a', clientId: 'c1' }), ev({ id: 'b', clientId: 'c2', title: 'Client B' })],
      },
    })
    expect(screen.getByText(/2 interventions/)).toBeTruthy()
  })

  it('exclut les événements météo du compteur', () => {
    renderDay({
      eventsByDate: {
        '2026-07-01': [
          ev({ id: 'a', clientId: 'c1' }),
          ev({ id: 'm', type: 'evenement', evenementData: { type: 'meteo' } as never }),
        ],
      },
    })
    expect(screen.getByText(/1 intervention/)).toBeTruthy()
  })
})

describe('DayView — états vides', () => {
  it('affiche le vide "toute la journée" et le vide horodaté', () => {
    renderDay()
    expect(screen.getByText('Aucune intervention planifiée')).toBeTruthy()
    expect(screen.getByText(/Aucun événement horodaté/)).toBeTruthy()
  })
})

describe('DayView — regroupement par client (toute la journée)', () => {
  it('regroupe plusieurs prélèvements du même client en une pill avec badge ×N', () => {
    renderDay({
      eventsByDate: {
        '2026-07-01': [
          ev({ id: 'a', clientId: 'c1', subtitle: 'Point 1' }),
          ev({ id: 'b', clientId: 'c1', subtitle: 'Point 2' }),
          ev({ id: 'c', clientId: 'c1', subtitle: 'Point 3' }),
        ],
      },
    })
    expect(screen.getByText('×3')).toBeTruthy()
    // Les sous-points ne sont pas visibles tant que le groupe est replié
    expect(screen.queryByText('Point 2')).toBeNull()
  })

  it('déplie le groupe au clic et révèle les sous-événements', () => {
    renderDay({
      eventsByDate: {
        '2026-07-01': [
          ev({ id: 'a', clientId: 'c1', subtitle: 'Point 1' }),
          ev({ id: 'b', clientId: 'c1', subtitle: 'Point 2' }),
        ],
      },
    })
    fireEvent.click(screen.getByText('×2'))
    expect(screen.getByText('Point 1')).toBeTruthy()
    expect(screen.getByText('Point 2')).toBeTruthy()
  })

  it('un événement seul n\'est pas groupé et affiche son badge de statut', () => {
    renderDay({
      eventsByDate: {
        '2026-07-01': [ev({ id: 'a', clientId: 'c1', statusLabel: 'En retard', priority: 0 })],
      },
    })
    expect(screen.getByText('En retard')).toBeTruthy()
    expect(screen.queryByText(/^×/)).toBeNull()
  })

  it('appelle handleSelectEvent au clic sur un événement non groupé', () => {
    const handleSelectEvent = vi.fn()
    renderDay({
      handleSelectEvent,
      eventsByDate: { '2026-07-01': [ev({ id: 'a', clientId: 'c1', title: 'Client Solo' })] },
    })
    fireEvent.click(screen.getByText('Client Solo'))
    expect(handleSelectEvent).toHaveBeenCalledTimes(1)
    expect(handleSelectEvent.mock.calls[0][1]).toBe('2026-07-01')
  })
})

describe('DayView — événements horodatés', () => {
  it('affiche le titre d\'un événement avec heure planifiée', () => {
    renderDay({
      eventsByDate: {
        '2026-07-01': [ev({ id: 't1', title: 'RDV Matin', plannedTime: '09:00' })],
      },
    })
    expect(screen.getByText('RDV Matin')).toBeTruthy()
    // plus le placeholder horodaté vide
    expect(screen.queryByText(/Aucun événement horodaté/)).toBeNull()
  })
})

describe('DayView — FAB Planifier', () => {
  it('appelle setSelectedDay avec la date au clic', () => {
    const setSelectedDay = vi.fn()
    renderDay({ setSelectedDay })
    fireEvent.click(screen.getByRole('button', { name: /planifier/i }))
    expect(setSelectedDay).toHaveBeenCalledWith('2026-07-01')
  })
})

describe('DayView — indicateur heure actuelle', () => {
  it('n\'affiche pas la barre "maintenant" si selectedDate ≠ today', () => {
    const { container } = renderDay({
      selectedDate: new Date(2026, 6, 1),
      today: new Date(2026, 6, 2),
    })
    // La barre rouge "now" a un background #FF3B30 inline
    const nowBar = Array.from(container.querySelectorAll('div')).some(
      d => d.getAttribute('style')?.includes('rgb(255, 59, 48)'),
    )
    expect(nowBar).toBe(false)
  })
})
