import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

type SnapCallback = (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void
type ErrorCallback = (error: Error) => void
import { useEquipementsListener } from '../useEquipements'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn()
}))

vi.mock('@/lib/firebase', () => ({
  db: {}
}))

describe('useEquipementsListener', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useEquipementsStore.getState().setError(null)
    useEquipementsStore.getState().setEquipements([])
  })

  it('correctly subscribes to the collection and updates the store on success', () => {
    let capturedOnNext: SnapCallback | null = null

    vi.mocked(onSnapshot).mockImplementation((_q, onNext, _onError) => {
      capturedOnNext = onNext as unknown as SnapCallback
      return mockUnsubscribe
    })

    const { unmount } = renderHook(() => useEquipementsListener())

    // Check that we queried correctly
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'equipements')
    expect(orderBy).toHaveBeenCalledWith('nom')
    expect(query).toHaveBeenCalled()
    expect(onSnapshot).toHaveBeenCalled()

    // Now simulate Firestore snapshot
    const mockEquipementData = { nom: 'YSI Pro30', marque: 'YSI', etat: 'operationnel' }
    const mockSnap = {
      docs: [
        {
          id: 'equip-123',
          data: () => mockEquipementData
        }
      ]
    }

    expect(capturedOnNext).not.toBeNull()
    act(() => {
      capturedOnNext(mockSnap)
    })

    // Check store state
    const storeState = useEquipementsStore.getState()
    expect(storeState.equipements).toEqual([
      { id: 'equip-123', nom: 'YSI Pro30', marque: 'YSI', etat: 'operationnel' }
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

    renderHook(() => useEquipementsListener())

    expect(capturedOnError).not.toBeNull()
    act(() => {
      capturedOnError(new Error('Firestore read failed'))
    })

    // Check store error state
    const storeState = useEquipementsStore.getState()
    expect(storeState.error).toBe('Firestore read failed')
    expect(storeState.loading).toBe(false)
  })
})
