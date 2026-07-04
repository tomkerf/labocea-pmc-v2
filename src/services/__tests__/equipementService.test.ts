import { vi, describe, it, expect, beforeEach } from 'vitest'
import { saveEquipement, createEquipement } from '../equipementService'
import { runTransaction, addDoc, doc, collection } from 'firebase/firestore'
import type { Equipement } from '@/types'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'equipements/e1' })),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  runTransaction: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

const mockTx = {
  get: vi.fn(),
  set: vi.fn(),
}

const equipement = { id: 'e1', nom: 'Préleveur ISCO' } as unknown as Equipement

describe('equipementService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(runTransaction).mockImplementation((async (_db: unknown, fn: (tx: typeof mockTx) => Promise<void>) =>
      fn(mockTx)) as unknown as typeof runTransaction)
  })

  describe('saveEquipement', () => {
    it('écrit en merge avec updatedBy/updatedAt quand le document existe', async () => {
      mockTx.get.mockResolvedValue({ exists: () => true })

      await saveEquipement(equipement, 'user-1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'equipements', 'e1')
      expect(mockTx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'e1', updatedBy: 'user-1', updatedAt: 'SERVER_TS' }),
        { merge: true },
      )
    })

    it("rejette sans écrire si l'équipement a été supprimé entre-temps", async () => {
      mockTx.get.mockResolvedValue({ exists: () => false })

      await expect(saveEquipement(equipement, 'user-1')).rejects.toThrow(
        "L'équipement a été supprimé — modifications perdues.",
      )
      expect(mockTx.set).not.toHaveBeenCalled()
    })
  })

  describe('createEquipement', () => {
    it('crée un équipement avec les valeurs par défaut et createdBy, et retourne son id', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'new-eq' } as never)

      const id = await createEquipement('user-1')

      expect(id).toBe('new-eq')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'equipements')
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          categorie: 'autre',
          etat: 'operationnel',
          localisation: 'labo',
          createdBy: 'user-1',
          createdAt: 'SERVER_TS',
          updatedAt: 'SERVER_TS',
        }),
      )
    })
  })
})
