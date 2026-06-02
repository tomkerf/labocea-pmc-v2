import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CHANGELOG, CHANGELOG_VERSION, type ChangelogEntry } from '@/data/changelog'

const STORAGE_KEY = 'pmc_changelog_seen'

function Badge({ type }: { type: 'feat' | 'fix' }) {
  return type === 'feat' ? (
    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
      Nouveau
    </span>
  ) : (
    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
      Corrigé
    </span>
  )
}

function ChangelogContent({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div className="flex flex-col gap-5">
      {entries.map(entry => (
        <div key={entry.version}>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Session {entry.version}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {entry.date}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {entry.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                <Badge type={item.type} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// État global partagé (pas de Zustand pour ne pas alourdir — module singleton)
let _listeners: Array<(v: boolean) => void> = []
let _open = localStorage.getItem(STORAGE_KEY) !== CHANGELOG_VERSION

function setGlobalOpen(v: boolean) {
  _open = v
  _listeners.forEach(fn => fn(v))
}

export function useChangelogState() {
  const [open, setOpen] = useState(_open)

  useEffect(() => {
    _listeners.push(setOpen)
    return () => { _listeners = _listeners.filter(fn => fn !== setOpen) }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION)
    setGlobalOpen(false)
  }

  function show() { setGlobalOpen(true) }

  const hasNew = localStorage.getItem(STORAGE_KEY) !== CHANGELOG_VERSION

  return { open, dismiss, show, hasNew }
}

export default function ChangelogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Fermer avec Échap
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'var(--color-bg-secondary)',
              boxShadow: 'var(--shadow-modal)',
              maxHeight: '80vh',
            }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} />
                <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Nouveautés
                </span>
              </div>
              <button type="button" onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                aria-label="Fermer">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ChangelogContent entries={CHANGELOG} />
            </div>

            {/* Footer */}
            <div className="px-5 py-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
                style={{ background: 'var(--color-accent)', color: 'white' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Compris
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
