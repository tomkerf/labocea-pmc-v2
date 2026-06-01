import { useState, useEffect, useRef, useMemo } from 'react'
import { useWeather } from '@/hooks/useWeather'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin, ChevronRight, ChevronLeft,
  AlertTriangle, ExternalLink
} from 'lucide-react'
import {
  type PlanningEvent,
  toISO, getTechColor, filterEvents, sortEvts
} from '@/lib/planningUtils'
import type { Preleveur } from '@/stores/preleveursStore'

interface MapViewProps {
  selectedDate:      Date
  today:             Date
  eventsByDate:      Record<string, PlanningEvent[]>
  filterTech:        string
  filterRetard:      boolean
  preleveurs:        Preleveur[]
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
}

export default function MapView({
  selectedDate, eventsByDate,
  filterTech, filterRetard,
  handleSelectEvent
}: MapViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const dateStr = toISO(selectedDate)

  // 1. Extraire et filtrer les événements de la journée
  const allEvents = useMemo(() => {
    const rawEvts = eventsByDate[dateStr] ?? []
    // Filtrer les événements météo et ne garder que les prélèvements et maintenances
    const activeEvts = rawEvts.filter(e => e.evenementData?.type !== 'meteo' && (e.type === 'prelevement' || e.type === 'maintenance'))
    return sortEvts(filterEvents(activeEvts, filterTech, filterRetard))
  }, [eventsByDate, dateStr, filterTech, filterRetard])

  // 2. Séparer les événements avec coordonnées GPS de ceux sans coordonnées
  const { mappedEvts, noGpsEvts } = useMemo(() => {
    const mapped: PlanningEvent[] = []
    const unmapped: PlanningEvent[] = []

    allEvents.forEach(evt => {
      const latNum = parseFloat(evt.lat || '')
      const lngNum = parseFloat(evt.lng || '')
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        mapped.push(evt)
      } else {
        unmapped.push(evt)
      }
    })

    return { mappedEvts: mapped, noGpsEvts: unmapped }
  }, [allEvents])

  // Barycentre des points GPS pour la requête météo
  const centroid = useMemo(() => {
    if (mappedEvts.length === 0) return null
    const sumLat = mappedEvts.reduce((acc, e) => acc + parseFloat(e.lat || '0'), 0)
    const sumLng = mappedEvts.reduce((acc, e) => acc + parseFloat(e.lng || '0'), 0)
    return { lat: sumLat / mappedEvts.length, lng: sumLng / mappedEvts.length }
  }, [mappedEvts])

  const weather = useWeather(centroid?.lat ?? null, centroid?.lng ?? null, selectedDate)

  // Refs pour l'instance Leaflet
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const markerGroupRef = useRef<L.FeatureGroup | null>(null)

  // Création personnalisée de l'icône SVG pour chaque marqueur
  const createCustomMarker = (event: PlanningEvent, index: number) => {
    const tc = getTechColor(event.technicien)
    const num = index + 1

    const colorHex = event.isDone ? '#34C759' : (tc.color.startsWith('var') ? '#0071E3' : tc.color)
    const markerHtml = `
      <div style="
        width: 28px;
        height: 28px;
        background-color: ${colorHex};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        ${num}
      </div>
    `

    return L.divIcon({
      html: markerHtml,
      className: 'custom-leaflet-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16]
    })
  }

  // Initialisation de la carte
  useEffect(() => {
    if (!containerRef.current) return

    // Si la carte n'existe pas encore, on l'initialise
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false // Retirer les boutons de zoom natifs pour un look épuré
      }).setView([48.20, -2.90], 8) // Centré par défaut sur la Bretagne

      // TileLayer premium et épuré (CartoDB Voyager)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(mapRef.current)

      // Rajouter le contrôle du zoom en bas à droite
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapRef.current)

      // Ajuster la taille après affichage initial dans le DOM (compense flex/reflow)
      const initTimer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize()
          setMapReady(true)
        }
      }, 200)

      return () => {
        clearTimeout(initTimer)
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }
        setMapReady(false)
      }
    }
  }, [])

  // Mise à jour des marqueurs quand la liste change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return

    // S'assurer de la présence du groupe de marqueurs
    if (!markerGroupRef.current) {
      markerGroupRef.current = L.featureGroup().addTo(mapRef.current)
    }

    const markerGroup = markerGroupRef.current
    if (!markerGroup) return

    markerGroup.clearLayers()

    const markers: L.Marker[] = []

    mappedEvts.forEach((evt, idx) => {
      const latNum = parseFloat(evt.lat || '')
      const lngNum = parseFloat(evt.lng || '')
      if (isNaN(latNum) || isNaN(lngNum)) return

      const marker = L.marker([latNum, lngNum], {
        icon: createCustomMarker(evt, idx)
      })

      const tc = getTechColor(evt.technicien)
      const color = evt.isDone ? 'var(--color-success)' : tc.color

      // Popup HTML premium style Apple
      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; padding: 4px; min-width: 220px; line-height: var(--leading-normal);">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-text-secondary); margin-bottom: 2px; letter-spacing: 0.04em;">
            ${evt.title}
          </div>
          <div style="font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 8px;">
            ${evt.subtitle}
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--color-text-secondary); margin-bottom: 12px; border-top: 1px solid var(--color-border-subtle); padding-top: 8px;">
            <div>🏷️ Type : <strong>${evt.type === 'prelevement' ? 'Prélèvement' : 'Maintenance'}</strong></div>
            ${evt.frequence ? `<div>🔁 Fréquence : <strong>${evt.frequence}</strong></div>` : ''}
            ${evt.plannedTime ? `<div>⏰ Heure : <strong>${evt.plannedTime}</strong></div>` : ''}
            <div style="display: flex; align-items: center; gap: 4px;">
              👤 Tech : 
              <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: ${color};">
                <span style="width: 6px; height: 6px; borderRadius: 50%; background: ${color};"></span>
                ${evt.technicien}
              </span>
            </div>
            ${evt.isDone ? `<div style="color: var(--color-success); font-weight: 600; display: flex; align-items: center; gap: 4px;">✓ Terminé</div>` : ''}
          </div>
          <div style="display: flex; gap: 8px; border-top: 1px solid var(--color-border-subtle); padding-top: 8px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}" target="_blank" rel="noopener noreferrer" 
               style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; flex: 1; padding: 7px 10px; font-size: 11px; font-weight: 600; text-align: center; border-radius: var(--radius-sm); background: var(--color-accent); color: white; text-decoration: none;">
              🚗 GPS
            </a>
            <button type="button" id="popup-btn-fiche-${evt.id}"
               style="display: inline-flex; align-items: center; justify-content: center; padding: 7px 10px; font-size: 11px; font-weight: 600; border-radius: var(--radius-sm); border: 1px solid var(--color-border); color: var(--color-text-primary); cursor: pointer; background: var(--color-bg-secondary);">
              Fiche ➔
            </button>
          </div>
        </div>
      `

      marker.bindPopup(popupHtml)
      
      // Gérer le clic sur le bouton "Fiche" dans la popup Leaflet
      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-fiche-${evt.id}`)
        if (btn) {
          btn.onclick = (e) => {
            e.preventDefault()
            handleSelectEvent(evt, dateStr)
          }
        }
        setSelectedEventId(evt.id)
      })

      marker.on('popupclose', () => {
        setSelectedEventId(null)
      })

      markerGroup.addLayer(marker)
      markers.push(marker)
    })

    // Réajuster la taille de la carte pour parer aux soucis de montage flexbox
    mapRef.current.invalidateSize()

    // Zoomer/Ajuster la carte pour afficher tous les marqueurs du jour
    if (markers.length > 0) {
      mapRef.current.fitBounds(markerGroup.getBounds(), {
        padding: [50, 50],
        maxZoom: 15
      })
    } else {
      // Centrer sur la Bretagne si aucun marqueur
      mapRef.current.setView([48.20, -2.90], 8)
    }

    return () => {
      markers.forEach(m => m.off())
      markerGroup.clearLayers()
    }
  }, [mappedEvts, mapReady])


  // Centrer et ouvrir le popup d'un prélèvement lors d'un clic sur la liste
  const handleCenterOnMarker = (evt: PlanningEvent) => {
    const latNum = parseFloat(evt.lat || '')
    const lngNum = parseFloat(evt.lng || '')
    if (isNaN(latNum) || isNaN(lngNum) || !mapRef.current) return

    setSelectedEventId(evt.id)
    mapRef.current.setView([latNum, lngNum], 14)

    // Parcourir le groupe pour ouvrir la popup correspondante
    if (markerGroupRef.current) {
      markerGroupRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          const latLng = layer.getLatLng()
          // Vérification à epsilon près pour parer aux soucis de float
          if (Math.abs(latLng.lat - latNum) < 0.0001 && Math.abs(latLng.lng - lngNum) < 0.0001) {
            layer.openPopup()
          }
        }
      })
    }
  }

  function formatRainLabel(w: typeof weather): string {
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

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row relative overflow-hidden bg-gray-100">
      
      {/* ── BARRE LATÉRALE (Desktop uniquement) ── */}
      <div
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 relative z-10`}
        style={{
          width: sidebarOpen ? '320px' : '0px',
          minWidth: sidebarOpen ? '320px' : '0px',
          overflow: 'hidden',
          background: 'var(--color-bg-secondary)',
          borderRight: sidebarOpen ? '1px solid var(--color-border-subtle)' : 'none',
          boxShadow: sidebarOpen ? 'var(--shadow-card)' : 'none'
        }}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 scrollbar-none">
          {/* Bandeau météo */}
          {centroid && (
            <div className="mb-3 rounded-lg px-3 py-2" style={{ background: 'var(--color-bg-tertiary)' }}>
              {weather.loading ? (
                <div className="h-4 rounded animate-pulse" style={{ background: 'var(--color-border)', width: '75%' }} />
              ) : weather.error ? null : (
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatRainLabel(weather)}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    Météo : Open-Meteo.com
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Tournée du jour ({mappedEvts.length})
            </h3>
            
            {mappedEvts.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-gray-200" style={{ background: 'var(--color-bg-primary)' }}>
                <MapPin className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Aucun point de prélèvement avec coordonnées GPS aujourd'hui.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {mappedEvts.map((evt, idx) => {
                  const tc = getTechColor(evt.technicien)
                  const isSelected = selectedEventId === evt.id
                  const color = evt.isDone ? 'var(--color-success)' : tc.color
                  return (
                    <div 
                      key={evt.id}
                      onClick={() => handleCenterOnMarker(evt)}
                      className="p-3 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.01]"
                      style={{
                        background: isSelected ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                        boxShadow: 'var(--shadow-card)'
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Numéro de séquence personnalisé */}
                        <div 
                          className="size-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                          style={{ background: color }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[11px] font-bold uppercase truncate" style={{ color: 'var(--color-text-secondary)' }}>
                              {evt.title}
                            </span>
                            {evt.plannedTime && (
                              <span className="text-[11px] font-medium shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                                {evt.plannedTime}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold truncate mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                            {evt.subtitle}
                          </h4>
                          
                          <div className="flex items-center justify-between mt-2.5 text-[11px] font-medium">
                            <span className="px-2 py-0.5 rounded-full" style={{ background: evt.isDone ? 'var(--color-success-light)' : tc.bg, color: color }}>
                              {evt.isDone ? 'Terminé' : evt.technicien}
                            </span>
                            {evt.frequence && (
                              <span style={{ color: 'var(--color-text-tertiary)' }}>{evt.frequence}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section Fallback : Points sans coordonnées GPS */}
          {noGpsEvts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-amber-600">
                <AlertTriangle size={14} />
                <span>Sans coordonnées GPS ({noGpsEvts.length})</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {noGpsEvts.map(evt => (
                  <div 
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt, dateStr)}
                    className="p-2.5 rounded-lg border flex items-center justify-between gap-2 hover:bg-amber-50/50 cursor-pointer transition-colors"
                    style={{
                      background: 'var(--color-bg-secondary)',
                      borderColor: '#f59e0b44'
                    }}
                    title="Cliquer pour configurer ce point"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase truncate text-amber-700">
                        {evt.title}
                      </div>
                      <div className="text-xs font-medium truncate text-gray-700">
                        {evt.subtitle}
                      </div>
                    </div>
                    <ExternalLink size={12} className="text-amber-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bouton de repli de la barre latérale */}
        <button type="button" 
          onClick={() => setSidebarOpen(false)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-l-0 rounded-r-lg shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 z-20"
          style={{ borderColor: 'var(--color-border-subtle)' }}
          aria-label="Fermer le panneau"
        >
          <ChevronLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      {/* Bouton de réouverture si la barre latérale est repliée */}
      {!sidebarOpen && (
        <button type="button" 
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-l-0 rounded-r-lg shadow-md items-center justify-center cursor-pointer hover:bg-gray-50 z-20"
          style={{ borderColor: 'var(--color-border-subtle)' }}
          aria-label="Ouvrir le panneau"
        >
          <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      )}

      {/* ── LA CARTE (Leaflet) ── */}
      <div className="flex-1 size-full relative z-0">
        <div ref={containerRef} className="size-full" />
        
        {/* Mobile Horizontal Overlay (Bottom) */}
        {mappedEvts.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] md:hidden flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
            {mappedEvts.map((evt, idx) => {
              const tc = getTechColor(evt.technicien)
              const isSelected = selectedEventId === evt.id
              const color = evt.isDone ? 'var(--color-success)' : tc.color
              return (
                <div 
                  key={evt.id}
                  onClick={() => handleCenterOnMarker(evt)}
                  className="w-[280px] p-3 shrink-0 rounded-xl border text-left cursor-pointer transition-all snap-center shadow-lg"
                  style={{
                    background: isSelected ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-subtle)',
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
                        <span className="text-[10px] font-bold uppercase truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {evt.title}
                        </span>
                        {evt.plannedTime && (
                          <span className="text-[10px] font-medium shrink-0 px-1 py-0.2 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                            {evt.plannedTime}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold truncate mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                        {evt.subtitle}
                      </h4>
                      
                      <div className="flex items-center justify-between mt-2 text-[10px] font-semibold">
                        <span className="px-2 py-0.5 rounded-full" style={{ background: evt.isDone ? 'var(--color-success-light)' : tc.bg, color: color }}>
                          {evt.isDone ? 'Fait' : evt.technicien}
                        </span>
                        <div className="flex gap-2">
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${evt.lat},${evt.lng}`} target="_blank" rel="noopener noreferrer" 
                             className="text-accent flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                            🚗 GPS
                          </a>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-600" onClick={(e) => { e.stopPropagation(); handleSelectEvent(evt, dateStr) }}>
                            Fiche ➔
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Mobile floating pill if there are unmapped events */}
        {noGpsEvts.length > 0 && (
          <div className="absolute top-4 left-4 z-[1000] md:hidden">
            <button type="button"
              onClick={() => alert(`Il y a ${noGpsEvts.length} prélèvement(s) aujourd'hui sans coordonnées GPS. Modifie-les dans l'onglet Missions pour les faire apparaître.`)}
              aria-label={`${noGpsEvts.length} prélèvement(s) sans coordonnées GPS`}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-full shadow-lg text-[10px] font-bold uppercase tracking-wider"
            >
              <AlertTriangle size={12} />
              <span>{noGpsEvts.length} sans GPS</span>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
