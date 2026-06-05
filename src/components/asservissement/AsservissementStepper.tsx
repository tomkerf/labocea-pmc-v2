import { useCallback, useRef, useEffect } from 'react'
import { COLORS } from '@/lib/constants'

export function Stepper({ label, hint, value, onChange, unit, step, min, max }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
  unit: string; step: number; min: number; max: number
}) {
  const num = parseFloat(value) || 0
  const timerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const adjust = useCallback((dir: 1 | -1, multiplier = 1) => {
    onChange(String(Math.min(max, Math.max(min, parseFloat((num + dir * step * multiplier).toFixed(6))))))
  }, [num, step, min, max, onChange])

  const startPress = (dir: 1 | -1) => {
    adjust(dir)
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => adjust(dir, 3), 120)
    }, 500)
  }
  const stopPress = () => {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => stopPress, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{label}</span>
        {hint && <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>{hint}</span>}
      </div>
      <div className="flex items-center rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', background: COLORS.BG_SECONDARY }}>
        <button type="button"
          onPointerDown={() => startPress(-1)} onPointerUp={stopPress}
          onPointerLeave={stopPress} onContextMenu={e => e.preventDefault()}
          className="flex items-center justify-center shrink-0 select-none"
          style={{ width: 52, height: 52, background: COLORS.BG_TERTIARY, fontSize: 24, fontWeight: 300, color: COLORS.TEXT_SECONDARY, borderRight: '1px solid var(--color-border)' }}>
          −
        </button>
        <div className="flex-1 flex items-center justify-center gap-1 px-2">
          <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
            aria-label={label} className="asserv-inp text-center font-bold"
            style={{ width: '100%', height: 52, border: 'none', background: 'transparent', fontSize: 22, color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums', outline: 'none' }} />
          <span className="text-sm font-medium shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{unit}</span>
        </div>
        <button type="button"
          onPointerDown={() => startPress(1)} onPointerUp={stopPress}
          onPointerLeave={stopPress} onContextMenu={e => e.preventDefault()}
          className="flex items-center justify-center shrink-0 select-none"
          style={{ width: 52, height: 52, background: COLORS.BG_TERTIARY, fontSize: 24, fontWeight: 300, color: COLORS.ACCENT, borderLeft: '1px solid var(--color-border)' }}>
          +
        </button>
      </div>
    </div>
  )
}

export function Chips({ values, current, unit, onSelect }: {
  values: number[]; current: string; unit: string; onSelect: (v: string) => void
}) {
  const cur = parseFloat(current)
  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {values.map(v => (
        <button type="button" key={v} onClick={() => onSelect(String(v))}
          className="px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: Math.abs(cur - v) < 0.001 ? COLORS.ACCENT : COLORS.BG_TERTIARY,
            color:      Math.abs(cur - v) < 0.001 ? 'white'       : COLORS.TEXT_SECONDARY,
            border: `1px solid ${Math.abs(cur - v) < 0.001 ? COLORS.ACCENT : COLORS.BORDER}`,
          }}>
          {v} {unit}
        </button>
      ))}
    </div>
  )
}
