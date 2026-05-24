import { useSyncStore } from '@/stores/syncStore'

export function trackWrite<T>(promise: Promise<T>): Promise<T> {
  useSyncStore.getState().increment()
  return promise.finally(() => {
    useSyncStore.getState().decrement()
  })
}
