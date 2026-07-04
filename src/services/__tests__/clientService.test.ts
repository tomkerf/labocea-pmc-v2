import { vi, describe, it, expect, beforeEach } from 'vitest'
import { saveClient, createClient, deleteClient } from '../clientService'
import { useSyncStore } from '@/stores/syncStore'
import { runTransaction, addDoc, deleteDoc, doc, collection } from 'firebase/firestore'
import type { Client } from '@/types'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'clients-v2/c1' })),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
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

const client = { id: 'c1', nom: 'Plounerin' } as unknown as Client

describe('clientService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // runTransaction exécute le callback avec notre transaction factice
    vi.mocked(runTransaction).mockImplementation((async (_db: unknown, fn: (tx: typeof mockTx) => Promise<void>) =>
      fn(mockTx)) as unknown as typeof runTransaction)
  })

  describe('saveClient', () => {
    it('écrit en merge avec updatedBy/updatedAt quand le document existe', async () => {
      mockTx.get.mockResolvedValue({ exists: () => true })

      await saveClient(client, 'user-1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'clients-v2', 'c1')
      expect(mockTx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'c1', nom: 'Plounerin', updatedBy: 'user-1', updatedAt: 'SERVER_TS' }),
        { merge: true },
      )
    })

    it('rejette sans écrire si le document a été supprimé entre-temps', async () => {
      mockTx.get.mockResolvedValue({ exists: () => false })

      await expect(saveClient(client, 'user-1')).rejects.toThrow(
        'Le document client a été supprimé — modifications perdues.',
      )
      expect(mockTx.set).not.toHaveBeenCalled()
    })

    it('laisse pendingWrites à 0 après une écriture réussie (trackWrite)', async () => {
      mockTx.get.mockResolvedValue({ exists: () => true })

      await saveClient(client, 'user-1')

      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  describe('createClient', () => {
    it('crée le document avec plans vide, createdBy et updatedBy, et retourne son id', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'new-id' } as never)

      const id = await createClient({ nom: 'Nouveau' } as never, 'user-1')

      expect(id).toBe('new-id')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'clients-v2')
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          nom: 'Nouveau',
          plans: [],
          createdBy: 'user-1',
          updatedBy: 'user-1',
          createdAt: 'SERVER_TS',
          updatedAt: 'SERVER_TS',
        }),
      )
    })
  })

  describe('deleteClient', () => {
    it('supprime le document ciblé', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined)

      await deleteClient('c1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'clients-v2', 'c1')
      expect(deleteDoc).toHaveBeenCalled()
    })
  })
})
