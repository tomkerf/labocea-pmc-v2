import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePlanningActions } from '../usePlanningActions'
import { saveClient } from '@/services/clientService'
import { createEvenement, deleteEvenement, updateEvenementDate } from '@/services/evenementService'
import { sendPushToTechnician } from '@/services/notificationService'
import { toISO } from '@/lib/planningUtils'
import type { Client, Sampling } from '@/types'
import type { PlanningEvent, PoolItem } from '@/lib/planningUtils'

vi.mock('@/services/clientService', () => ({
  saveClient: vi.fn(),
}))

vi.mock('@/services/evenementService', () => ({
  createEvenement: vi.fn(),
  deleteEvenement: vi.fn(),
  updateEvenementDate: vi.fn(),
}))

vi.mock('@/services/notificationService', () => ({
  sendPushToTechnician: vi.fn(),
}))

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }))
vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => ({ add: addToast }),
}))

function makeClient(): Client {
  return {
    id: 'c1',
    nom: 'Plounerin',
    plans: [
      {
        id: 'p1',
        nom: 'Point A',
        samplings: [
          {
            id: 's1',
            num: 1,
            plannedMonth: 2,
            plannedDay: 15,
            status: 'planned',
            doneDate: '',
            reportHistory: [],
            doneBy: '',
          } as unknown as Sampling,
        ],
      },
    ],
  } as unknown as Client
}

const samplingEvent = {
  id: 'e1',
  type: 'prelevement',
  clientId: 'c1',
  planId: 'p1',
  samplingId: 's1',
  technicien: 'ROD',
} as unknown as PlanningEvent

/** Sampling s1 tel que passé à saveClient */
function savedSampling(): Sampling {
  const saved = vi.mocked(saveClient).mock.calls[0][0]
  return saved.plans.find((p) => p.id === 'p1')!.samplings.find((s) => s.id === 's1')!
}

