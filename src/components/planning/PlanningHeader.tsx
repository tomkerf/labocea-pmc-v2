import type { Dispatch, SetStateAction } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Map as MapIcon, X } from 'lucide-react'
import { type ViewMode, getTechColor } from '@/lib/planningUtils'
type Preleveur = { code: string; nom?: string }

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
  totalOverdue:   number
  filterRetard:   boolean
  setFilterRetard: Dispatch<SetStateAction<boolean>>
  showRain:       boolean
  setShowRain:    Dispatch<SetStateAction<boolean>>
  preleveurs:     Preleveur[]
  // Bandeaux
  monthPoolCount: number
  showDragHint:   boolean
  setShowDragHint: Dispatch<SetStateAction<boolean>>
}

export default function PlanningHeader({
  periodLabel, viewMode, prev, next, goToday, switchView,
  showMiniCal, setShowMiniCal,
  allTechs, filterTech, setFilterTech,
  totalOverdue, filterRetard, setFilterRetard,
  showRain, setShowRain, preleveurs,
  monthPoolCount, showDragHint, setShowDragHint,
}: PlanningHeaderProps) {
  return (
    <>
      {/* En-tête navigation */}
      <div className="flex flex-col shrink-0"
        style={{ borderBottom:'1px solid var(--color-border-subtle)', background:'var(--color-bg-secondary)' }}>

        {/* Ligne 1 : navigation période + toggle vue */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-1.5 rounded-lg" style={{ color:'var(--color-text-secondary)' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--color-bg-tertiary)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold min-w-[120px] md:min-w-[180px] text-center" style={{ color:'var(--color-text-primary)' }}>
              {periodLabel}
            </span>
            <button onClick={next} className="p-1.5 rounded-lg" style={{ color:'var(--color-text-secondary)' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--color-bg-tertiary)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <ChevronRight size={18} />
            </button>
            <button onClick={goToday}
              className="hidden md:block px-2.5 py-1 rounded-lg text-xs font-medium ml-1"
              style={{ background:'var(--color-bg-tertiary)', color:'var(--color-text-secondary)', border:'1px solid var(--color-border-subtle)' }}>
              Aujourd'hui
            </button>
            <button onClick={() => setShowMiniCal(v => !v)}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg ml-1"
              style={{
                background: showMiniCal ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                color: showMiniCal ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}
              title="Mini-calendrier">
              <Calendar size={13} />
            </button>

            {/* Bouton Carte mis en valeur séparément avec un icône Map premium (à droite du Mini-calendrier) */}
            <button onClick={() => switchView(viewMode === 'carte' ? 'semaine' : 'carte')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] ml-1 shrink-0"
              style={{
                background: viewMode === 'carte' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: viewMode === 'carte' ? 'white' : 'var(--color-text-primary)',
                border: viewMode === 'carte' ? '1px solid transparent' : '1px solid var(--color-border-subtle)',
                boxShadow: viewMode === 'carte' ? 'none' : 'var(--shadow-card)',
                cursor: 'pointer'
              }}
              title={viewMode === 'carte' ? 'Quitter la carte' : 'Afficher la carte'}
            >
              {viewMode === 'carte' ? (
                <X size={13} style={{ color: 'white' }} />
              ) : (
                <MapIcon size={13} style={{ color: 'var(--color-accent)' }} />
              )}
              <span>{viewMode === 'carte' ? 'Fermer' : 'Carte'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Sélecteur de période de calendrier */}
            <div className="flex rounded-lg overflow-hidden"
              style={{ border:'1px solid var(--color-border-subtle)', background:'var(--color-bg-tertiary)' }}>
              {(['jour','semaine','mois'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => switchView(m)}
                  className="px-3 py-1.5 text-xs font-medium capitalize transition-all"
                  style={{ background:viewMode===m?'var(--color-accent)':'transparent', color:viewMode===m?'white':'var(--color-text-secondary)' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ligne 2 : filtres technicien + retard + pluie */}
        {(allTechs.length > 1 || totalOverdue > 0) && (
          <div className="flex items-center gap-2 px-4 md:px-6 pb-3 flex-wrap">
            {allTechs.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => { setFilterTech(''); localStorage.removeItem('planning_filter_tech') }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background:!filterTech?'var(--color-accent)':'var(--color-bg-secondary)', color:!filterTech?'white':'var(--color-text-secondary)', border:`1px solid ${!filterTech?'transparent':'var(--color-border-subtle)'}` }}>
                  Tous
                </button>
                {allTechs.map(t => {
                  const isActive = filterTech === t
                  const prel = preleveurs.find(p => p.code === t)
                  const label = prel?.nom ? prel.nom.split(' ')[0] + ' · ' + t : t
                  const tc = getTechColor(t)
                  return (
                    <button key={t} onClick={() => { const v=t===filterTech?'':t; setFilterTech(v); if (v) localStorage.setItem('planning_filter_tech',v); else localStorage.removeItem('planning_filter_tech') }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{
                        background: isActive ? tc.color : tc.bg,
                        color: isActive ? 'white' : tc.color,
                        border: `1px solid ${isActive ? 'transparent' : tc.color + '55'}`,
                      }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
            {totalOverdue > 0 && (
              <button onClick={() => setFilterRetard(v=>!v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background:filterRetard?'var(--color-danger)':'var(--color-danger-light)', color:filterRetard?'white':'var(--color-danger)' }}>
                ⚠ {totalOverdue} en retard
              </button>
            )}
            <button onClick={() => { const v = !showRain; setShowRain(v); localStorage.setItem('planning_show_rain', String(v)) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: showRain ? '#0071E3' : 'rgba(0,113,227,0.1)',
                color: showRain ? 'white' : '#0071E3',
                border: `1px solid ${showRain ? 'transparent' : 'rgba(0,113,227,0.2)'}`
              }}>
              <span className="text-sm">🌧</span>
              Temps de pluie {showRain ? 'activé' : 'off'}
            </button>
          </div>
        )}
      </div>

      {/* Bandeau "à planifier" */}
      {viewMode !== 'jour' && monthPoolCount > 0 && (
        <div className="flex items-center gap-2 px-4 md:px-6 py-2 shrink-0"
          style={{ background: 'var(--color-accent-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-accent)' }} />
          <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
            <span className="font-semibold">
              {monthPoolCount} prélèvement{monthPoolCount > 1 ? 's' : ''} à planifier ce mois
            </span>
            <span className="font-normal" style={{ opacity: 0.75 }}>
              {' '}— clic droit sur un jour pour les assigner
            </span>
          </p>
        </div>
      )}

      {/* Hint premier drag */}
      {showDragHint && viewMode !== 'jour' && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 shrink-0"
          style={{ background: 'var(--color-success-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs" style={{ color: 'var(--color-success)' }}>
            <span className="font-semibold">Astuce —</span> glisse sur plusieurs jours pour créer rapidement un événement (congé, rappel, réunion…)
          </p>
          <button
            onClick={() => { setShowDragHint(false); localStorage.setItem('planning_drag_hint_seen', '1') }}
            className="text-xs font-medium shrink-0 px-2 py-0.5 rounded"
            style={{ color: 'var(--color-success)', background: 'transparent' }}
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
