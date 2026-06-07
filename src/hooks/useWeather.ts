import { useState, useEffect } from 'react'

export interface RainWindow {
  hour: number
  proba: number
  mm: number
}

export interface WeatherResult {
  loading: boolean
  error: boolean
  maxProba: number
  maxMm: number
  rainWindows: RainWindow[]
}

const EMPTY: WeatherResult = { loading: false, error: false, maxProba: 0, maxMm: 0, rainWindows: [] }

export function useWeather(
  lat: number | null,
  lng: number | null,
  date: Date
): WeatherResult {
  const dateStr = date.toISOString().slice(0, 10)
  const fetchKey = lat !== null && lng !== null ? `${lat}_${lng}_${dateStr}` : ''

  const [result, setResult] = useState<WeatherResult>(() =>
    fetchKey ? { ...EMPTY, loading: true } : EMPTY
  )
  const [prevKey, setPrevKey] = useState(fetchKey)

  if (fetchKey !== prevKey) {
    setPrevKey(fetchKey)
    setResult(fetchKey ? { ...EMPTY, loading: true } : EMPTY)
  }

  useEffect(() => {
    if (!fetchKey || lat === null || lng === null) return

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&hourly=precipitation_probability,precipitation` +
      `&timezone=Europe%2FParis&forecast_days=14`

    let cancelled = false

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('weather fetch failed')
        return r.json()
      })
      .then((data: {
        hourly: {
          time: string[]
          precipitation_probability: number[]
          precipitation: number[]
        }
      }) => {
        if (cancelled) return

        const times = data.hourly.time
        const probas = data.hourly.precipitation_probability
        const mms = data.hourly.precipitation

        const windows: RainWindow[] = []
        let maxProba = 0
        let maxMm = 0

        times.forEach((t, i) => {
          if (!t.startsWith(dateStr)) return
          const hour = parseInt(t.slice(11, 13), 10)
          const proba = probas[i] ?? 0
          const mm = mms[i] ?? 0
          if (proba > maxProba) maxProba = proba
          if (mm > maxMm) maxMm = mm
          if (proba > 30) windows.push({ hour, proba, mm })
        })

        setResult({ loading: false, error: false, maxProba, maxMm, rainWindows: windows })
      })
      .catch(() => {
        if (!cancelled) setResult({ loading: false, error: true, maxProba: 0, maxMm: 0, rainWindows: [] })
      })

    return () => { cancelled = true }
  }, [fetchKey, lat, lng, dateStr])

  return result
}
