import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGlobalHotkey } from '@/hooks/useGlobalHotkey'

describe('useGlobalHotkey', () => {
  it('déclenche le callback sur Cmd+K (Mac)', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('déclenche le callback sur Ctrl+K (Windows/Linux)', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('ignore la touche seule sans modificateur', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))

    expect(callback).not.toHaveBeenCalled()
  })

  it('ignore une autre touche même avec un modificateur', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

    expect(callback).not.toHaveBeenCalled()
  })

  it('retire le listener au démontage', () => {
    const callback = vi.fn()
    const { unmount } = renderHook(() => useGlobalHotkey('k', callback))
    unmount()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

    expect(callback).not.toHaveBeenCalled()
  })
})
