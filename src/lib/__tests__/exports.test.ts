import { describe, it, expect, vi } from 'vitest'
import { exportPlanningPdf } from '../exportPlanningPdf'
import { exportPlanningExcel } from '../exportPlanningExcel'
import type { PlanningEvent } from '../planningUtils'

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      internal: {
        pageSize: {
          getWidth: () => 297,
          getHeight: () => 210,
        }
      },
      setFillColor: vi.fn(),
      rect: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
      getTextWidth: vi.fn(() => 10),
      roundedRect: vi.fn(),
      save: vi.fn(),
    }))
  }
})

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn(),
  }
})

vi.mock('xlsx', () => {
  return {
    utils: {
      book_new: vi.fn(() => ({})),
      aoa_to_sheet: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    write: vi.fn(() => new Uint8Array()),
  }
})

describe('Exports Planning', () => {
  const mockEvents: PlanningEvent[] = [
    {
      id: 'e1',
      type: 'prelevement',
      title: 'Plounerin',
      subtitle: 'Réseaux de mesure',
      statusLabel: 'Planifié',
      statusBg: '',
      statusColor: '',
      link: '',
      isDone: false,
      priority: 2,
      technicien: 'THK',
      plannedTime: '08:30',
      frequence: 'Mensuel',
      meteo: 'pluie',
      lat: '48.56',
      lng: '-3.45',
    },
    {
      id: 'e2',
      type: 'maintenance',
      title: 'YSI Pro30',
      subtitle: 'S/N 1234',
      statusLabel: 'En cours',
      statusBg: '',
      statusColor: '',
      link: '',
      isDone: false,
      priority: 2,
      technicien: 'HUJ',
      maintenanceData: {
        id: 'm1',
        equipementId: 'eq1',
        equipementNom: 'YSI Pro30',
        type: 'corrective',
        statut: 'en_cours',
        datePrevue: '2026-05-26',
        dateRealisee: null,
        dureeHeures: null,
        description: 'Changer la sonde',
        travauxRealises: '',
        piecesRemplacees: '',
        technicienUid: 'u1',
        technicienNom: 'Hubert Jehl',
        cout: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedAt: { seconds: 0, nanoseconds: 0 } as any,
      }
    }
  ]

  const mockUsers = [
    { uid: 'u1', prenom: 'Hubert', nom: 'Jehl', initiales: 'HUJ', email: 'hubert.jehl@labocea.fr', role: 'technicien' },
    { uid: 'u2', prenom: 'Thomas', nom: 'Kerfendal', initiales: 'THK', email: 'tom@labocea.fr', role: 'admin' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any[]

  it('exportPlanningPdf s\'exécute sans erreur', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    expect(() => {
      exportPlanningPdf(mockEvents, 'Semaine du 25 mai 2026', 'THK', mockUsers)
    }).not.toThrow()

    spy.mockRestore()
  })

  it('exportPlanningExcel s\'exécute sans erreur', () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()

    expect(() => {
      exportPlanningExcel(mockEvents, 'Semaine du 25 mai 2026', 'THK')
    }).not.toThrow()

    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  })
})
