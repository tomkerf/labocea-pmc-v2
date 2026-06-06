import { useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { isSamplingOverdue } from '@/lib/overdue'
import { SAMPLING_LABEL, isVeilleJourFerie } from '@/lib/planningUtils'
import type { PoolItem } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'

interface DayModalPoolTabProps {
  dateStr: string
  pool: PoolItem[]
  overduePool: PoolItem[]
  holidays: Record<string, string>
  onValidatePool: (item: PoolItem, date: string) => Promise<void>
}

export default function DayModalPoolTab({ dateStr, pool, overduePool, holidays, onValidatePool }: DayModalPoolTabProps) {
  const [poolValidId, setPoolValidId] = useState<string | null>(null)
  const [poolDate,    setPoolDate]    = useState(dateStr)
  const [poolSaving,  setPoolSaving]  = useState(false)
  const [openGroups,  setOpenGroups]  = useState<Record<string, boolean>>({
    'En retard': false, 'Planifié': false, 'À planifier': false,
  })

  async function handleValidatePool(item: PoolItem) {
    if (poolSaving) return
    setPoolSaving(true)
    try { await onValidatePool(item, poolDate); setPoolValidId(null) }
    finally { setPoolSaving(false) }
  }

  if (pool.length === 0 && overduePool.length === 0) {
    return (
      <div className="px-4 py-4">
        <div className="rounded-xl py-8 text-center"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Tout est planifié ce mois ✓</p>
        </div>
      </div>
    )
  }

  const overdueIds = new Set(overduePool.map(x => x.sampling.id))
  const planifie   = pool.filter(x => x.sampling.plannedDay > 0 && !overdueIds.has(x.sampling.id))
  const aplanifier = pool.filter(x => x.sampling.plannedDay === 0 && !overdueIds.has(x.sampling.id))
  type Group = { label: string; items: PoolItem[] }
  const groups: Group[] = [
    { label: 'En retard',   items: overduePool },
    { label: 'Planifié',    items: planifie },
    { label: 'À planifier', items: aplanifier },
  ].filter(g => g.items.length > 0)

  function renderItem(item: PoolItem, i: number, groupItems: PoolItem[]) {
    const overdue  = isSamplingOverdue(item.sampling, new Date().getFullYear(), item.methode === 'Automatique')
    const cfgLabel = overdue ? SAMPLING_LABEL.overdue : SAMPLING_LABEL[item.sampling.status] ?? SAMPLING_LABEL.planned
    const cfgColor = overdue ? COLORS.DANGER
      : item.sampling.status === 'non_effectue' ? COLORS.WARNING
      : item.sampling.status === 'done' ? COLORS.SUCCESS
      : COLORS.TEXT_SECONDARY
    const cfgBg = overdue ? 'var(--color-danger-light)'
      : item.sampling.status === 'non_effectue' ? 'var(--color-warning-light)'
      : item.sampling.status === 'done' ? 'var(--color-success-light)'
      : COLORS.BG_TERTIARY
    const cfg = { label: cfgLabel, color: cfgColor, bg: cfgBg }
    const isValidating = poolValidId === item.sampling.id

    return (
      <div key={item.sampling.id}
        style={{ borderBottom: i < groupItems.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
        <button type="button"
          aria-label={isValidating ? 'Annuler la planification' : `Planifier : ${item.clientNom}`}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          onClick={() => isValidating
            ? setPoolValidId(null)
            : (setPoolValidId(item.sampling.id), setPoolDate(dateStr))
          }>
          <span className="size-2 rounded-full shrink-0 mt-0.5" style={{ background: cfg.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
              {item.clientNom}
            </p>
            <p className="text-xs mt-0.5 truncate flex items-center gap-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
              <span className="truncate">{item.planNom}{item.siteNom ? ` · ${item.siteNom}` : ''}
              {item.frequence && (
                <span className="ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  — {item.frequence}
                </span>
              )}</span>
              {item.cofrac && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                  COFRAC
                </span>
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
              {item.techInitiales && item.techInitiales !== '—' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
                  {item.techInitiales}
                </span>
              )}
              {item.sampling.plannedDay > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                  prévu j{item.sampling.plannedDay}
                </span>
              )}
              {item.meteo === 'pluie' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: '#EFF6FF', color: '#3B82F6' }}
                  title="Prélèvement à réaliser par temps de pluie">
                  🌧 Pluie
                </span>
              )}
              {item.analysesSousTraitees && isVeilleJourFerie(dateStr) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}
                  title={`Analyses sous-traitées — veille de ${isVeilleJourFerie(dateStr)}`}>
                  ⚠️ Veille de férié
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 size-7 flex items-center justify-center rounded-full transition-colors"
            style={{
              background: isValidating ? COLORS.BG_TERTIARY : 'var(--color-success-light)',
              border: isValidating ? '1px solid var(--color-border)' : 'none',
            }}>
            {isValidating
              ? <X size={13} style={{ color: COLORS.TEXT_SECONDARY }} />
              : <Plus size={13} style={{ color: COLORS.SUCCESS }} />
            }
          </span>
        </button>
        {isValidating && (() => {
          const poolHoliday = holidays[poolDate]
          return (
            <div className="px-4 py-3 flex flex-col gap-2"
              style={{ background: COLORS.BG_TERTIARY, borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="dm-pool-date" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                    Planifier le
                  </label>
                  <input id="dm-pool-date" type="date" value={poolDate} onChange={e => setPoolDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: COLORS.BG_SECONDARY,
                      border: `1px solid ${poolHoliday ? COLORS.DANGER : COLORS.BORDER}`,
                      color: COLORS.TEXT_PRIMARY,
                    }} />
                </div>
                <button type="button" onClick={() => handleValidatePool(item)} disabled={poolSaving || !poolDate || !!poolHoliday}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: poolHoliday ? COLORS.BG_TERTIARY : COLORS.SUCCESS,
                    color: poolHoliday ? 'var(--color-text-tertiary)' : 'white',
                    opacity: poolSaving ? 0.6 : 1,
                    cursor: poolHoliday ? 'not-allowed' : 'pointer',
                  }}>
                  {poolSaving ? '…' : 'Confirmer'}
                </button>
              </div>
              {poolHoliday && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: COLORS.DANGER }}>
                  <span>⛔</span>
                  <span>{poolHoliday} — planification impossible sur un jour férié.</span>
                </p>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-4">
        {groups.map(group => {
          const isOpen = openGroups[group.label] !== false
          return (
            <div key={group.label}>
              <button type="button"
                className="w-full flex items-center justify-between px-1 py-1 mb-1.5"
                onClick={() => setOpenGroups(prev => ({ ...prev, [group.label]: !isOpen }))}>
                <p className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: group.label === 'En retard' ? COLORS.DANGER : 'var(--color-text-tertiary)' }}>
                  {group.label} · {group.items.length}
                </p>
                <ChevronDown size={14}
                  style={{
                    color: 'var(--color-text-tertiary)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms ease',
                  }} />
              </button>
              {isOpen && (
                <div style={{ position: 'relative' }}>
                  <div className="overflow-y-auto rounded-xl"
                    style={{
                      maxHeight: '35vh',
                      background: COLORS.BG_SECONDARY,
                      border: '1px solid var(--color-border-subtle)',
                      boxShadow: 'var(--shadow-card)',
                    }}>
                    {group.items.map((item, i) => renderItem(item, i, group.items))}
                  </div>
                  {group.items.length > 3 && (
                    <div style={{
                      position: 'absolute',
                      bottom: 1, left: 1, right: 1,
                      height: 48,
                      background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.95))',
                      borderRadius: '0 0 11px 11px',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
