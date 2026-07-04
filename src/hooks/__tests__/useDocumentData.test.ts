import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { User } from 'firebase/auth'

import { useDocumentData } from '../useDocumentData'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { onSnapshot, deleteDoc, doc } from 'firebase/firestore'

type DocSnap = {
  exists: () => boolean
  id: string
  data: () => Record<string, unknown>
}
type SnapCallback = (snapshot: DocSnap) => void

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('@/stores/toastStore', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

interface TestDoc {
  id: string
  nom: string
  updatedBy?: string
}

const MY_UID = 'me-uid'
const DEBOUNCE = 800

function makeSnap(id: string, data: Record<string, unknown>): DocSnap {
  return { exists: () => true, id, data: () => data }
}

const missingSnap: DocSnap = {
  exists: () => false,
  id: 'gone',
  data: () => ({}),
}

describe('useDocumentData', () => {
  const mockUnsubscribe = vi.fn()
  let capturedOnNext: SnapCallback | null = null
  let saveFn: ReturnType<typeof vi.fn>

  function renderTestHook(overrides?: { docId?: string | undefined }) {
    return renderHook(() =>
      useDocumentData<TestDoc>({
        collection: 'clients-v2',
        docId: overrides && 'docId' in overrides ? overrides.docId : 'doc-1',
        saveFn: saveFn as unknown as (data: TestDoc, uid: string) => Promise<void>,
        deleteRedirect: '/missions',
      }),
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnNext = null
    saveFn = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ firebaseUser: { uid: MY_UID } as User })
    vi.mocked(onSnapshot).mockImplementation(((_ref: unknown, onNext: unknown) => {
      capturedOnNext = onNext as SnapCallback
      return mockUnsubscribe
    }) as unknown as typeof onSnapshot)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the document from the snapshot and unsubscribes on unmount', () => {
    const { result, unmount } = renderTestHook()

    expect(result.current.loading).toBe(true)
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'clients-v2', 'doc-1')

    act(() => {
      capturedOnNext!(makeSnap('doc-1', { nom: 'Plounerin' }))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual({ id: 'doc-1', nom: 'Plounerin' })

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('sets data to null when the document does not exist', () => {
    const { result } = renderTestHook()

    act(() => {
      capturedOnNext!(missingSnap)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('does not subscribe when docId is undefined', () => {
    const { result } = renderTestHook({ docId: undefined })

    expect(onSnapshot).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(true)
  })

  it('debounces triggerSave and only persists the last value', async () => {
    vi.useFakeTimers()
    const { result } = renderTestHook()

    act(() => {
      capturedOnNext!(makeSnap('doc-1', { nom: 'Initial' }))
    })

    act(() => {
      result.current.triggerSave({ id: 'doc-1', nom: 'Frappe 1' })
    })
    act(() => {
      result.current.triggerSave({ id: 'doc-1', nom: 'Frappe 2' })
    })

    // Optimistic local update, no write yet
    expect(result.current.data?.nom).toBe('Frappe 2')
    expect(saveFn).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE)
    })

    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith({ id: 'doc-1', nom: 'Frappe 2' }, MY_UID)
    expect(result.current.saving).toBe(false)
  })

  it('shows an error toast and resets saving when saveFn fails', async () => {
    vi.useFakeTimers()
    saveFn.mockRejectedValue(new Error('offline'))
    const { result } = renderTestHook()

    act(() => {
      result.current.triggerSave({ id: 'doc-1', nom: 'Perdu ?' })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE)
    })

    expect(toast.error).toHaveBeenCalledWith('Échec de la sauvegarde. Vérifie ta connexion.')
    expect(result.current.saving).toBe(false)
    // Local state keeps the unsaved value (user input is not thrown away)
    expect(result.current.data?.nom).toBe('Perdu ?')
  })

  it('does not call saveFn when there is no authenticated uid', async () => {
    vi.useFakeTimers()
    useAuthStore.setState({ firebaseUser: null })
    const { result } = renderTestHook()

    act(() => {
      result.current.triggerSave({ id: 'doc-1', nom: 'Sans auth' })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE)
    })

    expect(saveFn).not.toHaveBeenCalled()
  })

  it('ignores its own snapshot echo while a local edit is pending (dirty)', () => {
    const { result } = renderTestHook()

    act(() => {
      capturedOnNext!(makeSnap('doc-1', { nom: 'Initial', updatedBy: MY_UID }))
    })
    act(() => {
      result.current.triggerSave({ id: 'doc-1', nom: 'En cours de frappe' })
    })

    // Echo of our own previous write arrives while dirty → must NOT clobber typing
    act(() => {
      capturedOnNext!(makeSnap('doc-1', { nom: 'Ancienne valeur', updatedBy: MY_UID }))
    })

    expect(result.current.data?.nom).toBe('En cours de frappe')
  })

  it('applies a remote update from another user even while dirty (current behavior: last write wins)', () => {
    const { result } = renderTestHook()

    act(() => {
      capturedOnNext!(makeSnap('doc-1', { nom: 'Initial', updatedBy: MY_UID }))
    })
    act(() => {
      result.current.triggerSave({ id: 'doc-1', nom: 'Mes frappes locales' })
    })

    // Another user saved the doc while we are editing
    act(() => {
      capturedOnNext!(makeSnap('doc-1', { nom: 'Version distante', updatedBy: 'other-uid' }))
    })

    // Documented behavior (useDocumentData.ts l.53) : the remote version replaces
    // the local pending edits. If this test breaks, the conflict strategy changed.
    expect(result.current.data?.nom).toBe('Version distante')
  })

  it('deletes the document and navigates to the redirect route', async () => {
    vi.mocked(deleteDoc).mockResolvedValue(undefined)
    const { result } = renderTestHook()

    act(() => {
      result.current.requestDelete()
    })
    expect(result.current.confirmDelete).toBe(true)

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(deleteDoc).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/missions')
    expect(result.current.confirmDelete).toBe(false)
  })

  it('shows an error toast and does not navigate when delete fails', async () => {
    vi.mocked(deleteDoc).mockRejectedValue(new Error('permission-denied'))
    const { result } = renderTestHook()

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(toast.error).toHaveBeenCalledWith('Échec de la suppression. Réessaie.')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('cancelDelete closes the confirmation without deleting', () => {
    const { result } = renderTestHook()

    act(() => {
      result.current.requestDelete()
    })
    act(() => {
      result.current.cancelDelete()
    })

    expect(result.current.confirmDelete).toBe(false)
    expect(deleteDoc).not.toHaveBeenCalled()
  })
})
