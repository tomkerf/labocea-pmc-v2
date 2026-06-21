import { MapPin, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink } from 'lucide-react'
import { type PlanningEvent, getTechColor } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'

type WeatherState = {
  loading: boolean
  error: boolean
  rainWindows: { hour: number }[]
  maxProba: number
  maxMm: number
}

interface MapSidebarProps {
  centroid: { lat: number; lng: number } | null
  weather: WeatherState
  mappedEvts: PlanningEvent[]
  noGpsEvts: PlanningEvent[]
  selectedEventId: string | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  handleCenterOnMarker: (evt: PlanningEvent) => void
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
  dateStr: string
}

function formatRainLabel(w: WeatherState): string {
  if (w.rainWindows.length === 0) return '☀️ Pas de précipitations prévues'
  const groups: string[] = []
  let i = 0
  while (i < w.rainWindows.length) {
    const start = w.rainWindows[i].hour
    let end = start
    while (i + 1 < w.rainWindows.length && w.rainWindows[i + 1].hour === end + 1) {
      i++
      end = w.rainWindows[i].hour
    }
    groups.push(start === end ? `${start}h` : `${start}h–${end + 1}h`)
    i++
  }
  return `🌧️ Pluie probable ${groups.join(', ')} (${w.maxProba}%) · max ${w.maxMm.toFixed(1)} mm`
}

export default function MapSidebar({
  centroid, weather, mappedEvts, noGpsEvts, selectedEventId,
  sidebarOpen, setSidebarOpen, handleCenterOnMarker, handleSelectEvent, dateStr
}: MapSidebarProps) {
  return (
    <>
      {/* Panneau latéral (desktop uniquement) */}
      <div
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 relative z-10`}
        style={{
          width: sidebarOpen ? '320px' : '0px',
          minWidth: sidebarOpen ? '320px' : '0px',
          overflow: 'hidden',
          background: COLORS.BG_SECONDARY,
          borderRight: sidebarOpen ? '1px solid var(--color-border-subtle)' : 'none',
          boxShadow: sidebarOpen ? 'var(--shadow-card)' : 'none',
        }}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 scrollbar-none">
          {/* Bandeau météo */}
          {centroid && (
            <div className="mb-3 rounded-lg px-3 py-2" style={{ background: COLORS.BG_TERTIARY }}>
              {weather.loading ? (
                <div className="h-4 rounded animate-pulse" style={{ background: COLORS.BORDER, width: '75%' }} />
              ) : weather.error ? null : (
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] leading-snug" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {formatRainLabel(weather)}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    Météo : Open-Meteo.com
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Liste tournée du jour */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: COLORS.TEXT_SECONDARY }}>
              Tournée du jour ({mappedEvts.length})
            </h3>
            {mappedEvts.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-gray-200" style={{ background: COLORS.BG_PRIMARY }}>
                <MapPin className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Aucun point de prélèvement avec coordonnées GPS aujourd'hui.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {mappedEvts.map((evt, idx) => {
                  const tc = getTechColor(evt.technicien)
                  const isSelected = selectedEventId === evt.id
                  const color = evt.isDone ? COLORS.SUCCESS : tc.color
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => handleCenterOnMarker(evt)}
                      className="w-full p-3 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.01]"
                      style={{
                        background: isSelected ? 'var(--color-accent-light)' : COLORS.BG_SECONDARY,
                        borderColor: isSelected ? COLORS.ACCENT : 'var(--color-border-subtle)',
                        boxShadow: 'var(--shadow-card)',
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
                            <span className="text-[11px] font-bold uppercase truncate" style={{ color: COLORS.TEXT_SECONDARY }}>
                              {evt.title}
                            </span>
                            {evt.plannedTime && (
                              <span className="text-[11px] font-medium shrink-0 px-1.5 py-0.5 rounded" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
                                {evt.plannedTime}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold truncate mt-0.5" style={{ color: COLORS.TEXT_PRIMARY }}>
                            {evt.subtitle}
                          </h4>
                          <div className="flex items-center justify-between mt-2.5 text-[11px] font-medium">
                            <span className="px-2 py-0.5 rounded-full" style={{ background: evt.isDone ? 'var(--color-success-light)' : tc.bg, color: evt.isDone ? COLORS.SUCCESS : (tc.text || tc.color) }}>
                              {evt.isDone ? 'Terminé' : evt.technicien}
                            </span>
                            {evt.frequence && (
                              <span style={{ color: 'var(--color-text-tertiary)' }}>{evt.frequence}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Points sans coordonnées GPS */}
          {noGpsEvts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-amber-600">
                <AlertTriangle size={14} />
                <span>Sans coordonnées GPS ({noGpsEvts.length})</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {noGpsEvts.map(evt => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => handleSelectEvent(evt, dateStr)}
                    title="Cliquer pour configurer ce point"
                    className="w-full p-2.5 rounded-lg border flex items-center justify-between gap-2 hover:bg-amber-50/50 cursor-pointer transition-colors text-left"
                    style={{ background: COLORS.BG_SECONDARY, borderColor: '#f59e0b44' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase truncate text-amber-700">{evt.title}</div>
                      <div className="text-xs font-medium truncate text-gray-700">{evt.subtitle}</div>
                    </div>
                    <ExternalLink size={12} className="text-amber-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bouton repli */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le panneau"
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-l-0 rounded-r-lg shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 z-20"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <ChevronLeft size={16} style={{ color: COLORS.TEXT_SECONDARY }} />
        </button>
      </div>

      {/* Bouton réouverture */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Ouvrir le panneau"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-l-0 rounded-r-lg shadow-md items-center justify-center cursor-pointer hover:bg-gray-50 z-20"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <ChevronRight size={16} style={{ color: COLORS.TEXT_SECONDARY }} />
        </button>
      )}
    </>
  )
}
