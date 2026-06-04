import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Map as MapIcon, X, Printer, FileSpreadsheet } from 'lucide-react'
import { type ViewMode, getTechColor } from '@/lib/planningUtils'
import { motion } from 'framer-motion'
import UserAvatar from '@/components/ui/UserAvatar'
import { COLORS } from '@/lib/constants'

type Preleveur = { code: string; nom?: string; site?: string }

interface PlanningHeaderProps {
  // Navigation
  periodLabel:    string
  viewMode:       ViewMode
  prev:           () => void
  next:           () => void
  goToday:        () => void
  switchView:     (m: ViewMode) => void
  showMiniCal:    boolean
  setShowMiniCal: Dispatch<SetStateAction<boolean>>
  // Filtres
  allTechs:       string[]
  filterTech:     string
  setFilterTech:  Dispatch<SetStateAction<string>>
  filterSite:     string
  setFilterSite:  Dispatch<SetStateAction<string>>
  showRain:       boolean
  setShowRain:    Dispatch<SetStateAction<boolean>>
  preleveurs:     Preleveur[]
  // Bandeaux
  monthPoolCount: number
  showDragHint:   boolean
  setShowDragHint: Dispatch<SetStateAction<boolean>>
  // Exports
  onExportPdf:    () => void
  onExportExcel:  () => void
  onBilanMois:    () => void
}

