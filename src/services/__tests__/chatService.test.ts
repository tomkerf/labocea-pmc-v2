import { vi, describe, it, expect, beforeEach } from 'vitest'
import { sendChatMessage, sendChatImage, sendChatPoll, toggleReaction, getDmChatId, ALLOWED_REACTIONS } from '../chatService'
import { addDoc, runTransaction, serverTimestamp } from 'firebase/firestore'

const SERVER_TIMESTAMP_SENTINEL = { __type: 'serverTimestamp' }

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-msg' }),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => SERVER_TIMESTAMP_SENTINEL),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() }))
  }
}))

vi.mock('@/lib/firebase', () => ({
  db: {}
}))

const user = { uid: 'u1', prenom: 'Thomas', nom: 'Kerfendal', initiales: 'THK' }

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDmChatId', () => {
    it('génère un id déterministe indépendant de l\'ordre des uids', () => {
      expect(getDmChatId('b', 'a')).toBe('a_b')
      expect(getDmChatId('a', 'b')).toBe('a_b')
    })
  })

  describe('horodatage serveur (fix premortem 2026-07-06)', () => {
    it('sendChatMessage utilise serverTimestamp, pas l\'horloge du client', async () => {
      await sendChatMessage('Salut', user)
      expect(serverTimestamp).toHaveBeenCalled()
      const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>
      expect(payload.createdAt).toBe(SERVER_TIMESTAMP_SENTINEL)
    })

    it('sendChatImage utilise serverTimestamp', async () => {
      await sendChatImage('https://example.com/img.jpg', user)
      const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>
      expect(payload.createdAt).toBe(SERVER_TIMESTAMP_SENTINEL)
    })

    it('sendChatPoll utilise serverTimestamp', async () => {
      await sendChatPoll('Question ?', ['Oui', 'Non'], user)
      const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>
      expect(payload.createdAt).toBe(SERVER_TIMESTAMP_SENTINEL)
    })
  })

  describe('toggleReaction', () => {
    it('refuse un emoji hors allowlist sans toucher Firestore', async () => {
      await toggleReaction('msg-1', '💣', 'u1')
      expect(runTransaction).not.toHaveBeenCalled()
    })

    it('accepte un emoji de l\'allowlist', async () => {
      vi.mocked(runTransaction).mockResolvedValue(undefined)
      await toggleReaction('msg-1', ALLOWED_REACTIONS[0], 'u1')
      expect(runTransaction).toHaveBeenCalled()
    })
  })
})
