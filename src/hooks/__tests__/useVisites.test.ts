import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVisites } from '../useVisites'
import { onSnapshot, collection, query, where, orderBy } from 'firebase/firestore'

type SnapshotDoc = {
  id: string
  data: () => Record<string, unknown>
}

type Snapshot = {
  docs: SnapshotDoc[]
}

type OnNext = (snap: Snapshot) => void
type OnError = (error: Error) => void

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('useVisites', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('écoute les visites liées sans index composite et les trie par date décroissante', () => {
    let capturedOnNext: OnNext | null = null

    vi.mocked(onSnapshot).mockImplementation((_q, onNext) => {
      capturedOnNext = onNext as OnNext
      return mockUnsubscribe
    })

    const { result, unmount } = renderHook(() => useVisites('client-1'))

    expect(collection).toHaveBeenCalledWith(expect.anything(), 'visites')
    expect(where).toHaveBeenCalledWith('linkedTo.id', '==', 'client-1')
    expect(orderBy).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalled()

    expect(capturedOnNext).not.toBeNull()
    act(() => {
      capturedOnNext?.({
        docs: [
          { id: 'old', data: () => ({ date: '2026-05-20', points: [] }) },
          { id: 'new', data: () => ({ date: '2026-05-26', points: [] }) },
        ],
      })
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.visites.map(v => v.id)).toEqual(['new', 'old'])

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('arrête le chargement si Firestore renvoie une erreur', () => {
    let capturedOnError: OnError | null = null

    vi.mocked(onSnapshot).mockImplementation((_q, _onNext, onError) => {
      capturedOnError = onError as unknown as OnError
      return mockUnsubscribe
    })

    const { result } = renderHook(() => useVisites('client-1'))

    expect(result.current.loading).toBe(true)
    expect(capturedOnError).not.toBeNull()

    act(() => {
      capturedOnError?.(new Error('Missing index'))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.visites).toEqual([])
  })
})
