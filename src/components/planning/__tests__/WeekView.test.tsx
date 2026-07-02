import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WeekView from '../WeekView'
import { startOfWeek, addDays, type PlanningEvent } from '@/lib/planningUtils'

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

// Semaine du 1er juillet 2026 → lundi 2026-06-29 .. dimanche 2026-07-05
const WEEK_START = startOfWeek(new Date(2026, 6, 1))
const WEEK_DAYS = Array.from({ length: 7 }, (_, i) => addDays(WEEK_START, i))

const noop = () => {}

function renderWeek(props: Partial<React.ComponentProps<typeof WeekView>> = {}) {
  const defaults: React.ComponentProps<typeof WeekView> = {
    weekDays: WEEK_DAYS,
    today: new Date(2026, 6, 1),
    holidays: {},
    eventsByDate: {},
    bilanBand: [],
    allDayItems: [],
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
  }
  const merged = { ...defaults, ...props }
  return { ...render(<MemoryRouter><WeekView {...merged} /></MemoryRouter>), props: merged }
}

describe('WeekView — en-têtes', () => {
  it('affiche les 7 libellés de jours', () => {
    renderWeek()
    for (const j of ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']) {
      expect(screen.getByText(j)).toBeTruthy()
    }
  })

  it('affiche les numéros de jour de la semaine', () => {
    renderWeek()
    expect(screen.getByText('29')).toBeTruthy() // lundi 29 juin
    expect(screen.getByText('1')).toBeTruthy()  // mercredi 1 juillet
    expect(screen.getByText('5')).toBeTruthy()  // dimanche 5 juillet
  })

  it('affiche le nom du jour férié dans l\'en-tête', () => {
    renderWeek({ holidays: { '2026-07-01': 'Test Férié' } })
    expect(screen.getByText('Test Férié')).toBeTruthy()
  })
})

describe('WeekView — regroupement par client', () => {
  it('regroupe les prélèvements d\'un même client en badge ×N', () => {
    renderWeek({
      eventsByDate: {
        '2026-07-01': [
          ev({ id: 'a', clientId: 'c1', subtitle: 'Point 1' }),
          ev({ id: 'b', clientId: 'c1', subtitle: 'Point 2' }),
        ],
      },
    })
    expect(screen.getByText('×2')).toBeTruthy()
  })

  it('n\'agrège pas des clients différents', () => {
    renderWeek({
      eventsByDate: {
        '2026-07-01': [
          ev({ id: 'a', clientId: 'c1', title: 'Client A' }),
          ev({ id: 'b', clientId: 'c2', title: 'Client B' }),
        ],
      },
    })
    expect(screen.getByText('Client A')).toBeTruthy()
    expect(screen.getByText('Client B')).toBeTruthy()
    expect(screen.queryByText(/^×/)).toBeNull()
  })
})

describe('WeekView — événements fantômes', () => {
  it('affiche un événement retiré avec son badge', () => {
    renderWeek({
      eventsByDate: {
        '2026-07-01': [ev({ id: 'g', title: 'Ancien RDV', isGhost: true, ghostAction: 'retiré' })],
      },
    })
    expect(screen.getByText('Ancien RDV')).toBeTruthy()
    expect(screen.getByText('↩ retiré')).toBeTruthy()
  })

  it('affiche la date de report pour un événement reporté', () => {
    renderWeek({
      eventsByDate: {
        '2026-07-01': [ev({ id: 'g', title: 'Reporté', isGhost: true, ghostAction: 'reporté', ghostNewDate: '2026-07-08' })],
      },
    })
    expect(screen.getByText('→ 08/07')).toBeTruthy()
  })
})

describe('WeekView — grisage congé scopé au technicien', () => {
  const congeEvt = ev({ id: 'cg', type: 'evenement', technicien: 'THK', title: 'Congé', evenementData: { type: 'conge' } as never })

  it('affiche l\'overlay congé quand le filtre technicien correspond', () => {
    const { container } = renderWeek({
      filterTech: 'THK',
      eventsByDate: { '2026-07-01': [congeEvt] },
    })
    expect(container.querySelector('.conge-overlay')).toBeTruthy()
  })

  it('n\'affiche pas l\'overlay congé pour un autre technicien filtré', () => {
    const { container } = renderWeek({
      filterTech: 'ROD',
      eventsByDate: { '2026-07-01': [congeEvt] },
    })
    expect(container.querySelector('.conge-overlay')).toBeNull()
  })
})
