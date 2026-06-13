import { useMemo } from 'react'
import { m } from 'framer-motion'
import { getTechColor } from '@/lib/planningUtils'
import UserAvatar from '@/components/ui/UserAvatar'
import { COLORS } from '@/lib/constants'
import type { Preleveur } from '@/stores/preleveursStore'

const FILTER_CIRCLE_BTN: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%',
  fontSize: 10, fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const FILTER_PILL_BTN: React.CSSProperties = {
  height: 28, padding: '0 10px', borderRadius: 14,
  fontSize: 11, fontWeight: 600,
  display: 'flex', alignItems: 'center',
}

interface PlanningFilterBarProps {
  allTechs:      string[]
  filterTech:    string
  setFilterTech: (v: string) => void
  filterSite:    string
  setFilterSite: (v: string) => void
  preleveurs:    Preleveur[]
}

export default function PlanningFilterBar({
  allTechs, filterTech, setFilterTech, filterSite, setFilterSite, preleveurs,
}: PlanningFilterBarProps) {
  const availableSites = useMemo(() => {
    const sites = new Set(preleveurs.flatMap(p => p.site ? [p.site] : []))
    return [...sites].toSorted()
  }, [preleveurs])

  return (
    <div className="flex items-center gap-2 px-4 md:px-6 pb-3 flex-wrap"
      style={{ borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}>
      {availableSites.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap mr-3"
          style={{ borderRight: '1px solid var(--color-border-subtle)', paddingRight: '12px' }}>
          <m.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setFilterSite(''); localStorage.removeItem('planning_filter_site') }}
            className="cursor-pointer"
            style={{
              ...FILTER_CIRCLE_BTN,
              background: !filterSite ? COLORS.TEXT_PRIMARY : COLORS.BG_SECONDARY,
              color: !filterSite ? 'white' : COLORS.TEXT_SECONDARY,
              border: `1px solid ${!filterSite ? 'transparent' : 'var(--color-border-subtle)'}`,
            }}
            title="Tous les sites"
          >
            ✦
          </m.button>
          {availableSites.map(site => {
            const isActive = filterSite === site
            return (
              <m.button
                key={site}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const v = site === filterSite ? '' : site
                  setFilterSite(v)
                  if (v) localStorage.setItem('planning_filter_site', v)
                  else localStorage.removeItem('planning_filter_site')
                }}
                className="cursor-pointer"
                style={{
                  ...FILTER_PILL_BTN,
                  background: isActive ? COLORS.ACCENT : COLORS.BG_SECONDARY,
                  color: isActive ? 'white' : COLORS.TEXT_SECONDARY,
                  border: `1px solid ${isActive ? 'transparent' : 'var(--color-border-subtle)'}`,
                }}
              >
                {site}
              </m.button>
            )
          })}
        </div>
      )}
      {allTechs.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <m.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setFilterTech(''); localStorage.setItem('planning_filter_tech', 'ALL') }}
            className="cursor-pointer"
            style={{
              ...FILTER_CIRCLE_BTN,
              fontWeight: 700,
              background: !filterTech ? COLORS.ACCENT : COLORS.BG_SECONDARY,
              color: !filterTech ? 'white' : COLORS.TEXT_SECONDARY,
              border: `1px solid ${!filterTech ? 'transparent' : 'var(--color-border-subtle)'}`,
            }}
            title="Tous les techniciens"
          >
            ✦
          </m.button>
          {allTechs.map(t => {
            const isActive = filterTech === t
            const prel = preleveurs.find(p => p.code === t)
            const tooltip = prel?.nom ? `${prel.nom} (${t})` : t
            const tc = getTechColor(t)
            return (
              <m.button
                key={t}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { const v=t===filterTech?'':t; setFilterTech(v); if (v) localStorage.setItem('planning_filter_tech',v); else localStorage.setItem('planning_filter_tech', 'ALL') }}
                title={tooltip}
                className="cursor-pointer rounded-full p-0"
                style={{
                  outline: isActive ? `3px solid ${tc.color}` : '3px solid transparent',
                  outlineOffset: '2px',
                  transition: 'outline 0.15s',
                }}
              >
                <UserAvatar initiales={t} color={tc.color} size={28} />
              </m.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
