import { Copy, Check } from 'lucide-react'
import type { Result } from './asservissementConfig'
import { COLORS } from '@/lib/constants'

export function AsservissementResultBar({ res, hasError, copied, onCopy }: {
  res: Result | null
  hasError: boolean
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 pt-3"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'var(--glass-panel)', WebkitBackdropFilter: 'var(--glass-panel)', borderTop: '1px solid var(--color-border-subtle)', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      {res && !hasError ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Volume à programmer</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tabular-nums" style={{ color: COLORS.ACCENT, letterSpacing: '-0.02em' }}>{res.vEP}</span>
              <span className="text-lg font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>m³</span>
              <span className="text-xs ml-1" style={{ color: 'var(--color-text-tertiary)' }}>· {res.nbP} prélèv. · {res.freq}/h</span>
            </div>
          </div>
          <button type="button" onClick={onCopy}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-sm shrink-0"
            style={{ background: copied ? COLORS.SUCCESS : COLORS.ACCENT, color: 'white', minWidth: 88, justifyContent: 'center' }}>
            {copied ? <><Check size={15} /> Copié</> : <><Copy size={15} /> Copier</>}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-2">
          {hasError ? (
            <p className="text-sm font-medium" style={{ color: COLORS.DANGER }}>✕ Configuration invalide — vérifiez les paramètres</p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Renseignez le rejet 24h pour calculer</p>
          )}
        </div>
      )}
    </div>
  )
}
