import { useMemo } from 'react'
import { useWeather } from '@/hooks/useWeather'
import { type PlanningEvent } from '@/lib/planningUtils'

interface WeatherBadgeProps {
  events: PlanningEvent[]
  date: Date
  className?: string
  compact?: boolean
}

export default function WeatherBadge({ events, date, className = '', compact = false }: WeatherBadgeProps) {
  const centroid = useMemo(() => {
    const active = events.filter(e => !e.isGhost && (e.type === 'prelevement' || e.type === 'maintenance'))
    const mapped = active.filter(e => {
      const lat = parseFloat(e.lat || '')
      const lng = parseFloat(e.lng || '')
      return !isNaN(lat) && !isNaN(lng)
    })
    if (mapped.length === 0) return null
    const sumLat = mapped.reduce((acc, e) => acc + parseFloat(e.lat || '0'), 0)
    const sumLng = mapped.reduce((acc, e) => acc + parseFloat(e.lng || '0'), 0)
    return { lat: sumLat / mapped.length, lng: sumLng / mapped.length }
  }, [events])

  const weather = useWeather(centroid?.lat ?? null, centroid?.lng ?? null, date)

  if (!centroid || weather.loading || weather.error || !weather.rainWindows || weather.rainWindows.length === 0) {
    return null
  }

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

  const fullText = `🌧️ ${groups.join(', ')} (${weather.maxProba}%) · max ${weather.maxMm.toFixed(1)} mm`
  const tooltip = `Pluie probable : ${groups.join(', ')} (${weather.maxProba}%) · max ${weather.maxMm.toFixed(1)} mm`

  return (
    <div 
      className={`flex items-center justify-center gap-1 text-[9px] font-semibold rounded-md px-1.5 py-0.5 ${compact ? 'whitespace-nowrap rounded-full' : 'text-center leading-tight'} ${className}`}
      style={{ background: 'rgba(0,113,227,0.1)', color: '#0071E3' }}
      title={tooltip}
    >
      {compact ? (
        <>
          <span>🌧️</span>
          <span>{weather.maxProba}%</span>
        </>
      ) : (
        <span>{fullText}</span>
      )}
    </div>
  )
}
