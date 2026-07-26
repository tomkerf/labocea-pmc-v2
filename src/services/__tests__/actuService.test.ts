import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createActu, updateActu, deleteActu, markActuAsRead, markActuAsUnread } from '../actuService'
import { useSyncStore } from '@/stores/syncStore'
import { addDoc, updateDoc, deleteDoc, doc, collection, arrayUnion, arrayRemove } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'actus/a1' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-actu' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  arrayUnion: vi.fn((v) => ({ __arrayUnion: v })),
  arrayRemove: vi.fn((v) => ({ __arrayRemove: v })),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

describe('actuService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createActu', () => {
    it('crée une actu et marque l\'auteur comme lecteur par défaut', async () => {
      const id = await createActu('Titre', 'Contenu', 'info' as never, true, 'user-1', 'JD')

      expect(id).toBe('new-actu')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'actus')
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          titre: 'Titre',
          contenu: 'Contenu',
          categorie: 'info',
          prioritaire: true,
          auteurUid: 'user-1',
          auteurInitiales: 'JD',
          lectureUids: ['user-1'],
        }),
      )
    })

    it('laisse pendingWrites à 0 après création (trackWrite)', async () => {
      await createActu('T', 'C', 'info' as never, false, 'user-1', 'JD')
      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  describe('updateActu', () => {
    it('met à jour les champs éditables avec updatedAt', async () => {
      await updateActu('a1', 'Nouveau', 'MàJ', 'alerte' as never, false)

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'actus', 'a1')
      const [, payload] = vi.mocked(updateDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>]
      expect(payload).toMatchObject({ titre: 'Nouveau', contenu: 'MàJ', categorie: 'alerte', prioritaire: false })
      expect(payload).toHaveProperty('updatedAt')
    })
  })

  describe('deleteActu', () => {
    it('supprime le document ciblé', async () => {
      await deleteActu('a1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'actus', 'a1')
      expect(deleteDoc).toHaveBeenCalled()
    })
  })

  describe('markActuAsRead', () => {
    it('ajoute l\'uid via arrayUnion', async () => {
      await markActuAsRead('a1', 'user-2')

      expect(arrayUnion).toHaveBeenCalledWith('user-2')
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { lectureUids: { __arrayUnion: 'user-2' } },
      )
    })
  })

  describe('markActuAsUnread', () => {
    it('retire l\'uid via arrayRemove', async () => {
      await markActuAsUnread('a1', 'user-2')

      expect(arrayRemove).toHaveBeenCalledWith('user-2')
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { lectureUids: { __arrayRemove: 'user-2' } },
      )
    })
  })
})
