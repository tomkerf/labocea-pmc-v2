import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTodosListener } from '../useTodos'
import { useTodosStore } from '@/stores/todosStore'
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('useTodosListener', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useTodosStore.getState().setError(null)
    useTodosStore.getState().setTodos([])
  })

  it('correctly subscribes to the collection and updates the store on success', () => {
    let capturedOnNext: any = null

    vi.mocked(onSnapshot).mockImplementation((_q, onNext, _onError) => {
      capturedOnNext = onNext
      return mockUnsubscribe
    })

    const { unmount } = renderHook(() => useTodosListener())

    // Check that we queried correctly
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'todos')
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(query).toHaveBeenCalled()
    expect(onSnapshot).toHaveBeenCalled()

    // Now simulate Firestore snapshot
    const mockTodoData = { titre: 'Nettoyer glacière', priorite: 'moyenne', statut: 'a_faire' }
    const mockSnap = {
      docs: [
        {
          id: 'todo-123',
          data: () => mockTodoData,
        },
      ],
    }

    expect(capturedOnNext).not.toBeNull()
    act(() => {
      capturedOnNext(mockSnap)
    })

    // Check store state
    const storeState = useTodosStore.getState()
    expect(storeState.todos).toEqual([
      { id: 'todo-123', titre: 'Nettoyer glacière', priorite: 'moyenne', statut: 'a_faire' },
    ])
    expect(storeState.loading).toBe(false)
    expect(storeState.error).toBeNull()

    // Test unsubscribe on unmount
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('handles snapshot error by updating store', () => {
    let capturedOnError: any = null

    vi.mocked(onSnapshot).mockImplementation((_q, _onNext, onError) => {
      capturedOnError = onError
      return mockUnsubscribe
    })

    renderHook(() => useTodosListener())

    expect(capturedOnError).not.toBeNull()
    act(() => {
      capturedOnError(new Error('Firestore read failed'))
    })

    // Check store error state
    const storeState = useTodosStore.getState()
    expect(storeState.error).toBe('Firestore read failed')
    expect(storeState.loading).toBe(false)
  })
})
