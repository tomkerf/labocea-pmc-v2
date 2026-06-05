import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { type PlanningEvent, getTechColor } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'

export function useMapMarkers(
  mappedEvts: PlanningEvent[],
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void,
  dateStr: string
) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const markerGroupRef = useRef<L.FeatureGroup | null>(null)

  function createCustomMarker(event: PlanningEvent, index: number): L.DivIcon {
    const tc = getTechColor(event.technicien)
    const colorHex = event.isDone ? '#34C759' : (tc.color.startsWith('var') ? '#0071E3' : tc.color)
    const html = `<div style="width:28px;height:28px;background-color:${colorHex};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`
    return L.divIcon({ html, className: 'custom-leaflet-marker', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] })
  }

  // Initialisation de la carte
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = L.map(containerRef.current, { zoomControl: false }).setView([48.20, -2.90], 8)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(mapRef.current)

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)

    const initTimer = setTimeout(() => {
      if (mapRef.current) { mapRef.current.invalidateSize(); setMapReady(true) }
    }, 200)

    return () => {
      clearTimeout(initTimer)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      setMapReady(false)
    }
  }, [])

  // Mise à jour des marqueurs
  useEffect(() => {
    if (!mapRef.current || !mapReady) return

    if (!markerGroupRef.current) {
      markerGroupRef.current = L.featureGroup().addTo(mapRef.current)
    }
    const markerGroup = markerGroupRef.current
    markerGroup.clearLayers()
    const markers: L.Marker[] = []

    mappedEvts.forEach((evt, idx) => {
      const latNum = parseFloat(evt.lat || '')
      const lngNum = parseFloat(evt.lng || '')
      if (isNaN(latNum) || isNaN(lngNum)) return

      const tc = getTechColor(evt.technicien)
      const color = evt.isDone ? COLORS.SUCCESS : tc.color

      const popupHtml = `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;padding:4px;min-width:220px;line-height:var(--leading-normal);">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--color-text-secondary);margin-bottom:2px;letter-spacing:0.04em;">${evt.title}</div>
        <div style="font-size:15px;font-weight:600;color:var(--color-text-primary);margin-bottom:8px;">${evt.subtitle}</div>
        <div style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--color-text-secondary);margin-bottom:12px;border-top:1px solid var(--color-border-subtle);padding-top:8px;">
          <div>🏷️ Type : <strong>${evt.type === 'prelevement' ? 'Prélèvement' : 'Maintenance'}</strong></div>
          ${evt.frequence ? `<div>🔁 Fréquence : <strong>${evt.frequence}</strong></div>` : ''}
          ${evt.plannedTime ? `<div>⏰ Heure : <strong>${evt.plannedTime}</strong></div>` : ''}
          <div style="display:flex;align-items:center;gap:4px;">👤 Tech :
            <span style="display:inline-flex;align-items:center;gap:4px;font-weight:600;color:${color};">
              <span style="width:6px;height:6px;border-radius:50%;background:${color};"></span>
              ${evt.technicien}
            </span>
          </div>
          ${evt.isDone ? `<div style="color:var(--color-success);font-weight:600;display:flex;align-items:center;gap:4px;">✓ Terminé</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;border-top:1px solid var(--color-border-subtle);padding-top:8px;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}" target="_blank" rel="noopener noreferrer"
             style="display:inline-flex;align-items:center;justify-content:center;gap:4px;flex:1;padding:7px 10px;font-size:11px;font-weight:600;text-align:center;border-radius:var(--radius-sm);background:var(--color-accent);color:white;text-decoration:none;">
            🚗 GPS
          </a>
          <button type="button" id="popup-btn-fiche-${evt.id}"
             style="display:inline-flex;align-items:center;justify-content:center;padding:7px 10px;font-size:11px;font-weight:600;border-radius:var(--radius-sm);border:1px solid var(--color-border);color:var(--color-text-primary);cursor:pointer;background:var(--color-bg-secondary);">
            Fiche ➔
          </button>
        </div>
      </div>`

      const marker = L.marker([latNum, lngNum], { icon: createCustomMarker(evt, idx) })
      marker.bindPopup(popupHtml)
      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-fiche-${evt.id}`)
        if (btn) btn.onclick = (e) => { e.preventDefault(); handleSelectEvent(evt, dateStr) }
        setSelectedEventId(evt.id)
      })
      marker.on('popupclose', () => setSelectedEventId(null))
      markerGroup.addLayer(marker)
      markers.push(marker)
    })

    mapRef.current.invalidateSize()
    if (markers.length > 0) {
      mapRef.current.fitBounds(markerGroup.getBounds(), { padding: [50, 50], maxZoom: 15 })
    } else {
      mapRef.current.setView([48.20, -2.90], 8)
    }

    return () => {
      markers.forEach(m => m.off())
      markerGroup.clearLayers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedEvts, mapReady])

  function handleCenterOnMarker(evt: PlanningEvent) {
    const latNum = parseFloat(evt.lat || '')
    const lngNum = parseFloat(evt.lng || '')
    if (isNaN(latNum) || isNaN(lngNum) || !mapRef.current) return

    setSelectedEventId(evt.id)
    mapRef.current.setView([latNum, lngNum], 14)

    markerGroupRef.current?.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker) {
        const ll = layer.getLatLng()
        if (Math.abs(ll.lat - latNum) < 0.0001 && Math.abs(ll.lng - lngNum) < 0.0001) {
          layer.openPopup()
        }
      }
    })
  }

  return { containerRef, selectedEventId, handleCenterOnMarker }
}
