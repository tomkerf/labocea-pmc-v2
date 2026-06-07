import { useMemo } from 'react'
import { useWeather } from '@/hooks/useWeather'
import { type PlanningEvent } from '@/lib/planningUtils'

interface WeatherBadgeProps {
  events: PlanningEvent[]
  fallbackEvents?: PlanningEvent[]
  date: Date
  className?: string
  compact?: boolean
}

const EMPTY_EVENTS: PlanningEvent[] = []

function getWeatherEmoji(code: number | undefined): string {
  if (code === undefined) return '☁️'
  switch (code) {
    case 0: return '☀️' // Clear sky
    case 1: case 2: return '🌤️' // Mainly clear, partly cloudy
    case 3: return '☁️' // Overcast
    case 45: case 48: return '🌫️' // Fog
    case 51: case 53: case 55: case 56: case 57: return '🌧️' // Drizzle
    case 61: case 63: case 65: case 66: case 67: return '🌧️' // Rain
    case 71: case 73: case 75: case 77: return '❄️' // Snow
    case 80: case 81: case 82: return '🌦️' // Rain showers
    case 85: case 86: return '🌨️' // Snow showers
    case 95: case 96: case 99: return '⛈️' // Thunderstorm
    default: return '☁️'
  }
}

export default function WeatherBadge({ events, fallbackEvents = EMPTY_EVENTS, date, className = '', compact = false }: WeatherBadgeProps) {
  const centroid = useMemo(() => {
    let active = events.filter(e => !e.isGhost && (e.type === 'prelevement' || e.type === 'maintenance'))
    let mapped = active.filter(e => {
      const lat = parseFloat(e.lat || '')
      const lng = parseFloat(e.lng || '')
      return !isNaN(lat) && !isNaN(lng)
    })
    
    // Fallback aux événements de la période si aucun événement géolocalisé ce jour-là
    if (mapped.length === 0 && fallbackEvents.length > 0) {
      active = fallbackEvents.filter(e => !e.isGhost && (e.type === 'prelevement' || e.type === 'maintenance'))
      mapped = active.filter(e => {
        const lat = parseFloat(e.lat || '')
        const lng = parseFloat(e.lng || '')
        return !isNaN(lat) && !isNaN(lng)
      })
    }

    if (mapped.length === 0) return null
    const sumLat = mapped.reduce((acc, e) => acc + parseFloat(e.lat || '0'), 0)
    const sumLng = mapped.reduce((acc, e) => acc + parseFloat(e.lng || '0'), 0)
    return { lat: sumLat / mapped.length, lng: sumLng / mapped.length }
  }, [events, fallbackEvents])

  const weather = useWeather(centroid?.lat ?? null, centroid?.lng ?? null, date)

  if (!centroid || weather.loading || weather.error || weather.weatherCode === undefined) {
    return null
  }

  const hasRain = weather.rainWindows && weather.rainWindows.length > 0
  const emoji = hasRain ? '🌧️' : getWeatherEmoji(weather.weatherCode)

  let fullText = ''
  let tooltip = ''

  if (hasRain) {
    const groups: string[] = []
    let i = 0
    while (i < weather.rainWindows.length) {
      const start = weather.rainWindows[i].hour
      let end = start
      while (i + 1 < weather.rainWindows.length && weather.rainWindows[i + 1].hour === end + 1) {
        i++
        end = weather.rainWindows[i].hour
      }
      groups.push(start === end ? `${start}h` : `${start}h–${end + 1}h`)
      i++
    }

    fullText = `${emoji} ${weather.tempMax !== undefined ? Math.round(weather.tempMax) + '° · ' : ''}${groups.join(', ')} (${weather.maxProba}%) · max\u00A0${weather.maxMm.toFixed(1)}\u00A0mm`
    tooltip = `Température max: ${weather.tempMax}°C. Pluie probable : ${groups.join(', ')} (${weather.maxProba}%) · max\u00A0${weather.maxMm.toFixed(1)}\u00A0mm`
  } else {
    fullText = `${emoji} ${weather.tempMax !== undefined ? Math.round(weather.tempMax) + '°' : ''}`
    tooltip = `Pas de pluie prévue. Température max: ${weather.tempMax}°C, min: ${weather.tempMin}°C`
  }

  // Si c'est juste la température (pas de pluie), on peut changer la couleur pour que ce soit moins "alerte pluie"
  const bgColor = hasRain ? 'rgba(0,113,227,0.1)' : 'var(--color-bg-tertiary)'
  const textColor = hasRain ? '#0071E3' : 'var(--color-text-secondary)'

  return (
    <div 
      className={`flex items-center justify-center gap-1 text-[9px] font-semibold rounded-md px-1.5 py-0.5 ${compact ? 'whitespace-nowrap rounded-full' : 'text-center leading-tight'} ${className}`}
      style={{ background: bgColor, color: textColor }}
      title={tooltip}
    >
      {compact ? (
        <>
          <span>{emoji}</span>
          {hasRain ? <span>{weather.tempMax !== undefined ? Math.round(weather.tempMax) + '° · ' : ''}{weather.maxProba}%</span> : <span>{weather.tempMax !== undefined ? Math.round(weather.tempMax) + '°' : ''}</span>}
        </>
      ) : (
        <span>{fullText}</span>
      )}
    </div>
  )
}
