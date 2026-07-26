import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createUserDocument, updateUserProfile, type NewUserData } from '../userService'
import { useSyncStore } from '@/stores/syncStore'
import { setDoc, doc, Timestamp } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ path: 'users/u1' })),
  setDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { now: vi.fn(() => 'TS_NOW') },
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

const newUser: NewUserData = {
  uid: 'u1',
  prenom: 'Jean',
  nom: 'Dupont',
  initiales: 'JD',
  email: 'jd@labocea.fr',
  role: 'technicien',
  avatarColor: '#123456',
}

describe('userService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createUserDocument', () => {
    it('crée le document utilisateur avec createdAt et lastLoginAt', async () => {
      await createUserDocument('u1', newUser)

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'u1')
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid: 'u1',
          prenom: 'Jean',
          role: 'technicien',
          createdAt: 'TS_NOW',
          lastLoginAt: 'TS_NOW',
        }),
      )
      expect(Timestamp.now).toHaveBeenCalled()
    })

    it("utilise l'instance Firestore passée en argument (compte secondaire)", async () => {
      const secondary = { secondary: true }
      await createUserDocument('u1', newUser, secondary as never)

      expect(doc).toHaveBeenCalledWith(secondary, 'users', 'u1')
    })

    it('laisse pendingWrites à 0 après création (trackWrite)', async () => {
      await createUserDocument('u1', newUser)
      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  describe('updateUserProfile', () => {
    it('écrit les champs fournis en merge', async () => {
      await updateUserProfile('u1', { role: 'admin' })

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'u1')
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        { role: 'admin' },
        { merge: true },
      )
    })
  })
})