export default function PlanningHeader({
  periodLabel, viewMode, prev, next, goToday, switchView,
  showMiniCal, setShowMiniCal,
  allTechs, filterTech, setFilterTech, filterSite, setFilterSite,
  showRain, setShowRain, preleveurs,
  monthPoolCount, showDragHint, setShowDragHint,
  onExportPdf, onExportExcel, onBilanMois,
}: PlanningHeaderProps) {
  const availableSites = useMemo(() => {
    const sites = new Set(preleveurs.map(p => p.site).filter(Boolean) as string[])
    return [...sites].toSorted()
  }, [preleveurs])

  return (
    <>
      {/* En-tête navigation */}
      <div className="flex flex-col shrink-0"
        style={{ borderBottom:'1px solid var(--color-border-subtle)', background:COLORS.BG_SECONDARY }}>

        {/* Ligne 1 : navigation période + toggle vue */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 pt-3 md:pt-4 pb-3 gap-3 md:gap-0">
          
          <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto">
            {/* Nav Période */}
            <div className="flex items-center gap-1 md:gap-2">
              <button type="button" onClick={prev} className="p-1 md:p-1.5 rounded-lg" style={{ color:COLORS.TEXT_SECONDARY }}
                onMouseEnter={e=>(e.currentTarget.style.background=COLORS.BG_TERTIARY)}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold min-w-[100px] md:min-w-[180px] text-center" style={{ color:COLORS.TEXT_PRIMARY }}>
                {periodLabel}
              </span>
              <button type="button" onClick={next} className="p-1 md:p-1.5 rounded-lg" style={{ color:COLORS.TEXT_SECONDARY }}
                onMouseEnter={e=>(e.currentTarget.style.background=COLORS.BG_TERTIARY)}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Actions rapides */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <button type="button" onClick={goToday}
                className="hidden md:block px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background:COLORS.BG_TERTIARY, color:COLORS.TEXT_SECONDARY, border:'1px solid var(--color-border-subtle)' }}>
                Aujourd'hui
              </button>
              <button type="button" onClick={() => setShowMiniCal(v => !v)}
                className="hidden md:flex items-center justify-center size-7 rounded-lg"
                style={{
                  background: showMiniCal ? 'var(--color-accent-light)' : COLORS.BG_TERTIARY,
                  color: showMiniCal ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
                  border: '1px solid var(--color-border-subtle)',
                }}
                title="Mini-calendrier">
                <Calendar size={13} />
              </button>

              <button type="button" onClick={() => switchView(viewMode === 'carte' ? 'semaine' : 'carte')}
                className="px-2.5 md:px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                style={{
                  background: viewMode === 'carte' ? COLORS.ACCENT : COLORS.BG_SECONDARY,
                  color: viewMode === 'carte' ? 'white' : COLORS.TEXT_PRIMARY,
                  border: viewMode === 'carte' ? '1px solid transparent' : '1px solid var(--color-border-subtle)',
                  boxShadow: viewMode === 'carte' ? 'none' : 'var(--shadow-card)',
                  cursor: 'pointer'
                }}
                title={viewMode === 'carte' ? 'Quitter la carte' : 'Afficher la carte'}
              >
                {viewMode === 'carte' ? (
                  <X size={13} style={{ color: 'white' }} />
                ) : (
                  <MapIcon size={13} style={{ color: COLORS.ACCENT }} />
                )}
                <span className="hidden md:inline">{viewMode === 'carte' ? 'Fermer' : 'Carte'}</span>
              </button>

              <button type="button" onClick={() => { const v = !showRain; setShowRain(v); localStorage.setItem('planning_show_rain', String(v)) }}
                className="flex items-center justify-center rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                title={showRain ? 'Temps de pluie activé' : 'Temps de pluie désactivé'}
                style={{
                  width: 40, height: 30, // Plus compact sur mobile
                  background: showRain ? COLORS.ACCENT : COLORS.BG_SECONDARY,
                  color: showRain ? 'white' : COLORS.TEXT_PRIMARY,
                  border: `1px solid ${showRain ? 'transparent' : 'var(--color-border-subtle)'}`,
                  boxShadow: showRain ? 'none' : 'var(--shadow-card)',
                }}>
                <span className="text-sm">🌧</span>
              </button>
            </div>
          </div>

          {/* Toggle de vue et exports */}
          <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
            <div className="flex gap-1">
              <button type="button"
                onClick={onExportPdf}
                className="hidden md:flex px-2.5 py-1.5 text-xs font-medium rounded-lg items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] cursor-pointer"
                title="Exporter la feuille de route PDF"
              >
                <Printer size={13} style={{ color: COLORS.TEXT_SECONDARY }} />
                <span>Feuille de route</span>
              </button>
              <button type="button"
                onClick={onExportExcel}
                className="hidden md:flex px-2.5 py-1.5 text-xs font-medium rounded-lg items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] cursor-pointer"
                title="Exporter au format Excel"
              >
                <FileSpreadsheet size={13} style={{ color: COLORS.SUCCESS }} />
                <span className="hidden md:inline">Excel</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onBilanMois}
                className="hidden md:flex px-2.5 py-1.5 text-xs font-medium rounded-lg items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background:COLORS.ACCENT, color:'white', border:'1px solid transparent' }}
                title="Afficher le bilan du mois en cours">
                <Calendar size={13} style={{ color: 'white' }} />
                Bilan
              </button>
              
              <div className="relative flex p-0.5 rounded-lg shrink-0 w-full md:w-auto overflow-x-auto no-scrollbar"
                style={{ border:'1px solid var(--color-border-subtle)', background:COLORS.BG_TERTIARY }}>
                {(['jour','semaine','mois','annee'] as ViewMode[]).map(m => (
                <button type="button"
                  key={m}
                  onClick={() => switchView(m)}
                  className="relative px-3 py-1.5 text-xs font-medium capitalize z-10 transition-colors duration-200 flex-1 md:flex-none text-center"
                  style={{
                    color: viewMode === m ? 'white' : COLORS.TEXT_SECONDARY
                  }}
                >
                  {viewMode === m && (
                    <motion.div
                      layoutId="active-planning-view"
                      className="absolute inset-0 rounded-md -z-10"
                      style={{ background: COLORS.ACCENT }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ligne 2 : filtres technicien + pluie */}
        <div className="flex items-center gap-2 px-4 md:px-6 pb-3 flex-wrap">
            {availableSites.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap mr-3"
                style={{ borderRight: '1px solid var(--color-border-subtle)', paddingRight: '12px' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setFilterSite(''); localStorage.removeItem('planning_filter_site') }}
                  className="cursor-pointer"
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: !filterSite ? COLORS.TEXT_PRIMARY : COLORS.BG_SECONDARY,
                    color: !filterSite ? 'white' : COLORS.TEXT_SECONDARY,
                    border: `1px solid ${!filterSite ? 'transparent' : 'var(--color-border-subtle)'}`,
                    fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Tous les sites"
                >
                  ✦
                </motion.button>
                {availableSites.map(site => {
                  const isActive = filterSite === site
                  return (
                    <motion.button
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
                        height: 28, padding: '0 10px', borderRadius: 14,
                        background: isActive ? COLORS.ACCENT : COLORS.BG_SECONDARY,
                        color: isActive ? 'white' : COLORS.TEXT_SECONDARY,
                        border: `1px solid ${isActive ? 'transparent' : 'var(--color-border-subtle)'}`,
                        fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center',
                      }}
                    >
                      {site}
                    </motion.button>
                  )
                })}
              </div>
            )}
            {allTechs.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setFilterTech(''); localStorage.setItem('planning_filter_tech', 'ALL') }}
                  className="cursor-pointer"
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: !filterTech ? COLORS.ACCENT : COLORS.BG_SECONDARY,
                    color: !filterTech ? 'white' : COLORS.TEXT_SECONDARY,
                    border: `1px solid ${!filterTech ? 'transparent' : 'var(--color-border-subtle)'}`,
                    fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Tous les techniciens"
                >
                  ✦
                </motion.button>
                {allTechs.map(t => {
                  const isActive = filterTech === t
                  const prel = preleveurs.find(p => p.code === t)
                  const tooltip = prel?.nom ? `${prel.nom} (${t})` : t
                  const tc = getTechColor(t)
                  return (
                    <motion.button
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
                    </motion.button>
                  )
                })}
              </div>
            )}
        </div>
      </div>

      {/* Bandeau "à planifier" */}
      {viewMode !== 'jour' && viewMode !== 'carte' && monthPoolCount > 0 && (
        <div className="flex items-center gap-2 px-4 md:px-6 py-2 shrink-0"
          style={{ background: 'var(--color-accent-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <span className="size-1.5 rounded-full shrink-0" style={{ background: COLORS.ACCENT }} />
          <p className="text-xs" style={{ color: COLORS.ACCENT }}>
            <span className="font-semibold">
              {monthPoolCount} prélèvement{monthPoolCount > 1 ? 's' : ''} à planifier ce mois
            </span>
            <span className="hidden md:inline font-normal" style={{ opacity: 0.75 }}>
              {' '}— clic droit sur un jour pour les assigner
            </span>
          </p>
        </div>
      )}

      {/* Hint premier drag */}
      {showDragHint && viewMode !== 'jour' && viewMode !== 'carte' && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 shrink-0"
          style={{ background: 'var(--color-success-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs" style={{ color: COLORS.SUCCESS }}>
            <span className="font-semibold">Astuce —</span> glisse sur plusieurs jours pour créer rapidement un événement (congé, rappel, réunion…)
          </p>
          <button type="button"
            onClick={() => { setShowDragHint(false); localStorage.setItem('planning_drag_hint_seen', '1') }}
            className="text-xs font-medium shrink-0 px-2 py-0.5 rounded"
            style={{ color: COLORS.SUCCESS, background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,199,89,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            OK
          </button>
        </div>
      )}
    </>
  )
}
