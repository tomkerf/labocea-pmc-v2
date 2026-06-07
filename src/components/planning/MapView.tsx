import { useState, useMemo } from 'react'
import { useWeather } from '@/hooks/useWeather'
import 'leaflet/dist/leaflet.css'
import { type PlanningEvent, toISO, filterEvents, sortEvts } from '@/lib/planningUtils'
import type { Preleveur } from '@/stores/preleveursStore'
import { useMapMarkers } from './useMapMarkers'
import MapSidebar from './MapSidebar'
import MapMobileCarousel from './MapMobileCarousel'

interface MapViewProps {
  selectedDate:      Date
  today:             Date
  eventsByDate:      Record<string, PlanningEvent[]>
  filterTech:        string
  allowedTechs:      string[]
  filterRetard:      boolean
  preleveurs:        Preleveur[]
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
}

export default function MapView({
  selectedDate, eventsByDate,
  filterTech, allowedTechs, filterRetard,
  handleSelectEvent
}: MapViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const dateStr = toISO(selectedDate)

  // Filtrage et séparation GPS / sans-GPS
  const allEvents = useMemo(() => {
    const raw = eventsByDate[dateStr] ?? []
    const active = raw.filter(e => !e.isGhost && e.evenementData?.type !== 'meteo' && (e.type === 'prelevement' || e.type === 'maintenance'))
    return sortEvts(filterEvents(active, filterTech, filterRetard, allowedTechs))
  }, [eventsByDate, dateStr, filterTech, filterRetard, allowedTechs])

  const { mappedEvts, noGpsEvts } = useMemo(() => {
    const mapped: PlanningEvent[] = []
    const unmapped: PlanningEvent[] = []
    allEvents.forEach(evt => {
      const lat = parseFloat(evt.lat || '')
      const lng = parseFloat(evt.lng || '')
      if (!isNaN(lat) && !isNaN(lng)) mapped.push(evt)
      else unmapped.push(evt)
    })
    return { mappedEvts: mapped, noGpsEvts: unmapped }
  }, [allEvents])

  // Barycentre pour la météo
  const centroid = useMemo(() => {
    if (mappedEvts.length === 0) return null
    const sumLat = mappedEvts.reduce((acc, e) => acc + parseFloat(e.lat || '0'), 0)
    const sumLng = mappedEvts.reduce((acc, e) => acc + parseFloat(e.lng || '0'), 0)
    return { lat: sumLat / mappedEvts.length, lng: sumLng / mappedEvts.length }
  }, [mappedEvts])

  const weather = useWeather(centroid?.lat ?? null, centroid?.lng ?? null, selectedDate)

  const { containerRef, selectedEventId, handleCenterOnMarker } = useMapMarkers(
    mappedEvts, handleSelectEvent, dateStr
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row relative overflow-hidden bg-gray-100">
      <MapSidebar
        centroid={centroid}
        weather={weather}
        mappedEvts={mappedEvts}
        noGpsEvts={noGpsEvts}
        selectedEventId={selectedEventId}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleCenterOnMarker={handleCenterOnMarker}
        handleSelectEvent={handleSelectEvent}
        dateStr={dateStr}
      />

      {/* Carte Leaflet */}
      <div className="flex-1 size-full relative z-0">
        <div ref={containerRef} className="size-full" />
        <MapMobileCarousel
          mappedEvts={mappedEvts}
          noGpsEvts={noGpsEvts}
          selectedEventId={selectedEventId}
          handleCenterOnMarker={handleCenterOnMarker}
          handleSelectEvent={handleSelectEvent}
          dateStr={dateStr}
        />
      </div>
    </div>
  )
}
