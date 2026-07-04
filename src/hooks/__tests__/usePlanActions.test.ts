import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePlanActions } from '../usePlanActions'
import { sendPushToTechnician } from '@/services/notificationService'
import type { Client, Plan, Sampling, AppUser } from '@/types'

vi.mock('@/services/notificationService', () => ({
  sendPushToTechnician: vi.fn(),
}))

function makeSampling(overrides: Partial<Sampling> = {}): Sampling {
  return {
    id: 's1',
    num: 1,
    plannedMonth: 2,
    plannedDay: 15,
    status: 'planned',
    doneDate: '',
    comment: '',
    nappe: '' as Sampling['nappe'],
    rapportPrevu: false,
    rapportDate: '',
    tente: false,
    reportHistory: [],
    doneBy: '',
    ...overrides,
  }
}

function makePlan(samplings: Sampling[]): Plan {
  return { id: 'p1', nom: 'Point A', samplings } as unknown as Plan
}

function makeClient(plan: Plan): Client {
  return {
    id: 'c1',
    nom: 'Plounerin',
    plans: [plan, { id: 'p2', nom: 'Autre point', samplings: [] } as unknown as Plan],
  } as unknown as Client
}

const users = [
  { uid: 'u-tech', prenom: 'Romain', nom: 'Duvail' },
  { uid: 'u-me', prenom: 'Thomas', nom: 'Kerfendal' },
] as unknown as AppUser[]

