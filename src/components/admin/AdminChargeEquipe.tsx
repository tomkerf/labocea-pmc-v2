import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, BarChart2, Clock } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { COLORS } from '@/lib/constants'


const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function formatH(h: number): string {
  if (h === 0) return '—'
  const hh  = Math.floor(h)
  const min = Math.round((h - hh) * 60)
  if (min === 0) return `${hh}h`
  if (hh === 0)  return `${min}min`
  return `${hh}h${String(min).padStart(2, '0')}`
}

function startOfWeekMon(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  r.setHours(0, 0, 0, 0)
  return r
}

export function AdminChargeEquipe() {
  const { clients }                       = useMissionsStore()
  const [viewMode, setViewMode]           = useState<'semaine' | 'mois'>('mois')
  const [refDate,  setRefDate]            = useState(() => new Date())
  const currentYear                       = new Date().getFullYear()

  const { start, end, label } = useMemo(() => {
    if (viewMode === 'mois') {
      const y = refDate.getFullYear(), m = refDate.getMonth()
      const s = new Date(y, m, 1)
      const e = new Date(y, m + 1, 0)
      return { start: s, end: e, label: `${MOIS_COURT[m]} ${y}` }
    }
    const s = startOfWeekMon(refDate)
    const e = new Date(s); e.setDate(e.getDate() + 6)
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
    return { start: s, end: e, label: `${fmt(s)} – ${fmt(e)}/${e.getFullYear()}` }
  }, [viewMode, refDate])

  const handleViewModeChange = useCallback((v: 'semaine' | 'mois') => {
    setViewMode(v)
    setRefDate(new Date())
  }, [])

  const navigate_ = (dir: -1 | 1) => {
    const d = new Date(refDate)
    if (viewMode === 'mois') d.setMonth(d.getMonth() + dir)
    else                     d.setDate(d.getDate() + dir * 7)
    setRefDate(d)
  }

  type Counts = { ponctuel: number; piezo: number; bilan: number }
  type Row = {
    tech: string
    done:    Counts
    planned: Counts
    doneH:    number
    plannedH: number
    totalH:   number
  }

  const rows: Row[] = useMemo(() => {
    const map: Record<string, { done: Counts; planned: Counts }> = {}

    const add = (tech: string, nature: string, methode: string, isDone: boolean) => {
      if (!map[tech]) map[tech] = {
        done:    { ponctuel: 0, piezo: 0, bilan: 0 },
        planned: { ponctuel: 0, piezo: 0, bilan: 0 },
      }
      const bucket = isDone ? map[tech].done : map[tech].planned
      if      (methode === 'Automatique') bucket.bilan++
      else if (nature  === 'Souterraine') bucket.piezo++
      else                                bucket.ponctuel++
    }

    const countH = (c: Counts) => c.ponctuel * 0.25 + c.piezo * 1 + c.bilan * 2

    clients.forEach(client => {
      client.plans.forEach(plan => {
        if (plan.separator) return
        plan.samplings.forEach(s => {
          if (s.status === 'non_effectue') return

          const isDone = s.status === 'done'

          if (viewMode === 'semaine') {
            const dateStr = isDone && s.doneDate
              ? s.doneDate
              : s.plannedDay
                ? `${currentYear}-${String(s.plannedMonth + 1).padStart(2,'0')}-${String(s.plannedDay).padStart(2,'0')}`
                : null
            if (!dateStr) return
            const date = new Date(dateStr + 'T12:00:00')
            if (date < start || date > end) return
          } else {
            if (isDone) {
              if (!s.doneDate) return
              const d = new Date(s.doneDate + 'T12:00:00')
              if (d < start || d > end) return
            } else {
              if (s.plannedMonth !== start.getMonth()) return
            }
          }

          const tech = s.assignedTo || client.preleveur || '—'
          add(tech, plan.nature, plan.methode, isDone)
        })
      })
    })

    return Object.entries(map)
      .map(([tech, { done, planned }]) => {
        const doneH    = countH(done)
        const plannedH = countH(planned)
        return { tech, done, planned, doneH, plannedH, totalH: doneH + plannedH }
      })
      .sort((a, b) => b.totalH - a.totalH)
  }, [clients, start, end, currentYear, viewMode])

  const maxH = rows.length > 0 ? Math.max(...rows.map(r => r.totalH)) : 1

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: COLORS.TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Charge équipe
      </h2>

      <div className="rounded-xl overflow-hidden"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>

        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: COLORS.BG_TERTIARY }}>
            {(['semaine', 'mois'] as const).map(v => (
              <button type="button" key={v}
                onClick={() => handleViewModeChange(v)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: viewMode === v ? COLORS.BG_SECONDARY : 'transparent',
                  color:      viewMode === v ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
                  boxShadow:  viewMode === v ? 'var(--shadow-card)' : 'none',
                }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate_(-1)}
              className="p-1 rounded-md"
              style={{ color: COLORS.TEXT_SECONDARY, background: COLORS.BG_TERTIARY }}>
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium w-32 text-center"
              style={{ color: COLORS.TEXT_PRIMARY }}>
              {label}
            </span>
            <button type="button" onClick={() => navigate_(1)}
              className="p-1 rounded-md"
              style={{ color: COLORS.TEXT_SECONDARY, background: COLORS.BG_TERTIARY }}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5"
          style={{ borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_PRIMARY }}>
          <div className="flex items-center gap-1.5">
            <Clock size={11} style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
              Ponctuel = 15 min · Piézomètre = 1h · Bilan 24h = 2h
            </span>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <BarChart2 size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Aucune intervention planifiée sur cette période.
            </p>
          </div>
        ) : (
          <>
            <div className="grid px-5 py-2"
              style={{ gridTemplateColumns: '90px 1fr 72px 72px 64px', borderBottom: '1px solid var(--color-border-subtle)' }}>
              {[
                { label: 'Technicien', align: 'left' },
                { label: '',           align: 'left' },
                { label: 'Réalisé',    align: 'center' },
                { label: 'À faire',    align: 'center' },
                { label: 'Total',      align: 'center' },
              ].map((h) => (
                <span key={h.label} className="text-[11px] font-semibold uppercase"
                  style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textAlign: h.align as 'left' | 'center' }}>
                  {h.label}
                </span>
              ))}
            </div>

            {rows.map((row, i) => {
              const donePct    = maxH > 0 ? row.doneH    / maxH : 0
              const plannedPct = maxH > 0 ? row.plannedH / maxH : 0
              const remainColor = plannedPct > 0.6
                ? COLORS.DANGER
                : plannedPct > 0.3
                  ? COLORS.WARNING
                  : COLORS.ACCENT

              return (
                <div key={row.tech}
                  className="grid items-center px-5 py-3"
                  style={{ gridTemplateColumns: '90px 1fr 72px 72px 64px', borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                    {row.tech}
                  </span>
                  <div className="h-2 rounded-full mx-2 overflow-hidden flex"
                    style={{ background: COLORS.BG_TERTIARY }}>
                    {row.doneH > 0 && (
                      <div className="h-full shrink-0"
                        style={{ width: `${Math.round(donePct * 100)}%`, background: COLORS.SUCCESS }} />
                    )}
                    {row.plannedH > 0 && (
                      <div className="h-full shrink-0"
                        style={{ width: `${Math.round(plannedPct * 100)}%`, background: remainColor, opacity: 0.75 }} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-center"
                    style={{ color: row.doneH > 0 ? COLORS.SUCCESS : 'var(--color-text-tertiary)' }}>
                    {row.doneH > 0 ? formatH(row.doneH) : '—'}
                  </span>
                  <span className="text-sm font-medium text-center"
                    style={{ color: row.plannedH > 0 ? remainColor : 'var(--color-text-tertiary)' }}>
                    {row.plannedH > 0 ? formatH(row.plannedH) : '—'}
                  </span>
                  <span className="text-sm font-semibold text-center"
                    style={{ color: COLORS.TEXT_PRIMARY }}>
                    {formatH(row.totalH)}
                  </span>
                </div>
              )
            })}

            {(() => {
              const totDone    = rows.reduce((s, r) => s + r.doneH,    0)
              const totPlanned = rows.reduce((s, r) => s + r.plannedH, 0)
              return (
                <div className="grid items-center px-5 py-3"
                  style={{ gridTemplateColumns: '90px 1fr 72px 72px 64px', borderTop: '1px solid var(--color-border)', background: COLORS.BG_PRIMARY }}>
                  <span className="text-xs font-semibold uppercase"
                    style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
                    Total équipe
                  </span>
                  <span />
                  <span className="text-xs font-semibold text-center"
                    style={{ color: totDone > 0 ? COLORS.SUCCESS : 'var(--color-text-tertiary)' }}>
                    {totDone > 0 ? formatH(totDone) : '—'}
                  </span>
                  <span className="text-xs font-semibold text-center"
                    style={{ color: COLORS.TEXT_SECONDARY }}>
                    {totPlanned > 0 ? formatH(totPlanned) : '—'}
                  </span>
                  <span className="text-xs font-semibold text-center"
                    style={{ color: COLORS.TEXT_PRIMARY }}>
                    {formatH(totDone + totPlanned)}
                  </span>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </section>
  )
}
