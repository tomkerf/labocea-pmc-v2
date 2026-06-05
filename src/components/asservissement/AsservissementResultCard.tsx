import type { Result } from './asservissementConfig'
import { COLORS } from '@/lib/constants'

export function AsservissementResultCard({ res, tauxColor }: { res: Result; tauxColor: string }) {
  const tauxNum = parseInt(res.taux)
  const stats = [
    { label: 'Fréquence',         val: res.freq,    unit: '/h'  },
    { label: 'Période',           val: res.periode, unit: 'min' },
    { label: 'Nb prélèv. / 24h', val: res.nbP,     unit: ''    },
    { label: 'Vol. total',        val: res.vTot,    unit: 'L'   },
    { label: 'Remplissage',       val: res.taux,    unit: '%', danger: tauxNum > 85 },
  ]

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: i < stats.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
          <span className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>{s.label}</span>
          <span className="text-sm font-semibold tabular-nums"
            style={{ color: 'danger' in s && s.danger ? tauxColor : COLORS.TEXT_PRIMARY }}>
            {s.val}
            {s.unit && <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{s.unit}</span>}
          </span>
        </div>
      ))}

      {res.warns.length > 0 && (
        <div className="px-4 py-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {res.warns.map((w) => {
            const bg    = w.type === 'ok' ? 'var(--color-success-light)' : w.type === 'error' ? 'var(--color-danger-light)' : w.type === 'warn' ? 'var(--color-warning-light)' : COLORS.BG_TERTIARY
            const color = w.type === 'ok' ? COLORS.SUCCESS : w.type === 'error' ? COLORS.DANGER : w.type === 'warn' ? COLORS.WARNING : COLORS.TEXT_SECONDARY
            const dot   = w.type === 'ok' ? '✓' : w.type === 'error' ? '✕' : '•'
            return (
              <div key={w.txt} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: bg }}>
                <span className="text-xs font-bold shrink-0 mt-px" style={{ color }}>{dot}</span>
                <span className="text-xs leading-relaxed" style={{ color: COLORS.TEXT_PRIMARY }}>{w.txt}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
