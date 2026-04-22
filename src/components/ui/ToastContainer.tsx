import { useToastStore } from '@/stores/toastStore'
import type { Toast } from '@/stores/toastStore'

const ICONS: Record<Toast['type'], string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}

const COLORS: Record<Toast['type'], { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--color-success-light)', color: 'var(--color-success)', border: 'var(--color-success)' },
  error:   { bg: 'var(--color-danger-light)',  color: 'var(--color-danger)',  border: 'var(--color-danger)'  },
  info:    { bg: 'var(--color-accent-light)',  color: 'var(--color-accent)',  border: 'var(--color-accent)'  },
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-24 md:bottom-6 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: '360px', width: 'calc(100vw - 32px)' }}
    >
      {toasts.map((t) => {
        const c = COLORS[t.type]
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl pointer-events-auto"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <span className="text-sm font-bold shrink-0 mt-px" style={{ color: c.color }}>
              {ICONS[t.type]}
            </span>
            <p className="text-sm flex-1 leading-snug" style={{ color: c.color }}>
              {t.message}
            </p>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 text-xs font-medium opacity-60 hover:opacity-100"
              style={{ color: c.color }}>
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
