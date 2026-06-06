import { m, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SectionTitle, EmptyCard } from '@/components/dashboard/StatCard'
import type { PlanningEvent } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'

interface DashboardPlanningWidgetProps {
  planningMode: 'today' | 'tomorrow';
  setPlanningMode: (mode: 'today' | 'tomorrow') => void;
  hasRainToday: boolean;
  hasRainTomorrow: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeItems: any[];
  activeDateISO: string;
  setEventDetail: (detail: { event: PlanningEvent, dateStr: string }) => void;
}

export function DashboardPlanningWidget({
  planningMode,
  setPlanningMode,
  hasRainToday,
  hasRainTomorrow,
  activeItems,
  activeDateISO,
  setEventDetail
}: DashboardPlanningWidgetProps) {
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>{planningMode === 'today' ? 'Planning du jour' : 'Planning de demain'}</SectionTitle>
          <div className="relative flex gap-1 p-1 rounded-lg shrink-0" style={{ background: COLORS.BG_TERTIARY }}>
            <button type="button"
              onClick={() => setPlanningMode('today')}
              className="relative px-3 py-1.5 text-xs font-medium rounded-md z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2"
              style={{
                color: planningMode === 'today' ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
              }}
            >
              {planningMode === 'today' && (
                <m.div
                  layoutId="active-dashboard-pill"
                  className="absolute inset-0 rounded-md -z-10"
                  style={{ background: 'var(--color-accent-light)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Aujourd'hui
            </button>
            <button type="button"
              onClick={() => setPlanningMode('tomorrow')}
              className="relative px-3 py-1.5 text-xs font-medium rounded-md z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2"
              style={{
                color: planningMode === 'tomorrow' ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
              }}
            >
              {planningMode === 'tomorrow' && (
                <m.div
                  layoutId="active-dashboard-pill"
                  className="absolute inset-0 rounded-md -z-10"
                  style={{ background: 'var(--color-accent-light)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Demain
            </button>
          </div>
        </div>

      </div>
      {((planningMode === 'today' && hasRainToday) || (planningMode === 'tomorrow' && hasRainTomorrow)) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 text-sm font-medium"
          style={{ background: 'rgba(0,113,227,0.07)', color: COLORS.ACCENT, border: '1px solid rgba(0,113,227,0.15)' }}>
          <span>🌧</span>
          <span>Temps de pluie prévu</span>
        </div>
      )}
      {activeItems.length === 0 ? (
        <EmptyCard>Aucune intervention ni événement{planningMode === 'today' ? " aujourd'hui" : " demain"}.</EmptyCard>
      ) : (
        <m.div
          layout
          className="rounded-xl overflow-hidden"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}
        >
          <AnimatePresence mode="popLayout">
            {activeItems.slice(0, 8).map((item, idx) => (
              <m.div
                key={'modalEvent' in item ? item.modalEvent?.id : `todo-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => item.kind === 'todo' ? navigate(item.link) : setEventDetail({ event: item.modalEvent as unknown as PlanningEvent, dateStr: activeDateISO })}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
                style={{ borderBottom: idx < activeItems.slice(0, 8).length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {item.time ? (
                  <span className="text-xs font-semibold shrink-0 w-10 text-center px-1.5 py-1 rounded-lg"
                    style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                    {item.time}
                  </span>
                ) : (
                  <span className="shrink-0 size-2 rounded-full mt-0.5" style={{ background: item.dot }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug" style={{ color: COLORS.TEXT_PRIMARY }}>{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{item.sub}</p>
                </div>
                {'cofrac' in item && item.cofrac && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                    COFRAC
                  </span>
                )}
                {'meteo' in item && item.meteo === 'pluie' && (
                  <span title="Prélèvement temps de pluie" className="shrink-0 text-base leading-none">🌧</span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                  style={{ background: item.badge.bg, color: item.badge.color }}>{item.badge.label}</span>
              </m.div>
            ))}
          </AnimatePresence>
        </m.div>
      )}

      {planningMode === 'today' && (
        <button
          type="button"
          onClick={() => navigate('/tournee')}
          className="w-full mt-3 py-3 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
          style={{ background: COLORS.ACCENT, color: '#FFFFFF', boxShadow: 'var(--shadow-card)' }}
        >
          <span className="text-base leading-none">🚙</span>
          Mode Tournée du Jour
        </button>
      )}
    </div>
  )
}
