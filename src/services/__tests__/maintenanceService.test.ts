import { vi, describe, it, expect, beforeEach } from 'vitest'
import { saveMaintenance, createMaintenance } from '../maintenanceService'
import { useSyncStore } from '@/stores/syncStore'
import { setDoc, addDoc, doc, collection } from 'firebase/firestore'
import type { Maintenance } from '@/types'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'maintenances/m1' })),
  setDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-maint' })),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

const maintenance = { id: 'm1', equipementNom: 'Préleveur' } as unknown as Maintenance

describe('maintenanceService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('saveMaintenance', () => {
    it('écrit en merge avec updatedAt/updatedBy', async () => {
      await saveMaintenance(maintenance, 'user-1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'maintenances', 'm1')
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'm1', updatedAt: 'SERVER_TS', updatedBy: 'user-1' }),
        { merge: true },
      )
    })

    it('laisse pendingWrites à 0 après une écriture réussie (trackWrite)', async () => {
      await saveMaintenance(maintenance, 'user-1')
      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  describe('createMaintenance', () => {
    it('crée une maintenance préventive planifiée avec les défauts et retourne son id', async () => {
      const id = await createMaintenance('user-1', 'JD')

      expect(id).toBe('new-maint')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'maintenances')
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          type: 'preventive',
          statut: 'planifiee',
          dateRealisee: null,
          technicienUid: 'user-1',
          technicienNom: 'JD',
          createdAt: 'SERVER_TS',
          updatedAt: 'SERVER_TS',
        }),
      )
    })

    it('applique la date prévue du jour au format ISO (YYYY-MM-DD)', async () => {
      await createMaintenance('user-1', 'JD')

      const [, payload] = vi.mocked(addDoc).mock.calls[0] as [unknown, { datePrevue: string }]
      expect(payload.datePrevue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
