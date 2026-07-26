import { vi, describe, it, expect, beforeEach } from 'vitest'
import { saveTodo, createTodo, deleteTodo } from '../todoService'
import { useSyncStore } from '@/stores/syncStore'
import { setDoc, addDoc, deleteDoc, doc, collection } from 'firebase/firestore'
import type { Todo } from '@/types'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'todos/t1' })),
  setDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-todo' })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

const todo = {
  id: 't1',
  titre: 'Relance client',
  createdAt: 'OLD_TS',
} as unknown as Todo

describe('todoService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('saveTodo', () => {
    it('écrit en merge avec updatedAt et sans écraser createdAt', async () => {
      await saveTodo(todo, 'user-1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'todos', 't1')
      const [, payload, options] = vi.mocked(setDoc).mock.calls[0]
      expect(payload).toMatchObject({ id: 't1', titre: 'Relance client', updatedAt: 'SERVER_TS' })
      expect(payload).not.toHaveProperty('createdAt')
      expect(options).toEqual({ merge: true })
    })

    it('retire les champs undefined avant écriture (cleanObject)', async () => {
      await saveTodo({ id: 't1', titre: 'X', assigneA: undefined } as unknown as Todo, 'user-1')

      const [, payload] = vi.mocked(setDoc).mock.calls[0]
      expect(payload).not.toHaveProperty('assigneA')
    })

    it('laisse pendingWrites à 0 après une écriture réussie (trackWrite)', async () => {
      await saveTodo(todo, 'user-1')
      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  describe('createTodo', () => {
    it('crée le todo avec createdBy/createdAt/updatedAt et retourne son id', async () => {
      const id = await createTodo('user-1', { titre: 'Nouveau' } as never)

      expect(id).toBe('new-todo')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'todos')
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          titre: 'Nouveau',
          createdBy: 'user-1',
          createdAt: 'SERVER_TS',
          updatedAt: 'SERVER_TS',
        }),
      )
    })
  })

  describe('deleteTodo', () => {
    it('supprime le document ciblé', async () => {
      await deleteTodo('t1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'todos', 't1')
      expect(deleteDoc).toHaveBeenCalled()
    })
  })
})
