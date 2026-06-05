import { AlertTriangle } from 'lucide-react'
import { type PlanningEvent, getTechColor } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'

interface MapMobileCarouselProps {
  mappedEvts: PlanningEvent[]
  noGpsEvts: PlanningEvent[]
  selectedEventId: string | null
  handleCenterOnMarker: (evt: PlanningEvent) => void
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
  dateStr: string
}

export default function MapMobileCarousel({
  mappedEvts, noGpsEvts, selectedEventId,
  handleCenterOnMarker, handleSelectEvent, dateStr
}: MapMobileCarouselProps) {
  return (
    <>
      {/* Carousel horizontal bas (mobile) */}
      {mappedEvts.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] md:hidden flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
          {mappedEvts.map((evt, idx) => {
            const tc = getTechColor(evt.technicien)
            const isSelected = selectedEventId === evt.id
            const color = evt.isDone ? COLORS.SUCCESS : tc.color
            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => handleCenterOnMarker(evt)}
                className="w-[280px] p-3 shrink-0 rounded-xl border text-left cursor-pointer transition-all snap-center shadow-lg"
                style={{
                  background: isSelected ? 'var(--color-accent-light)' : COLORS.BG_SECONDARY,
                  borderColor: isSelected ? COLORS.ACCENT : 'var(--color-border-subtle)',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="size-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                    style={{ background: color }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-bold uppercase truncate" style={{ color: COLORS.TEXT_SECONDARY }}>
                        {evt.title}
                      </span>
                      {evt.plannedTime && (
                        <span className="text-[10px] font-medium shrink-0 px-1 py-0.5 rounded" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
                          {evt.plannedTime}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold truncate mt-0.5" style={{ color: COLORS.TEXT_PRIMARY }}>
                      {evt.subtitle}
                    </h4>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-semibold">
                      <span className="px-2 py-0.5 rounded-full" style={{ background: evt.isDone ? 'var(--color-success-light)' : tc.bg, color }}>
                        {evt.isDone ? 'Fait' : evt.technicien}
                      </span>
                      <div className="flex gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${evt.lat},${evt.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent flex items-center gap-0.5"
                          onClick={e => e.stopPropagation()}
                        >
                          🚗 GPS
                        </a>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          className="text-gray-600 text-left"
                          onClick={e => { e.stopPropagation(); handleSelectEvent(evt, dateStr) }}
                        >
                          Fiche ➔
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Pill mobile sans-GPS */}
      {noGpsEvts.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000] md:hidden">
          <button
            type="button"
            aria-label={`${noGpsEvts.length} prélèvement(s) sans coordonnées GPS`}
            onClick={() => alert(`Il y a ${noGpsEvts.length} prélèvement(s) aujourd'hui sans coordonnées GPS. Modifie-les dans l'onglet Missions pour les faire apparaître.`)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-full shadow-lg text-[10px] font-bold uppercase tracking-wider"
          >
            <AlertTriangle size={12} />
            <span>{noGpsEvts.length} sans GPS</span>
          </button>
        </div>
      )}
    </>
  )
}
