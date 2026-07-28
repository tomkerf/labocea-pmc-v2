import { useState, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2, CalendarCheck, CloudRain, Truck } from 'lucide-react'
import { SectionTitle, EmptyCard } from '@/components/dashboard/StatCard'
import type { PlanningEvent } from '@/lib/planningUtils'
import type { JourItem } from '@/hooks/useDashboardStats'

interface DashboardPlanningWidgetProps {
  planningMode: 'today' | 'tomorrow';
  setPlanningMode: (mode: 'today' | 'tomorrow') => void;
  hasRainToday: boolean;
  hasRainTomorrow: boolean;
  activeItems: JourItem[];
  activeDateISO: string;
  setEventDetail: (detail: { event: PlanningEvent, dateStr: string }) => void;
  onUploadPhoto?: (clientId: string, planId: string, samplingId: string, file: File) => Promise<void>;
}

export function DashboardPlanningWidget({
  planningMode,
  setPlanningMode,
  hasRainToday,
  hasRainTomorrow,
  activeItems,
  activeDateISO,
  setEventDetail,
  onUploadPhoto,
}: DashboardPlanningWidgetProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUpload = useRef<{ clientId: string; planId: string; samplingId: string } | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const rainConcernedCount = activeItems.filter(item => 'meteo' in item && item.meteo === 'pluie').length

  function handleCameraClick(e: React.MouseEvent, clientId: string, planId: string, samplingId: string) {
    e.stopPropagation()
    pendingUpload.current = { clientId, planId, samplingId }
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const pending = pendingUpload.current
    if (!file || !pending || !onUploadPhoto) return
    setUploadingId(pending.samplingId)
    try {
      await onUploadPhoto(pending.clientId, pending.planId, pending.samplingId, file)
    } finally {
      setUploadingId(null)
      pendingUpload.current = null
      e.target.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <SectionTitle>{planningMode === 'today' ? 'Planning du jour' : 'Planning de demain'}</SectionTitle>
        <div className="relative flex gap-0.5 p-0.5 rounded-full shrink-0 bg-[var(--color-bg-tertiary)]">
          <button type="button"
            onClick={() => setPlanningMode('today')}
            className={`relative px-3 py-1.5 text-xs font-semibold rounded-full z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 ${
              planningMode === 'today' ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {planningMode === 'today' && (
              <m.div
                layoutId="active-dashboard-pill"
                className="absolute inset-0 rounded-full -z-10 bg-[var(--color-bg-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            Aujourd'hui
          </button>
          <button type="button"
            onClick={() => setPlanningMode('tomorrow')}
            className={`relative px-3 py-1.5 text-xs font-semibold rounded-full z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 ${
              planningMode === 'tomorrow' ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {planningMode === 'tomorrow' && (
              <m.div
                layoutId="active-dashboard-pill"
                className="absolute inset-0 rounded-full -z-10 bg-[var(--color-bg-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            Demain
          </button>
        </div>
      </div>

      {((planningMode === 'today' && hasRainToday) || (planningMode === 'tomorrow' && hasRainTomorrow)) && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl mb-2.5 text-[12.5px] font-semibold bg-[rgba(0,113,227,0.06)] border border-[rgba(0,113,227,0.14)] text-[var(--color-accent)]">
          <CloudRain size={15} strokeWidth={1.7} className="shrink-0" />
          <span>
            Temps de pluie prévu
            {rainConcernedCount > 0 ? ` — ${rainConcernedCount} prélèvement${rainConcernedCount > 1 ? 's' : ''} pluie concerné${rainConcernedCount > 1 ? 's' : ''}` : ''}
          </span>
        </div>
      )}

      {activeItems.length === 0 ? (
        <EmptyCard icon={<CalendarCheck size={16} strokeWidth={1.5} className="text-[var(--color-accent)]" />}>
          Aucune intervention ni événement{planningMode === 'today' ? " aujourd'hui" : " demain"}.
        </EmptyCard>
      ) : (
        <m.div
          layout
          className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]"
        >
          <AnimatePresence mode="popLayout">
            {activeItems.slice(0, 8).map((item, idx) => {
              const camera = item.kind === 'sampling' && item.modalEvent?.clientId && item.modalEvent.planId && item.modalEvent.samplingId && onUploadPhoto
                ? { clientId: item.modalEvent.clientId, planId: item.modalEvent.planId, samplingId: item.modalEvent.samplingId }
                : null
              return (
              <m.div
                key={'modalEvent' in item ? item.modalEvent?.id : `todo-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => item.kind === 'todo' ? navigate(item.link) : setEventDetail({ event: item.modalEvent as unknown as PlanningEvent, dateStr: activeDateISO })}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-[var(--color-bg-tertiary)] ${
                  idx < activeItems.slice(0, 8).length - 1 ? 'border-b border-[var(--color-border-subtle)]' : ''
                }`}
              >
                {item.time ? (
                  <span className="text-[11px] font-bold shrink-0 w-[38px] text-center py-1 rounded-[8px] bg-[var(--color-accent-light)] text-[var(--color-accent)] tracking-[-0.01em]">
                    {item.time}
                  </span>
                ) : (
                  <span className="shrink-0 w-[38px] flex justify-center mt-0.5">
                    <span className="shrink-0 size-2 rounded-full" style={{ background: item.dot }} />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug text-[var(--color-text-primary)]">{item.title}</p>
                  <p className="text-xs mt-0.5 text-[var(--color-text-secondary)]">{item.sub}</p>
                </div>
                {'cofrac' in item && item.cofrac && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                    COFRAC
                  </span>
                )}
                {'meteo' in item && item.meteo === 'pluie' && (
                  <span title="Prélèvement temps de pluie" className="shrink-0 text-[var(--color-accent)]">
                    <CloudRain size={15} strokeWidth={1.7} />
                  </span>
                )}
                {camera && (
                  <button
                    type="button"
                    aria-label="Ajouter une photo"
                    onClick={(e) => handleCameraClick(e, camera.clientId, camera.planId, camera.samplingId)}
                    className={`shrink-0 p-1 rounded-lg transition-colors hover:bg-[var(--color-bg-tertiary)] ${
                      uploadingId === camera.samplingId ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {uploadingId === camera.samplingId
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Camera size={14} />
                    }
                  </button>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                  style={{ background: item.badge.bg, color: item.badge.color }}>{item.badge.label}</span>
              </m.div>
              )
            })}
          </AnimatePresence>
        </m.div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {planningMode === 'today' && (
        <button
          type="button"
          onClick={() => navigate('/tournee')}
          className="w-full mt-3 py-3.5 rounded-[14px] text-sm font-semibold flex justify-center items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer bg-[var(--color-accent)] text-white shadow-[0_4px_14px_-6px_rgba(0,113,227,0.55)]"
        >
          <Truck size={17} strokeWidth={1.7} />
          <span>Démarrer la tournée du jour</span>
          <span className="text-xs font-normal opacity-80">· {activeItems.filter(i => i.kind === 'sampling').length} prélèvements</span>
        </button>
      )}
    </div>
  )
}
