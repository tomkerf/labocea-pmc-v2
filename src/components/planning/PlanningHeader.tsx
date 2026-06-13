import { ChevronLeft, ChevronRight, Calendar, Map as MapIcon, X, Printer, FileSpreadsheet } from 'lucide-react'
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
  return (
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

            {/* Cartouche 1: Vues Calendaires */}
            <div className="relative flex p-0.5 rounded-[var(--radius-md)] shrink-0 w-full md:w-auto overflow-x-auto no-scrollbar"
              style={{ border:'1px solid var(--color-border-subtle)', background:COLORS.BG_TERTIARY }}>
              {(['jour','semaine','mois','annee'] as ViewMode[]).map(view => (
              <button type="button"
                key={view}
                onClick={() => switchView(view)}
                className="relative px-3 py-1.5 text-xs font-medium capitalize z-10 transition-colors duration-200 flex-1 md:flex-none text-center"
                style={{
                  color: viewMode === view ? 'white' : COLORS.TEXT_SECONDARY
                }}
              >
                {viewMode === view && (
                  <m.div
                    layoutId="active-planning-view"
                    className="absolute inset-0 rounded-[var(--radius-sm)] -z-10"
                    style={{ background: COLORS.ACCENT }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {view}
              </button>
            ))}
            </div>

            {/* Cartouche 2: Analytique (Bilan / Charge) */}
            <div className="relative hidden md:flex p-0.5 rounded-[var(--radius-md)] shrink-0 overflow-x-auto no-scrollbar"
              style={{ border:'1px solid var(--color-border-subtle)', background:COLORS.BG_TERTIARY }}>

              <button type="button"
                onClick={onBilanMois}
                className="relative px-3 py-1.5 text-xs font-medium capitalize z-10 transition-colors duration-200 flex items-center gap-1.5 text-center"
                style={{ color: showBilanMois ? 'white' : COLORS.TEXT_SECONDARY }}
                onMouseEnter={e => { if (!showBilanMois) e.currentTarget.style.color = COLORS.TEXT_PRIMARY }}
                onMouseLeave={e => { if (!showBilanMois) e.currentTarget.style.color = COLORS.TEXT_SECONDARY }}
              >
                {showBilanMois && (
                  <m.div
                    layoutId="active-planning-view-analytic"
                    className="absolute inset-0 rounded-[var(--radius-sm)] -z-10"
                    style={{ background: COLORS.ACCENT }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Calendar size={13} />
                Bilan
              </button>

              <button type="button"
                onClick={() => switchView('charge')}
                className="relative px-3 py-1.5 text-xs font-medium capitalize z-10 transition-colors duration-200 text-center"
                style={{ color: viewMode === 'charge' ? 'white' : COLORS.TEXT_SECONDARY }}
              >
                {viewMode === 'charge' && !showBilanMois && (
                  <m.div
                    layoutId="active-planning-view-analytic"
                    className="absolute inset-0 rounded-[var(--radius-sm)] -z-10"
                    style={{ background: COLORS.ACCENT }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Charge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