describe('usePlanActions', () => {
  let triggerSave: ReturnType<typeof vi.fn>
  let setSelectedSampling: ReturnType<typeof vi.fn>
  let setPdfPreview: ReturnType<typeof vi.fn>

  function setup(samplingOverrides: Partial<Sampling> = {}, extraSamplings: Sampling[] = []) {
    const plan = makePlan([makeSampling(samplingOverrides), ...extraSamplings])
    const client = makeClient(plan)
    const { result } = renderHook(() => usePlanActions({
      uid: 'u-me',
      currentUserNom: 'Thomas K.',
      users,
      planId: 'p1',
      plan,
      clientId: 'c1',
      client,
      triggerSave: triggerSave as unknown as (c: Client) => void,
      setPdfPreview: setPdfPreview as never,
      setSelectedSampling: setSelectedSampling as never,
    }))
    return { actions: result.current, plan, client }
  }

  /** Récupère le sampling s1 du plan p1 dans le client passé à triggerSave */
  function savedSampling(): Sampling {
    const saved = triggerSave.mock.calls[0][0] as Client
    return saved.plans.find((p) => p.id === 'p1')!.samplings.find((s) => s.id === 's1')!
  }

  beforeEach(() => {
    vi.clearAllMocks()
    triggerSave = vi.fn()
    setSelectedSampling = vi.fn()
    setPdfPreview = vi.fn()
  })

  describe('updateSampling — règles métier', () => {
    it('passe doneBy au uid courant quand le statut devient done', () => {
      const { actions } = setup()
      actions.updateSampling('s1', 'status', 'done')

      const s = savedSampling()
      expect(s.status).toBe('done')
      expect(s.doneBy).toBe('u-me')
    })

    it('vide doneBy quand le statut quitte done', () => {
      const { actions } = setup({ status: 'done', doneBy: 'u-tech' })
      actions.updateSampling('s1', 'status', 'planned')

      expect(savedSampling().doneBy).toBe('')
    })

    it('efface dateUndefined dès qu\'une date est fixée (plannedMonth/plannedDay)', () => {
      const { actions } = setup({ dateUndefined: true })
      actions.updateSampling('s1', 'plannedMonth', 5)

      expect(savedSampling().dateUndefined).toBe(false)
    })

    it('calcule rapportDatePrevue (doneDate + 1 mois) quand rapportPrevu est activé', () => {
      const { actions } = setup({ doneDate: '2026-03-15' })
      actions.updateSampling('s1', 'rapportPrevu', true)

      expect(savedSampling().rapportDatePrevue).toBe('2026-04-15')
    })

    it('ne recalcule pas rapportDatePrevue si elle existe déjà', () => {
      const { actions } = setup({ doneDate: '2026-03-15', rapportDatePrevue: '2026-05-01' })
      actions.updateSampling('s1', 'rapportPrevu', true)

      expect(savedSampling().rapportDatePrevue).toBe('2026-05-01')
    })

    it('ajoute une entrée d\'audit lisible sur un changement de statut', () => {
      const { actions } = setup()
      actions.updateSampling('s1', 'status', 'done')

      const history = savedSampling().history!
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        by: 'u-me',
        byNom: 'Thomas K.',
        field: 'status',
        from: 'Planifié',
        to: 'Réalisé',
      })
    })

    it('n\'ajoute pas d\'entrée d\'audit si la valeur ne change pas', () => {
      const { actions } = setup({ status: 'done', doneBy: 'u-me' })
      actions.updateSampling('s1', 'status', 'done')

      expect(savedSampling().history).toBeUndefined()
    })

    it('résout les noms des techniciens dans l\'audit de doneBy', () => {
      const { actions } = setup({ status: 'done', doneBy: 'u-me' })
      actions.updateSampling('s1', 'doneBy', 'u-tech')

      const entry = savedSampling().history![0]
      expect(entry.from).toBe('Thomas Kerfendal')
      expect(entry.to).toBe('Romain Duvail')
    })

    it('envoie une notification push quand le technicien assigné change', async () => {
      const { actions } = setup({ assignedTo: '' })
      actions.updateSampling('s1', 'assignedTo', 'u-tech')

      await vi.waitFor(() => {
        expect(sendPushToTechnician).toHaveBeenCalledWith(
          'u-tech',
          expect.any(String),
          expect.stringContaining('Plounerin'),
          '/missions/c1/plan/p1',
        )
      })
    })

    it('n\'envoie pas de push si le technicien assigné est inchangé', async () => {
      const { actions } = setup({ assignedTo: 'u-tech' })
      actions.updateSampling('s1', 'assignedTo', 'u-tech')

      // laisser le temps à un éventuel import dynamique de se résoudre
      await new Promise((r) => setTimeout(r, 10))
      expect(sendPushToTechnician).not.toHaveBeenCalled()
    })
  })

  describe('deleteSampling', () => {
    it('renumérote les prélèvements restants et désélectionne le supprimé', () => {
      const { actions } = setup({}, [
        makeSampling({ id: 's2', num: 2 }),
        makeSampling({ id: 's3', num: 3 }),
      ])
      actions.deleteSampling('s2', 's2')

      const saved = triggerSave.mock.calls[0][0] as Client
      const samplings = saved.plans.find((p) => p.id === 'p1')!.samplings
      expect(samplings.map((s) => s.id)).toEqual(['s1', 's3'])
      expect(samplings.map((s) => s.num)).toEqual([1, 2])
      expect(setSelectedSampling).toHaveBeenCalledWith(null)
    })

    it('ne désélectionne pas si un autre prélèvement était sélectionné', () => {
      const { actions } = setup({}, [makeSampling({ id: 's2', num: 2 })])
      actions.deleteSampling('s2', 's1')

      expect(setSelectedSampling).not.toHaveBeenCalled()
    })
  })

  describe('addCustomSampling', () => {
    it('ajoute un prélèvement sans date (dateUndefined) numéroté en fin de liste', () => {
      const { actions } = setup()
      actions.addCustomSampling()

      const saved = triggerSave.mock.calls[0][0] as Client
      const samplings = saved.plans.find((p) => p.id === 'p1')!.samplings
      expect(samplings).toHaveLength(2)
      expect(samplings[1]).toMatchObject({ num: 2, dateUndefined: true, status: 'planned' })
      expect(samplings[1].id).toBeTruthy()
    })
  })

  describe('updatePlan', () => {
    it('ne modifie que le plan ciblé', () => {
      const { actions } = setup()
      actions.updatePlan('nom', 'Point A renommé')

      const saved = triggerSave.mock.calls[0][0] as Client
      expect(saved.plans.find((p) => p.id === 'p1')!.nom).toBe('Point A renommé')
      expect(saved.plans.find((p) => p.id === 'p2')!.nom).toBe('Autre point')
    })
  })

  describe('garde-fous', () => {
    it('ne sauvegarde rien sans client ou plan chargé', () => {
      const { result } = renderHook(() => usePlanActions({
        uid: 'u-me',
        currentUserNom: 'Thomas K.',
        users,
        planId: 'p1',
        plan: null,
        clientId: 'c1',
        client: null,
        triggerSave: triggerSave as unknown as (c: Client) => void,
        setPdfPreview: setPdfPreview as never,
        setSelectedSampling: setSelectedSampling as never,
      }))
      const actions = result.current

      actions.updatePlan('nom', 'X')
      actions.updateSampling('s1', 'status', 'done')
      actions.generateSamplingsForPlan()
      actions.addCustomSampling()
      actions.deleteSampling('s1', null)

      expect(triggerSave).not.toHaveBeenCalled()
    })
  })
})
