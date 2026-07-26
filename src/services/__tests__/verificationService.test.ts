import { vi, describe, it, expect, beforeEach } from 'vitest'
import { saveVerification, createVerification } from '../verificationService'
import { useSyncStore } from '@/stores/syncStore'
import { setDoc, addDoc, doc, collection } from 'firebase/firestore'
import type { Verification } from '@/types'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'verifications/v1' })),
  setDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-verif' })),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

const verification = { id: 'v1', equipementNom: 'pH-mètre' } as unknown as Verification

describe('verificationService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('saveVerification', () => {
    it('écrit en merge avec updatedAt/updatedBy', async () => {
      await saveVerification(verification, 'user-1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'verifications', 'v1')
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'v1', updatedAt: 'SERVER_TS', updatedBy: 'user-1' }),
        { merge: true },
      )
    })

    it('laisse pendingWrites à 0 après une écriture réussie (trackWrite)', async () => {
      await saveVerification(verification, 'user-1')
      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  describe('createVerification', () => {
    it('crée une vérification avec les valeurs par défaut et retourne son id', async () => {
      const id = await createVerification('user-1', 'JD')

      expect(id).toBe('new-verif')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'verifications')
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          type: 'etalonnage_interne',
          resultat: 'conforme',
          technicienUid: 'user-1',
          technicienNom: 'JD',
          createdAt: 'SERVER_TS',
        }),
      )
    })

    it('applique la date du jour au format ISO (YYYY-MM-DD)', async () => {
      await createVerification('user-1', 'JD')

      const [, payload] = vi.mocked(addDoc).mock.calls[0] as [unknown, { date: string }]
      expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('les valeurs initiales surchargent les valeurs par défaut', async () => {
      await createVerification('user-1', 'JD', { resultat: 'non_conforme', equipementNom: 'Sonde' } as never)

      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ resultat: 'non_conforme', equipementNom: 'Sonde' }),
      )
    })
  })
})
