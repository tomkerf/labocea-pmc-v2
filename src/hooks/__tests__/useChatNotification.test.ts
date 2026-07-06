import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { useChatNotificationListener } from '../useChatNotification'
import { useAuthStore } from '@/stores/authStore'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'
import { onSnapshot } from 'firebase/firestore'
import type { AppUser } from '@/types'

type SnapCallback = (snapshot: { forEach: (fn: (doc: { data: () => Record<string, unknown> }) => void) => void }) => void

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    fromMillis: (ms: number) => ({ toDate: () => new Date(ms) })
  }
}))

vi.mock('@/lib/firebase', () => ({
  db: {}
}))

const mockAppUser = {
  uid: 'me-uid',
  prenom: 'Thomas',
  nom: 'Kerfendal',
  initiales: 'THK',
  role: 'admin'
} as unknown as AppUser

function makeSnap(docs: Array<Record<string, unknown>>) {
  return {
    forEach: (fn: (doc: { data: () => Record<string, unknown> }) => void) => {
      docs.forEach((d) => fn({ data: () => d }))
    }
  }
}

function msg(overrides: Record<string, unknown>) {
  return {
    chatId: 'general',
    senderUid: 'other-uid',
    text: 'Salut',
    createdAt: Timestamp.fromMillis(Date.now()),
    ...overrides
  }
}

describe('useChatNotificationListener', () => {
  const mockUnsubscribe = vi.fn()
  let generalCallback: SnapCallback | null = null
  let dmCallback: SnapCallback | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    generalCallback = null
    dmCallback = null
    useChatNotificationStore.setState({
      unreadCount: 0,
      hasMention: false,
      lastSeenTimestamps: {},
      unreadCounts: {}
    })
    useAuthStore.setState({ appUser: mockAppUser })

    // Le hook monte 2 écouteurs : le 1er = canal général, le 2e = DMs
    vi.mocked(onSnapshot).mockImplementation((_q, onNext) => {
      if (!generalCallback) {
        generalCallback = onNext as unknown as SnapCallback
      } else {
        dmCallback = onNext as unknown as SnapCallback
      }
      return mockUnsubscribe
    })
  })

  it('monte exactement 2 écouteurs (général + DMs)', () => {
    renderHook(() => useChatNotificationListener())
    expect(onSnapshot).toHaveBeenCalledTimes(2)
  })

  it('ne réabonne PAS les écouteurs quand markAsRead est appelé (anti-churn)', () => {
    renderHook(() => useChatNotificationListener())
    expect(onSnapshot).toHaveBeenCalledTimes(2)

    act(() => {
      useChatNotificationStore.getState().markAsRead('general')
    })

    // Non-régression : chaque markAsRead détruisait et recréait les
    // 2 écouteurs globaux (lastSeenTimestamps était dans les deps du useEffect).
    expect(mockUnsubscribe).not.toHaveBeenCalled()
    expect(onSnapshot).toHaveBeenCalledTimes(2)
  })

  it('compte les messages non lus du canal général (messages des autres, plus récents que lastSeen)', () => {
    renderHook(() => useChatNotificationListener())

    act(() => {
      generalCallback!(makeSnap([
        msg({}),
        msg({}),
        msg({ senderUid: 'me-uid' }) // mon propre message : ignoré
      ]))
    })

    expect(useChatNotificationStore.getState().unreadCounts['general']).toBe(2)
    expect(useChatNotificationStore.getState().hasMention).toBe(false)
  })

  it('détecte une mention @initiales dans le canal général', () => {
    renderHook(() => useChatNotificationListener())

    act(() => {
      generalCallback!(makeSnap([msg({ text: 'ping @thk regarde ça' })]))
    })

    expect(useChatNotificationStore.getState().hasMention).toBe(true)
  })

  it('utilise le lastSeen à jour au moment du snapshot, même après markAsRead (sans réabonnement)', () => {
    renderHook(() => useChatNotificationListener())

    // 1er snapshot : 1 non-lu
    act(() => {
      generalCallback!(makeSnap([msg({ createdAt: Timestamp.fromMillis(Date.now() - 1000) })]))
    })
    expect(useChatNotificationStore.getState().unreadCounts['general']).toBe(1)

    // L'utilisateur ouvre le chat → markAsRead
    act(() => {
      useChatNotificationStore.getState().markAsRead('general')
    })
    expect(useChatNotificationStore.getState().unreadCounts['general']).toBe(0)

    // Un snapshot ultérieur (même contenu) doit recompter 0 avec le lastSeen frais
    act(() => {
      generalCallback!(makeSnap([msg({ createdAt: Timestamp.fromMillis(Date.now() - 1000) })]))
    })
    expect(useChatNotificationStore.getState().unreadCounts['general']).toBe(0)
  })

  it('compte les non-lus des DMs par conversation', () => {
    renderHook(() => useChatNotificationListener())

    act(() => {
      dmCallback!(makeSnap([
        msg({ chatId: 'me-uid_other-uid' }),
        msg({ chatId: 'me-uid_other-uid' }),
        msg({ chatId: 'me-uid_third-uid', senderUid: 'third-uid' })
      ]))
    })

    const counts = useChatNotificationStore.getState().unreadCounts
    expect(counts['me-uid_other-uid']).toBe(2)
    expect(counts['me-uid_third-uid']).toBe(1)
  })
})
