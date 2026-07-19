import { useEffect, useRef } from 'react'

/** Écoute Cmd+<key> (Mac) ou Ctrl+<key> (Windows/Linux) au niveau window. */
export function useGlobalHotkey(key: string, callback: () => void) {
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        callbackRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key])
}
