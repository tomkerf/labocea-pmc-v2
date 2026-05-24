import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWeather } from '@/hooks/useWeather'

// Créer une date UTC 2026-05-24T00:00:00Z
const BASE_DATE = new Date('2026-05-24T00:00:00Z')

function makeFetchResponse(times: string[], probas: number[], mms: number[]) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      hourly: {
        time: times,
        precipitation_probability: probas,
        precipitation: mms,
      }
    })
  } as Response)
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useWeather', () => {
  it('retourne EMPTY sans fetch si lat/lng null', () => {
    const { result } = renderHook(() => useWeather(null, null, BASE_DATE))
    expect(result.current.loading).toBe(false)
    expect(result.current.rainWindows).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loading=true pendant le fetch', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useWeather(48.2, -2.9, BASE_DATE))
    expect(result.current.loading).toBe(true)
  })

  it('extrait les créneaux avec probabilité > 30%', async () => {
    const times = [
      '2026-05-24T08:00', '2026-05-24T14:00', '2026-05-24T15:00',
      '2026-05-25T08:00'
    ]
    const probas = [20, 70, 50, 90]
    const mms = [0, 3.2, 1.1, 5.0]
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(times, probas, mms))

    const { result } = renderHook(() => useWeather(48.2, -2.9, BASE_DATE))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Seules les heures du 2026-05-24 sont filtrées (08, 14, 15)
    // Parmi celles-ci, seules 14 et 15 ont proba > 30%
    expect(result.current.rainWindows).toHaveLength(2)
    expect(result.current.rainWindows[0]).toEqual({ hour: 14, proba: 70, mm: 3.2 })
    expect(result.current.rainWindows[1]).toEqual({ hour: 15, proba: 50, mm: 1.1 })
    // maxProba et maxMm sont le max parmi TOUTES les heures du jour (08, 14, 15)
    expect(result.current.maxProba).toBe(70)
    expect(result.current.maxMm).toBeCloseTo(3.2)
  })

  it('aucun créneau si toutes probabilités ≤ 30%, mais maxProba mis à jour', async () => {
    const times = [
      '2026-05-24T06:00', '2026-05-24T10:00', '2026-05-24T12:00', '2026-05-25T08:00'
    ]
    const probas = [10, 20, 30, 50]
    const mms = [0, 0, 0, 2.5]
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(times, probas, mms))

    const { result } = renderHook(() => useWeather(48.2, -2.9, BASE_DATE))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Seules les heures de 2026-05-24 sont considérées
    // Toutes ont proba ≤ 30%, donc rainWindows est vide
    expect(result.current.rainWindows).toHaveLength(0)
    // Mais maxProba doit être le max du jour (30)
    expect(result.current.maxProba).toBe(30)
  })

  it('error=true sur erreur réseau, fail silencieux', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useWeather(48.2, -2.9, BASE_DATE))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(true)
    expect(result.current.rainWindows).toHaveLength(0)
  })

  it('error=true sur réponse HTTP non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    const { result } = renderHook(() => useWeather(48.2, -2.9, BASE_DATE))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(true)
  })
})
