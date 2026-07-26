import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createEvenement, deleteEvenement, updateEvenementDate } from '../evenementService'
import { useSyncStore } from '@/stores/syncStore'
import { addDoc, deleteDoc, updateDoc, doc, collection } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'evenements/ev1' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-ev' })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

describe('evenementService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createEvenement', () => {
    it('crée un événement et retourne son id', async () => {
      const id = await createEvenement('Réunion', '2026-08-01', 'reunion' as never, '09:00', 'notes', 'user-1', 'JD')

      expect(id).toBe('new-ev')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'evenements')
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          titre: 'Réunion',
          date: '2026-08-01',
          type: 'reunion',
          heure: '09:00',
          notes: 'notes',
          createdBy: 'user-1',
          createdByInitiales: 'JD',
          createdAt: 'SERVER_TS',
        }),
      )
    })

    it('normalise les champs optionnels vides en null', async () => {
      await createEvenement('Réunion', '2026-08-01', 'reunion' as never, '', '', 'user-1')

      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          dateFin: null,
          heure: null,
          notes: null,
          createdByInitiales: null,
        }),
      )
    })

    it('laisse pendingWrites à 0 après création (trackWrite)', async () => {
      await createEvenement('R', '2026-08-01', 'reunion' as never, '', '', 'user-1')
      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  describe('deleteEvenement', () => {
    it('supprime le document ciblé', async () => {
      await deleteEvenement('ev1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'evenements', 'ev1')
      expect(deleteDoc).toHaveBeenCalled()
    })
  })

  describe('updateEvenementDate', () => {
    it('met à jour date et dateFin (préserve le reste)', async () => {
      await updateEvenementDate('ev1', '2026-08-05', '2026-08-06')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'evenements', 'ev1')
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { date: '2026-08-05', dateFin: '2026-08-06' },
      )
    })

    it('met dateFin à null quand elle est absente', async () => {
      await updateEvenementDate('ev1', '2026-08-05')

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { date: '2026-08-05', dateFin: null },
      )
    })
  })
})
