# Météo Carte des Tournées — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher un bandeau de prévisions de précipitations en haut de la sidebar de MapView, calculé au barycentre des points GPS de la journée via l'API Open-Meteo.

**Architecture:** Un hook `useWeather(lat, lng, date)` isole le fetch Open-Meteo et expose les créneaux pluvieux. MapView calcule le barycentre des marqueurs GPS, appelle ce hook, et affiche un bandeau conditionnel en haut de sa sidebar.

**Tech Stack:** React, TypeScript, Vitest + @testing-library/react, API Open-Meteo (gratuite, sans clé)

---

## File Map

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `src/hooks/useWeather.ts` | Créer | Fetch Open-Meteo, parsing, état loading/error |
| `src/hooks/__tests__/useWeather.test.ts` | Créer | Tests unitaires du hook |
| `src/components/planning/MapView.tsx` | Modifier | Barycentre + appel hook + bandeau UI |

---

## Task 1 : Hook `useWeather`

**Files:**
- Create: `src/hooks/useWeather.ts`

- [ ] **Écrire le hook**

```ts
// src/hooks/useWeather.ts
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
  const [result, setResult] = useState<WeatherResult>(EMPTY)

  useEffect(() => {
    if (lat === null || lng === null) {
      setResult(EMPTY)
      return
    }

    const dateStr = date.toISOString().slice(0, 10) // "YYYY-MM-DD"

    setResult(prev => ({ ...prev, loading: true, error: false }))

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&hourly=precipitation_probability,precipitation` +
      `&timezone=Europe%2FParis&forecast_days=3`

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
  }, [lat, lng, date.toISOString().slice(0, 10)])

  return result
}
```

- [ ] **Commit**

```bash
git add src/hooks/useWeather.ts
git commit -m "feat(météo): hook useWeather — fetch Open-Meteo précipitations"
```

---

## Task 2 : Tests du hook `useWeather`

**Files:**
- Create: `src/hooks/__tests__/useWeather.test.ts`

- [ ] **Écrire les tests**

```ts
// src/hooks/__tests__/useWeather.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWeather } from '@/hooks/useWeather'

const BASE_DATE = new Date('2026-05-24T00:00:00')

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

    expect(result.current.rainWindows).toHaveLength(2)
    expect(result.current.rainWindows[0]).toEqual({ hour: 14, proba: 70, mm: 3.2 })
    expect(result.current.rainWindows[1]).toEqual({ hour: 15, proba: 50, mm: 1.1 })
    expect(result.current.maxProba).toBe(70)
    expect(result.current.maxMm).toBeCloseTo(3.2)
  })

  it('aucun créneau si toutes probabilités ≤ 30%', async () => {
    const times = ['2026-05-24T10:00', '2026-05-24T12:00']
    const probas = [10, 30]
    const mms = [0, 0]
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(times, probas, mms))

    const { result } = renderHook(() => useWeather(48.2, -2.9, BASE_DATE))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rainWindows).toHaveLength(0)
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
```

- [ ] **Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run src/hooks/__tests__/useWeather.test.ts
```

Résultat attendu : `5 passed`

- [ ] **Commit**

```bash
git add src/hooks/__tests__/useWeather.test.ts
git commit -m "test(météo): tests unitaires useWeather"
```

---

## Task 3 : Intégration dans MapView

**Files:**
- Modify: `src/components/planning/MapView.tsx`

### 3a — Calcul du barycentre + appel du hook

- [ ] **Ajouter l'import et le calcul du barycentre**

En haut du fichier, ajouter l'import :
```ts
import { useWeather } from '@/hooks/useWeather'
```

Dans le composant, après la déclaration de `mappedEvts`, ajouter :
```ts
// Barycentre des points GPS pour la requête météo
const centroid = useMemo(() => {
  if (mappedEvts.length === 0) return null
  const sumLat = mappedEvts.reduce((acc, e) => acc + parseFloat(e.lat || '0'), 0)
  const sumLng = mappedEvts.reduce((acc, e) => acc + parseFloat(e.lng || '0'), 0)
  return { lat: sumLat / mappedEvts.length, lng: sumLng / mappedEvts.length }
}, [mappedEvts])

const weather = useWeather(centroid?.lat ?? null, centroid?.lng ?? null, selectedDate)
```

### 3b — Fonction helper pour le label du bandeau

- [ ] **Ajouter la fonction helper** (avant le `return` du composant) :

```ts
function formatRainLabel(weather: ReturnType<typeof useWeather>): string {
  if (weather.rainWindows.length === 0) return '☀️ Pas de précipitations prévues'

  const slots = weather.rainWindows
  // Regrouper les heures consécutives
  const groups: string[] = []
  let i = 0
  while (i < slots.length) {
    const start = slots[i].hour
    let end = start
    while (i + 1 < slots.length && slots[i + 1].hour === end + 1) {
      i++
      end = slots[i].hour
    }
    groups.push(start === end ? `${start}h` : `${start}h–${end + 1}h`)
    i++
  }

  const maxPct = weather.maxProba
  const maxMm = weather.maxMm.toFixed(1)
  return `🌧️ Pluie probable ${groups.join(', ')} (${maxPct}%) · max ${maxMm} mm`
}
```

### 3c — Bandeau météo dans la sidebar

- [ ] **Insérer le bandeau** dans le JSX de la sidebar, juste avant le `<div className="mb-4">` qui contient la liste des points (à la ligne 281 environ). Remplacer :

```tsx
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 scrollbar-none">
          <div className="mb-4">
```

Par :

```tsx
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
```

- [ ] **Vérifier que le build TypeScript passe**

```bash
npm run build
```

Résultat attendu : `✓ built in` sans erreur TypeScript.

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```

Résultat attendu : tous les tests passent (85 minimum).

- [ ] **Commit**

```bash
git add src/components/planning/MapView.tsx
git commit -m "feat(météo): bandeau précipitations Open-Meteo dans la sidebar Carte"
```

---

## Task 4 : Déploiement staging

- [ ] **Déployer sur staging**

```bash
bash deploy-dev.sh
```

- [ ] **Vérifier manuellement sur staging**

1. Ouvrir `https://labocea-pmc-v2-dev.tomkerf.workers.dev`
2. Aller sur Planning → vue Carte
3. Sélectionner un jour avec des prélèvements GPS
4. Vérifier que le bandeau météo apparaît en haut de la sidebar
5. Sélectionner un jour sans prélèvement → vérifier que le bandeau est absent
6. Couper le réseau (DevTools → Offline) → vérifier absence de crash

- [ ] **Commit doc session**

Mettre à jour DEV_LOG.md et ROADMAP.md via le skill `fin-session`.
