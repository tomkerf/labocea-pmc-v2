import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MonthView from '../MonthView'
import { buildMonthGrid, type PlanningEvent } from '@/lib/planningUtils'

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

const MONTH_GRID = buildMonthGrid(new Date(2026, 6, 1)) // juillet 2026
const noop = () => {}

function renderMonth(props: Partial<React.ComponentProps<typeof MonthView>> = {}) {
  const defaults: React.ComponentProps<typeof MonthView> = {
    monthGrid: MONTH_GRID,
    today: new Date(2026, 6, 1),
    holidays: {},
    eventsByDate: {},
    filterTech: '',
    allowedTechs: [],
    filterRetard: false,
    showRain: false,
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    handleDragMouseDown: noop,
    handleDragMouseEnter: noop,
    handleDragMouseUp: noop,
    setIsDragging: noop,
    setDragStart: noop,
    setDragEnd: noop,
    handleSelectEvent: vi.fn(),
    goToDay: vi.fn(),
    setCtxMenu: vi.fn(),
    prev: vi.fn(),
    next: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  return { ...render(<MemoryRouter><MonthView {...merged} /></MemoryRouter>), props: merged }
}

describe('MonthView — grille', () => {
  it('affiche les en-têtes de jours de la semaine', () => {
    renderMonth()
    for (const j of ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']) {
      expect(screen.getByText(j)).toBeTruthy()
    }
  })

  it('affiche les numéros de tous les jours du mois', () => {
    renderMonth()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('31')).toBeTruthy()
  })

  it('affiche le nom du jour férié', () => {
    renderMonth({ holidays: { '2026-07-14': 'Fête Nationale' } })
    expect(screen.getByText('Fête Nationale')).toBeTruthy()
  })
})

describe('MonthView — troncature des événements', () => {
  it('affiche au plus 3 pills et un indicateur "+N autres"', () => {
    renderMonth({
      eventsByDate: {
        '2026-07-02': [
          ev({ id: 'a', clientId: 'c1', title: 'Client A' }),
          ev({ id: 'b', clientId: 'c2', title: 'Client B' }),
          ev({ id: 'c', clientId: 'c3', title: 'Client C' }),
          ev({ id: 'd', clientId: 'c4', title: 'Client D' }),
          ev({ id: 'e', clientId: 'c5', title: 'Client E' }),
        ],
      },
    })
    expect(screen.getByText('+2 autres')).toBeTruthy()
  })

  it('regroupe les prélèvements d\'un même client (une seule pill ×N)', () => {
    renderMonth({
      eventsByDate: {
        '2026-07-02': [
          ev({ id: 'a', clientId: 'c1', subtitle: 'P1' }),
          ev({ id: 'b', clientId: 'c1', subtitle: 'P2' }),
          ev({ id: 'c', clientId: 'c1', subtitle: 'P3' }),
        ],
      },
    })
    expect(screen.getByText('×3')).toBeTruthy()
    expect(screen.queryByText('+2 autres')).toBeNull()
  })
})

describe('MonthView — grisage congé scopé au technicien', () => {
  const congeEvt = ev({ id: 'cg', type: 'evenement', technicien: 'THK', title: 'Congé', evenementData: { type: 'conge' } as never })

  it('affiche l\'overlay congé quand le filtre technicien correspond', () => {
    const { container } = renderMonth({
      filterTech: 'THK',
      eventsByDate: { '2026-07-03': [congeEvt] },
    })
    expect(container.querySelector('.conge-overlay')).toBeTruthy()
  })

  it('n\'affiche pas l\'overlay congé pour un autre technicien filtré', () => {
    const { container } = renderMonth({
      filterTech: 'ROD',
      eventsByDate: { '2026-07-03': [congeEvt] },
    })
    expect(container.querySelector('.conge-overlay')).toBeNull()
  })
})