describe('usePlanningActions', () => {
  function setup(overrides: Partial<Parameters<typeof usePlanningActions>[0]> = {}) {
    const { result } = renderHook(() =>
      usePlanningActions({
        uid: 'u-me',
        initiales: 'THK',
        clients: [makeClient()],
        evenements: [],
        holidays: {},
        ...overrides,
      }),
    )
    return result.current
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(saveClient).mockResolvedValue(undefined)
    vi.mocked(deleteEvenement).mockResolvedValue(undefined)
    vi.mocked(createEvenement).mockResolvedValue(undefined as never)
    vi.mocked(updateEvenementDate).mockResolvedValue(undefined)
  })

  describe('handleMoveEvent — report de prélèvement', () => {
    it('replanifie au bon jour/mois et trace le report avec son motif', async () => {
      const actions = setup()
      await actions.handleMoveEvent(samplingEvent, '2026-09-03', 'Client absent')

      const s = savedSampling()
      expect(s.plannedDay).toBe(3)
      expect(s.plannedMonth).toBe(8) // septembre (0-based)

      const expectedFrom = toISO(new Date(new Date().getFullYear(), 2, 15))
      expect(s.reportHistory).toHaveLength(1)
      expect(s.reportHistory[0]).toMatchObject({
        from: expectedFrom,
        to: '2026-09-03',
        by: 'u-me',
        reason: 'Client absent',
      })
    })

    it('affiche un toast en cas d\'échec Firestore', async () => {
      vi.mocked(saveClient).mockRejectedValue(new Error('offline'))
      const actions = setup()
      await actions.handleMoveEvent(samplingEvent, '2026-09-03', 'motif')

      expect(addToast).toHaveBeenCalledWith('error', 'Erreur lors du report du prélèvement')
    })

    it('verrouille les doubles-clics pendant une écriture en cours (isPending)', async () => {
      let resolveSave!: () => void
      vi.mocked(saveClient).mockImplementation(() => new Promise((r) => { resolveSave = () => r(undefined) }))
      const actions = setup()

      const first = actions.handleMoveEvent(samplingEvent, '2026-09-03', 'motif')
      const second = actions.handleMoveEvent(samplingEvent, '2026-09-04', 'motif bis')

      resolveSave()
      await Promise.all([first, second])

      expect(saveClient).toHaveBeenCalledTimes(1)
    })

    it('ne fait rien sans uid', async () => {
      const actions = setup({ uid: null })
      await actions.handleMoveEvent(samplingEvent, '2026-09-03', 'motif')

      expect(saveClient).not.toHaveBeenCalled()
    })
  })

  describe('handleCancelSampling — retrait', () => {
    it('retire le prélèvement (plannedDay 0) et trace le motif du retrait', async () => {
      const actions = setup()
      await actions.handleCancelSampling(samplingEvent, 'Site inaccessible')

      const s = savedSampling()
      expect(s.plannedDay).toBe(0)
      expect(s.motif).toBe('Site inaccessible')
      expect(s.reportHistory[0]).toMatchObject({ to: '', reason: 'Site inaccessible', by: 'u-me' })
    })
  })

  describe('toggleRainDay', () => {
    it('crée un événement météo si le jour n\'en a pas', async () => {
      const actions = setup()
      await actions.toggleRainDay('2026-07-10')

      expect(createEvenement).toHaveBeenCalledWith('Pluie prévue', '2026-07-10', 'meteo', '', '', 'u-me', 'THK')
      expect(deleteEvenement).not.toHaveBeenCalled()
    })

    it('supprime l\'événement météo existant du même jour', async () => {
      const actions = setup({ evenements: [{ id: 'ev-meteo', type: 'meteo', date: '2026-07-10' }] })
      await actions.toggleRainDay('2026-07-10')

      expect(deleteEvenement).toHaveBeenCalledWith('ev-meteo')
      expect(createEvenement).not.toHaveBeenCalled()
    })
  })

  describe('handleChangeTechnicien', () => {
    it('met à jour assignedTo et notifie le nouveau technicien', async () => {
      const actions = setup()
      await actions.handleChangeTechnicien(samplingEvent, 'FBA')

      expect(savedSampling().assignedTo).toBe('FBA')
      await vi.waitFor(() => {
        expect(sendPushToTechnician).toHaveBeenCalledWith(
          'FBA',
          expect.any(String),
          expect.stringContaining('Plounerin'),
          '/missions/c1/plan/p1',
        )
      })
    })

    it('ne notifie pas si le technicien est inchangé', async () => {
      const actions = setup()
      await actions.handleChangeTechnicien(samplingEvent, 'ROD') // = event.technicien

      expect(savedSampling().assignedTo).toBe('ROD')
      await new Promise((r) => setTimeout(r, 10))
      expect(sendPushToTechnician).not.toHaveBeenCalled()
    })
  })

  describe('handleChangeEquipements', () => {
    it('assigne la liste d\'équipements au prélèvement', async () => {
      const actions = setup()
      await actions.handleChangeEquipements(samplingEvent, ['eq-1', 'eq-2'])

      expect(savedSampling().equipementsAssignes).toEqual(['eq-1', 'eq-2'])
    })
  })

  describe('handleMoveEvenement — durée préservée', () => {
    it('décale dateFin du même delta que la date de début', async () => {
      const actions = setup()
      const event = {
        evenementData: { id: 'ev1', date: '2026-07-01', dateFin: '2026-07-03' },
      } as unknown as PlanningEvent

      await actions.handleMoveEvenement(event, '2026-07-10')

      expect(updateEvenementDate).toHaveBeenCalledWith('ev1', '2026-07-10', '2026-07-12')
    })
  })

  describe('handleDeleteEvent', () => {
    it('supprime l\'événement et affiche un toast en cas d\'échec', async () => {
      vi.mocked(deleteEvenement).mockRejectedValue(new Error('permission-denied'))
      const actions = setup()
      const event = { evenementData: { id: 'ev1', date: '2026-07-01' } } as unknown as PlanningEvent

      await actions.handleDeleteEvent(event)

      expect(deleteEvenement).toHaveBeenCalledWith('ev1')
      expect(addToast).toHaveBeenCalledWith('error', 'Erreur lors de la suppression de l\'événement')
    })
  })

  describe('handleValidatePool', () => {
    const poolItem = {
      clientId: 'c1',
      planId: 'p1',
      sampling: { id: 's1' },
    } as unknown as PoolItem

    it('planifie le prélèvement à la date déposée', async () => {
      const actions = setup()
      await actions.handleValidatePool(poolItem, '2026-08-20')

      const s = savedSampling()
      expect(s.plannedDay).toBe(20)
      expect(s.plannedMonth).toBe(7) // août (0-based)
    })

    it('refuse de planifier sur un jour férié', async () => {
      const actions = setup({ holidays: { '2026-07-14': 'Fête nationale' } })
      await actions.handleValidatePool(poolItem, '2026-07-14')

      expect(saveClient).not.toHaveBeenCalled()
    })
  })
})
