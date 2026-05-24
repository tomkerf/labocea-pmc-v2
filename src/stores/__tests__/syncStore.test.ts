import { describe, it, expect, beforeEach } from 'vitest'
import { useSyncStore, getSyncStatus } from '@/stores/syncStore'

beforeEach(() => {
  useSyncStore.setState({ pendingWrites: 0, isOnline: true })
})

describe('useSyncStore', () => {
  it('increment augmente pendingWrites', () => {
    useSyncStore.getState().increment()
    expect(useSyncStore.getState().pendingWrites).toBe(1)
  })

  it('decrement diminue pendingWrites', () => {
    useSyncStore.setState({ pendingWrites: 2 })
    useSyncStore.getState().decrement()
    expect(useSyncStore.getState().pendingWrites).toBe(1)
  })

  it('decrement ne passe pas en négatif', () => {
    useSyncStore.getState().decrement()
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })

  it('setOnline met à jour isOnline', () => {
    useSyncStore.getState().setOnline(false)
    expect(useSyncStore.getState().isOnline).toBe(false)
  })
})

describe('getSyncStatus', () => {
  it('retourne offline si !isOnline', () => {
    expect(getSyncStatus({ isOnline: false, pendingWrites: 0 })).toBe('offline')
  })

  it('retourne offline même avec pendingWrites > 0', () => {
    expect(getSyncStatus({ isOnline: false, pendingWrites: 3 })).toBe('offline')
  })

  it('retourne syncing si online et pendingWrites > 0', () => {
    expect(getSyncStatus({ isOnline: true, pendingWrites: 1 })).toBe('syncing')
  })

  it('retourne synced si online et pendingWrites = 0', () => {
    expect(getSyncStatus({ isOnline: true, pendingWrites: 0 })).toBe('synced')
  })
})
