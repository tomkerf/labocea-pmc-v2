import { describe, it, expect, beforeEach } from 'vitest'
import { trackWrite } from '@/lib/trackWrite'
import { useSyncStore } from '@/stores/syncStore'

beforeEach(() => {
  useSyncStore.setState({ pendingWrites: 0, isOnline: true })
})

describe('trackWrite', () => {
  it('incrémente pendant le fetch puis décrémente à la résolution', async () => {
    let resolveFn!: () => void
    const promise = new Promise<void>((resolve) => { resolveFn = resolve })

    const tracked = trackWrite(promise)
    expect(useSyncStore.getState().pendingWrites).toBe(1)

    resolveFn()
    await tracked
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })

  it('décrémente même si la promise rejette', async () => {
    const failing = Promise.reject(new Error('firestore error'))
    await trackWrite(failing).catch(() => {})
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })

  it('retourne la valeur résolue de la promise', async () => {
    const result = await trackWrite(Promise.resolve('ok'))
    expect(result).toBe('ok')
  })

  it('gère plusieurs writes en parallèle', async () => {
    let r1!: () => void, r2!: () => void
    const p1 = new Promise<void>((r) => { r1 = r })
    const p2 = new Promise<void>((r) => { r2 = r })

    trackWrite(p1)
    trackWrite(p2)
    expect(useSyncStore.getState().pendingWrites).toBe(2)

    r1()
    await p1
    expect(useSyncStore.getState().pendingWrites).toBe(1)

    r2()
    await p2
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })
})
