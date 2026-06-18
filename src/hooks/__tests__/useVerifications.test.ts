import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

type SnapCallback = (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void
type ErrorCallback = (error: Error) => void
import { useVerificationsListener } from '../useVerifications'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn()
}))

vi.mock('@/lib/firebase', () => ({
  db: {}
}))

describe('useVerificationsListener', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useMetrologieStore.getState().setError(null)
    useMetrologieStore.getState().setVerifications([])
  })

  it('correctly subscribes to the collection and updates the store on success', () => {
    let capturedOnNext: SnapCallback | null = null

    vi.mocked(onSnapshot).mockImplementation((_q, onNext) => {
      capturedOnNext = onNext as unknown as SnapCallback
      return mockUnsubscribe
    })

    const { unmount } = renderHook(() => useVerificationsListener())

    // Check that we queried correctly
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'verifications')
    expect(orderBy).toHaveBeenCalledWith('date', 'desc')
    expect(limit).toHaveBeenCalledWith(200)
    expect(query).toHaveBeenCalled()
    expect(onSnapshot).toHaveBeenCalled()

    // Now simulate Firestore snapshot
    const mockVerificationData = {
      equipementId: 'equip-123',
      equipementNom: 'YSI Pro30',
      type: 'etalonnage_interne',
      resultat: 'conforme'
    }
    const mockSnap = {
      docs: [
        {
          id: 'verif-999',
          data: () => mockVerificationData
        }
      ]
    }

    expect(capturedOnNext).not.toBeNull()
    act(() => {
      capturedOnNext!(mockSnap)
    })

    // Check store state
    const storeState = useMetrologieStore.getState()
    expect(storeState.verifications).toEqual([
      {
        id: 'verif-999',
        equipementId: 'equip-123',
        equipementNom: 'YSI Pro30',
        type: 'etalonnage_interne',
        resultat: 'conforme'
      }
    ])
    expect(storeState.loading).toBe(false)
    expect(storeState.error).toBeNull()

    // Test unsubscribe on unmount
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('handles snapshot error by updating store', () => {
    let capturedOnError: ErrorCallback | null = null

    vi.mocked(onSnapshot).mockImplementation((_q, _onNext, onError) => {
      capturedOnError = onError as unknown as ErrorCallback
      return mockUnsubscribe
    })

    renderHook(() => useVerificationsListener())

    expect(capturedOnError).not.toBeNull()
    act(() => {
      capturedOnError!(new Error('Firestore read error'))
    })

    // Check store error state
    const storeState = useMetrologieStore.getState()
    expect(storeState.error).toBe('Firestore read error')
    expect(storeState.loading).toBe(false)
  })
})
