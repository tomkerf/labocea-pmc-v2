import { useState } from 'react'
import { ClipboardList, ChevronDown } from 'lucide-react'
import { REGLE } from './asservissementConfig'
import { COLORS } from '@/lib/constants'

export function AsservissementRegle() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden mb-2"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <ClipboardList size={15} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
        <span className="text-sm font-medium flex-1" style={{ color: COLORS.TEXT_PRIMARY }}>Réglementation & bonnes pratiques</span>
        <ChevronDown size={14} strokeWidth={2}
          style={{ color: 'var(--color-text-tertiary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <div className="flex flex-col pt-1">
            {REGLE.map((t, i) => (
              <div key={t.slice(0, 30)} className="flex gap-3 py-2.5 text-xs leading-relaxed"
                style={{ borderBottom: i < REGLE.length - 1 ? '1px solid var(--color-border-subtle)' : 'none', color: COLORS.TEXT_SECONDARY }}>
                <span className="text-xs font-semibold tabular-nums shrink-0 mt-px" style={{ color: 'var(--color-text-tertiary)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {t}
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            Agence de l'Eau RMC / INSA Lyon (2010) · À titre indicatif
          </p>
        </div>
      )}
    </div>
  )
}
