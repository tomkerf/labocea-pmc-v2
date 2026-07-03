import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Map as MapIcon, X, Printer, FileSpreadsheet, MoreHorizontal } from 'lucide-react'
import { type ViewMode } from '@/lib/planningUtils'
import { m } from 'framer-motion'
import { COLORS } from '@/lib/constants'

interface PlanningHeaderProps {
  periodLabel:    string
  viewMode:       ViewMode
  prev:           () => void
  next:           () => void
  goToday:        () => void
  switchView:     (mode: ViewMode) => void
  showMiniCal:    boolean
  setShowMiniCal: (v: boolean) => void
  showRain:       boolean
  setShowRain:    (v: boolean) => void
  onExportPdf:    () => void
  onExportExcel:  () => void
  onBilanMois:    () => void
  showBilanMois?: boolean
}

export default function PlanningHeader({
  periodLabel, viewMode, prev, next, goToday, switchView,
  showMiniCal, setShowMiniCal,
  showRain, setShowRain,
  onExportPdf, onExportExcel, onBilanMois, showBilanMois
}: PlanningHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showExportMenu) return
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

  return (
    <div className="flex flex-col shrink-0"
      style={{ background:COLORS.BG_SECONDARY }}>

      {/* Ligne 1 : navigation période + toggle vue */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center justify-between px-4 md:px-5 pt-3 md:pt-4 pb-3 gap-2">

        <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto">
          {/* Nav Période */}
          <div className="flex items-center gap-1 md:gap-2">
            <button type="button" onClick={prev} className="p-1 md:p-1.5 rounded-lg" style={{ color:COLORS.TEXT_SECONDARY }}
              onMouseEnter={e=>(e.currentTarget.style.background=COLORS.BG_TERTIARY)}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold min-w-[100px] md:min-w-[140px] lg:min-w-[180px] text-center" style={{ color:COLORS.TEXT_PRIMARY }}>
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
            <button type="button" onClick={() => setShowMiniCal(!showMiniCal)}
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
                width: 40, height: 30,
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

          {/* Menu exports ⋯ */}
          <div className="relative hidden md:block" ref={exportMenuRef}>
            <button type="button"
              onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center justify-center size-7 rounded-lg transition-colors"
              title="Exports"
              style={{
                background: showExportMenu ? 'var(--color-accent-light)' : COLORS.BG_TERTIARY,
                color: showExportMenu ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
                border: '1px solid var(--color-border-subtle)',
              }}>
              <MoreHorizontal size={14} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1 rounded-xl min-w-[180px]"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-elevated)' }}>
                <button type="button" onClick={() => { onExportPdf(); setShowExportMenu(false) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  style={{ color: COLORS.TEXT_PRIMARY }}>
                  <Printer size={13} style={{ color: COLORS.TEXT_SECONDARY }} />
                  Feuille de route PDF
                </button>
                <button type="button" onClick={() => { onExportExcel(); setShowExportMenu(false) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  style={{ color: COLORS.TEXT_PRIMARY }}>
                  <FileSpreadsheet size={13} style={{ color: COLORS.SUCCESS }} />
                  Exporter Excel
                </button>
                <div style={{ borderTop: '1px solid var(--color-border-subtle)', margin: '2px 8px' }} />
                <button type="button" onClick={() => { onBilanMois(); setShowExportMenu(false) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  style={{ color: showBilanMois ? COLORS.ACCENT : COLORS.TEXT_PRIMARY }}>
                  <Calendar size={13} style={{ color: showBilanMois ? COLORS.ACCENT : COLORS.TEXT_SECONDARY }} />
                  Bilan du mois{showBilanMois ? ' ✓' : ''}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">

            {/* Cartouche 1: Vues Calendaires */}
            <div className="relative flex p-0.5 rounded-lg shrink-0 w-full md:w-auto overflow-x-auto no-scrollbar"
              style={{ border:'1px solid var(--color-border-subtle)', background:COLORS.BG_TERTIARY }}>
              {(['jour', 'semaine', 'mois', 'charge'] as ViewMode[]).map(view => {
                const labelMap: Record<ViewMode, string> = {
                  jour: 'Jour',
                  semaine: 'Semaine',
                  mois: 'Mois',
                  charge: 'Charge',
                  annee: 'Année',
                  carte: 'Carte'
                }
                const active = viewMode === view
                return (
                  <button type="button"
                    key={view}
                    onClick={() => switchView(view)}
                    className="relative px-3.5 py-1.5 text-xs font-semibold rounded-md z-10 transition-colors duration-200 flex-1 md:flex-none text-center cursor-pointer"
                    style={{
                      color: active ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY
                    }}
                  >
                    {active && (
                      <m.div
                        layoutId="active-planning-view"
                        className="absolute inset-0 rounded-md -z-10"
                        style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-card)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {labelMap[view]}
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
