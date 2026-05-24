import { useEffect } from 'react'
import { useSyncStore } from '@/stores/syncStore'

export function useNetworkStatus(): void {
  useEffect(() => {
    const store = useSyncStore.getState()
    store.setOnline(navigator.onLine)

    const onOnline  = () => useSyncStore.getState().setOnline(true)
    const onOffline = () => useSyncStore.getState().setOnline(false)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])
}
