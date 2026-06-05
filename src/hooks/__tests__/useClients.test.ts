import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

type SnapCallback = (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void
type ErrorCallback = (error: Error) => void
import { useClientsListener } from '../useClients'
import { useMissionsStore } from '@/stores/missionsStore'
import { toast } from '@/stores/toastStore'
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

vi.mock('@/stores/toastStore', () => ({
  toast: {
    error: vi.fn()
  }
}))

describe('useClientsListener', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useMissionsStore.getState().setError(null)
    useMissionsStore.getState().setClients([])
  })

  it('correctly subscribes to the collection and updates the store on success', () => {
    let capturedOnNext: SnapCallback | null = null

    vi.mocked(onSnapshot).mockImplementation((_q, onNext) => {
      capturedOnNext = onNext as unknown as SnapCallback
      return mockUnsubscribe
    })

    const { unmount } = renderHook(() => useClientsListener())

    // Check that we queried correctly
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'clients-v2')
    expect(orderBy).toHaveBeenCalledWith('nom')
    expect(query).toHaveBeenCalled()
    expect(onSnapshot).toHaveBeenCalled()

    // Now simulate Firestore snapshot
    const mockClientData = { nom: 'Plounerin', segment: 'Réseaux de mesure' }
    const mockSnap = {
      docs: [
        {
          id: 'client-abc',
          data: () => mockClientData
        }
      ]
    }

    expect(capturedOnNext).not.toBeNull()
    act(() => {
      capturedOnNext!(mockSnap)
    })

    // Check store state
    const storeState = useMissionsStore.getState()
    expect(storeState.clients).toEqual([
      { id: 'client-abc', nom: 'Plounerin', segment: 'Réseaux de mesure' }
    ])
    expect(storeState.loading).toBe(false)
    expect(storeState.error).toBeNull()

    // Test unsubscribe on unmount
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('handles snapshot error by updating store and showing a toast', () => {
    let capturedOnError: ErrorCallback | null = null

    vi.mocked(onSnapshot).mockImplementation((_q, _onNext, onError) => {
      capturedOnError = onError as unknown as ErrorCallback
      return mockUnsubscribe
    })

    renderHook(() => useClientsListener())

    expect(capturedOnError).not.toBeNull()
    act(() => {
      capturedOnError!(new Error('Permission denied'))
    })

    // Check store error state
    const storeState = useMissionsStore.getState()
    expect(storeState.error).toBe('Permission denied')
    expect(storeState.loading).toBe(false)

    // Check toast error call
    expect(toast.error).toHaveBeenCalledWith('Erreur de connexion à la base de données. Vérifie ta connexion.')
  })
})
