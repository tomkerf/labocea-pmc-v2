# Estimation du volume 24h sur point de rejet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Outil qui estime le volume 24h d'un point de rejet en temps de pluie à partir de l'historique (régression volume↔pluviométrie), avec import CSV et branchement sur la page Asservissement.

**Architecture:** Flux existant `Firestore (onSnapshot) → hook → store Zustand → composants`. Écritures via service wrappé `trackWrite()`. Moteur d'estimation et parseur CSV en libs pures testées. Page lazy `/outils/estimation-volume`. Aucune dépendance ajoutée (nuage de points en SVG fait main).

**Tech Stack:** React + TypeScript, Vite, Zustand, Firebase/Firestore, Vitest (projet `unit`, jsdom), Tailwind + tokens CSS (`COLORS`).

Spec de référence : `docs/superpowers/specs/2026-06-28-estimation-volume-rejet-design.md`.

---

## File Structure

**Créés :**
- `src/lib/estimationVolume.ts` — régression linéaire + garde-fous (pur)
- `src/lib/__tests__/estimationVolume.test.ts`
- `src/lib/parseBilansCsv.ts` — parseur CSV (pur)
- `src/lib/__tests__/parseBilansCsv.test.ts`
- `src/stores/pointsRejetStore.ts` — état Zustand
- `src/hooks/usePointsRejet.ts` — listener onSnapshot
- `src/services/pointsRejetService.ts` — écritures Firestore
- `src/pages/EstimationVolumePage.tsx` — page lazy
- `src/components/estimation/EstimationChart.tsx` — nuage de points SVG
- `src/components/estimation/PointRejetManager.tsx` — CRUD points + bilans
- `src/components/estimation/BilanImportModal.tsx` — import CSV avec aperçu

**Modifiés :**
- `src/lib/constants.ts` — + `POINTS_REJET` dans `COLLECTIONS`
- `src/types/index.ts` — + `BilanRejet`, `PointRejet`
- `src/App.tsx` — + import lazy + route `/outils/estimation-volume`
- `src/pages/AsservissementPage.tsx` — `v24h` initial lu depuis `?v24h=`
- `src/pages/PlusPage.tsx` — + entrée « Estimation volume » dans Outils

---

## Task 1: Types & constante de collection

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Ajouter la clé de collection**

Dans `src/lib/constants.ts`, dans l'objet `COLLECTIONS`, après `TUYAUX: 'tuyaux',` ajouter :

```ts
  POINTS_REJET: 'points-rejet',
```

- [ ] **Step 2: Ajouter les types**

Dans `src/types/index.ts`, ajouter (le `Timestamp` est déjà importé ailleurs dans ce fichier ; sinon `import type { Timestamp } from 'firebase/firestore'`) :

```ts
export interface BilanRejet {
  date: string      // 'YYYY-MM-DD'
  pluieMm: number   // pluviométrie 24h (mm)
  volumeM3: number  // volume total 24h mesuré (m³)
}

export interface PointRejet {
  id: string
  nom: string
  code?: string
  bilans: BilanRejet[]
  createdBy?: string
  updatedBy?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npm run build`
Expected: build OK (aucune erreur TypeScript).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/constants.ts
git commit -m "feat(rejet): types PointRejet/BilanRejet + collection points-rejet"
```

---

## Task 2: Moteur d'estimation (lib pure, TDD)

**Files:**
- Create: `src/lib/estimationVolume.ts`
- Test: `src/lib/__tests__/estimationVolume.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/__tests__/estimationVolume.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { estimateVolume, nearestBilans } from '../estimationVolume'
import type { BilanRejet } from '@/types'

const b = (pluieMm: number, volumeM3: number, date = '2026-01-01'): BilanRejet => ({ date, pluieMm, volumeM3 })

describe('estimateVolume', () => {
  it('retourne null avec moins de 3 bilans', () => {
    expect(estimateVolume([b(5, 100), b(10, 200)], 8)).toBeNull()
  })

  it('estime sur une relation linéaire parfaite (volume = 50 + 10*pluie)', () => {
    const bilans = [b(0, 50), b(10, 150), b(20, 250), b(30, 350)]
    const r = estimateVolume(bilans, 15)!
    expect(r).not.toBeNull()
    expect(r.coef).toBeCloseTo(10, 5)
    expect(r.base).toBeCloseTo(50, 5)
    expect(r.volumeEstime).toBeCloseTo(200, 5)
    expect(r.r2).toBeCloseTo(1, 5)
    expect(r.warnings).toHaveLength(0)
  })

  it('avertit en cas d\'extrapolation hors plage historique', () => {
    const bilans = [b(0, 50), b(10, 150), b(20, 250)]
    const r = estimateVolume(bilans, 40)!
    expect(r.warnings.map(w => w.type)).toContain('extrapolation')
  })

  it('avertit en cas de corrélation faible', () => {
    const bilans = [b(0, 100), b(10, 90), b(20, 110), b(5, 95)]
    const r = estimateVolume(bilans, 8)!
    expect(r.r2).toBeLessThan(0.5)
    expect(r.warnings.map(w => w.type)).toContain('correlation_faible')
  })

  it('ne renvoie jamais une borne basse négative', () => {
    const bilans = [b(0, 5), b(10, 8), b(20, 200)]
    const r = estimateVolume(bilans, 0)!
    expect(r.fourchetteBasse).toBeGreaterThanOrEqual(0)
  })

  it('ignore les bilans aux valeurs non finies', () => {
    const bilans = [b(0, 50), b(10, 150), b(20, 250), b(NaN, 999)]
    const r = estimateVolume(bilans, 5)!
    expect(r.nbPoints).toBe(3)
  })
})

describe('nearestBilans', () => {
  it('retourne les k bilans les plus proches en pluviométrie', () => {
    const bilans = [b(2, 60), b(9, 140), b(30, 400), b(11, 160)]
    const res = nearestBilans(bilans, 10, 2)
    expect(res.map(x => x.pluieMm)).toEqual([9, 11])
  })
})
```

- [ ] **Step 2: Lancer les tests (doivent échouer)**

Run: `npx vitest run src/lib/__tests__/estimationVolume.test.ts`
Expected: FAIL (module `../estimationVolume` introuvable).

- [ ] **Step 3: Implémenter la lib**

Créer `src/lib/estimationVolume.ts` :

```ts
import type { BilanRejet } from '@/types'

export interface EstimationWarning {
  type: 'peu_de_points' | 'correlation_faible' | 'extrapolation'
}

export interface EstimationResult {
  volumeEstime: number     // m³
  base: number             // ordonnée à l'origine ≈ volume "temps sec" 24h
  coef: number             // m³ par mm de pluie
  r2: number               // qualité d'ajustement [0..1]
  fourchetteBasse: number  // borne basse intervalle de prédiction
  fourchetteHaute: number  // borne haute
  nbPoints: number
  warnings: EstimationWarning[]
}

const R2_SEUIL = 0.5
const T_FACTEUR = 2 // ≈ 95 %, approximation assumée (pas de table de Student)

function valides(bilans: BilanRejet[]): BilanRejet[] {
  return bilans.filter(b => Number.isFinite(b.pluieMm) && Number.isFinite(b.volumeM3))
}

/** Régression linéaire moindres carrés : volume = base + coef × pluieMm. */
export function estimateVolume(bilans: BilanRejet[], pluieMm: number): EstimationResult | null {
  const pts = valides(bilans)
  const n = pts.length
  if (n < 3) return null

  const mx = pts.reduce((s, b) => s + b.pluieMm, 0) / n
  const my = pts.reduce((s, b) => s + b.volumeM3, 0) / n
  let sxx = 0, sxy = 0
  for (const b of pts) {
    sxx += (b.pluieMm - mx) ** 2
    sxy += (b.pluieMm - mx) * (b.volumeM3 - my)
  }
  const coef = sxx === 0 ? 0 : sxy / sxx
  const base = my - coef * mx
  const volumeEstime = base + coef * pluieMm

  let ssRes = 0, ssTot = 0
  for (const b of pts) {
    const pred = base + coef * b.pluieMm
    ssRes += (b.volumeM3 - pred) ** 2
    ssTot += (b.volumeM3 - my) ** 2
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const sResid = Math.sqrt(ssRes / Math.max(1, n - 2))
  const marge = T_FACTEUR * sResid

  const warnings: EstimationWarning[] = []
  if (r2 < R2_SEUIL) warnings.push({ type: 'correlation_faible' })
  const minP = Math.min(...pts.map(b => b.pluieMm))
  const maxP = Math.max(...pts.map(b => b.pluieMm))
  if (pluieMm < minP || pluieMm > maxP) warnings.push({ type: 'extrapolation' })

  return {
    volumeEstime,
    base,
    coef,
    r2,
    fourchetteBasse: Math.max(0, volumeEstime - marge),
    fourchetteHaute: volumeEstime + marge,
    nbPoints: n,
    warnings,
  }
}

/** Mode dégradé (< 3 bilans) : les k bilans les plus proches en pluviométrie. */
export function nearestBilans(bilans: BilanRejet[], pluieMm: number, k = 3): BilanRejet[] {
  return [...valides(bilans)]
    .sort((a, b) => Math.abs(a.pluieMm - pluieMm) - Math.abs(b.pluieMm - pluieMm))
    .slice(0, k)
}
```

- [ ] **Step 4: Lancer les tests (doivent passer)**

Run: `npx vitest run src/lib/__tests__/estimationVolume.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/estimationVolume.ts src/lib/__tests__/estimationVolume.test.ts
git commit -m "feat(rejet): moteur de régression volume↔pluviométrie"
```

---

## Task 3: Parseur CSV (lib pure, TDD)

**Files:**
- Create: `src/lib/parseBilansCsv.ts`
- Test: `src/lib/__tests__/parseBilansCsv.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/__tests__/parseBilansCsv.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { parseBilansCsv } from '../parseBilansCsv'

describe('parseBilansCsv', () => {
  it('parse un CSV valide avec en-tête', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,2026-01-05,12.4,1200
STEP Brest,2026-02-10,8,950`
    const { rows, errors } = parseBilansCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ point: 'STEP Quimper', bilan: { date: '2026-01-05', pluieMm: 12.4, volumeM3: 1200 } })
  })

  it('détecte le séparateur point-virgule et le décimal virgule', () => {
    const csv = `point;date;pluie_mm;volume_m3
STEP Quimper;2026-01-05;12,4;1200`
    const { rows, errors } = parseBilansCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows[0].bilan.pluieMm).toBe(12.4)
  })

  it('ignore les lignes vides', () => {
    const csv = `point,date,pluie_mm,volume_m3

STEP Quimper,2026-01-05,12,1200

`
    const { rows } = parseBilansCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('signale une date invalide avec le numéro de ligne', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,05/01/2026,12,1200`
    const { rows, errors } = parseBilansCsv(csv)
    expect(rows).toHaveLength(0)
    expect(errors[0].line).toBe(2)
    expect(errors[0].message).toMatch(/date/i)
  })

  it('signale un nombre non numérique', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,2026-01-05,douze,1200`
    const { errors } = parseBilansCsv(csv)
    expect(errors[0].message).toMatch(/pluie/i)
  })

  it('signale les colonnes manquantes', () => {
    const csv = `point,date,pluie_mm,volume_m3
STEP Quimper,2026-01-05`
    const { errors } = parseBilansCsv(csv)
    expect(errors[0].message).toMatch(/colonnes/i)
  })

  it('fonctionne sans ligne d\'en-tête', () => {
    const csv = `STEP Quimper,2026-01-05,12,1200`
    const { rows, errors } = parseBilansCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Lancer les tests (doivent échouer)**

Run: `npx vitest run src/lib/__tests__/parseBilansCsv.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter le parseur**

Créer `src/lib/parseBilansCsv.ts` :

```ts
import type { BilanRejet } from '@/types'

export interface ParsedBilanRow {
  point: string
  bilan: BilanRejet
}

export interface CsvParseError {
  line: number
  message: string
}

export interface CsvParseResult {
  rows: ParsedBilanRow[]
  errors: CsvParseError[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Format attendu : `point,date,pluie_mm,volume_m3`.
 * Séparateur `,` ou `;` (détecté). Décimale `.` ou `,`.
 * L'en-tête est détecté et ignoré s'il est présent.
 */
export function parseBilansCsv(text: string): CsvParseResult {
  const rows: ParsedBilanRow[] = []
  const errors: CsvParseError[] = []
  const rawLines = text.split(/\r?\n/)
  const firstNonEmpty = rawLines.find(l => l.trim() !== '') ?? ''
  const sep = firstNonEmpty.includes(';') ? ';' : ','

  let headerSkipped = false
  rawLines.forEach((raw, idx) => {
    const lineNo = idx + 1
    const line = raw.trim()
    if (line === '') return

    const cols = line.split(sep).map(c => c.trim())

    if (!headerSkipped && /point/i.test(cols[0]) && cols.some(c => /volume/i.test(c))) {
      headerSkipped = true
      return
    }
    headerSkipped = true

    if (cols.length < 4) {
      errors.push({ line: lineNo, message: 'colonnes manquantes (4 attendues)' })
      return
    }

    const [point, date, pluieStr, volStr] = cols
    if (!point) {
      errors.push({ line: lineNo, message: 'nom de point vide' })
      return
    }
    if (!DATE_RE.test(date)) {
      errors.push({ line: lineNo, message: 'date invalide (format YYYY-MM-DD attendu)' })
      return
    }
    const pluieMm = Number(pluieStr.replace(',', '.'))
    const volumeM3 = Number(volStr.replace(',', '.'))
    if (!Number.isFinite(pluieMm)) {
      errors.push({ line: lineNo, message: 'pluie_mm non numérique' })
      return
    }
    if (!Number.isFinite(volumeM3)) {
      errors.push({ line: lineNo, message: 'volume_m3 non numérique' })
      return
    }

    rows.push({ point, bilan: { date, pluieMm, volumeM3 } })
  })

  return { rows, errors }
}
```

- [ ] **Step 4: Lancer les tests (doivent passer)**

Run: `npx vitest run src/lib/__tests__/parseBilansCsv.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseBilansCsv.ts src/lib/__tests__/parseBilansCsv.test.ts
git commit -m "feat(rejet): parseur CSV des bilans historiques"
```

---

## Task 4: Store Zustand

**Files:**
- Create: `src/stores/pointsRejetStore.ts`

- [ ] **Step 1: Implémenter le store**

Créer `src/stores/pointsRejetStore.ts` (calque sur `equipementsStore.ts`) :

```ts
import { create } from 'zustand'
import type { PointRejet } from '@/types'

interface PointsRejetStore {
  pointsRejet: PointRejet[]
  loading: boolean
  error: string | null
  setPointsRejet: (pointsRejet: PointRejet[]) => void
  setError: (error: string | null) => void
}

export const usePointsRejetStore = create<PointsRejetStore>((set) => ({
  pointsRejet: [],
  loading: true,
  error: null,
  setPointsRejet: (pointsRejet) => set({ pointsRejet, loading: false }),
  setError: (error) => set({ error, loading: false }),
}))

export const selectPointsRejet = (s: PointsRejetStore) => s.pointsRejet
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/stores/pointsRejetStore.ts
git commit -m "feat(rejet): store Zustand points de rejet"
```

---

## Task 5: Hook listener onSnapshot

**Files:**
- Create: `src/hooks/usePointsRejet.ts`

- [ ] **Step 1: Implémenter le hook**

Créer `src/hooks/usePointsRejet.ts` (calque sur `useEquipements.ts`) :

```ts
import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { COLLECTIONS } from '@/lib/constants'
import type { PointRejet } from '@/types'

export function usePointsRejetListener() {
  const setPointsRejet = usePointsRejetStore((s) => s.setPointsRejet)
  const setError = usePointsRejetStore((s) => s.setError)

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.POINTS_REJET), orderBy('nom'))
    const unsub = onSnapshot(
      q,
      (snap) => setPointsRejet(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PointRejet))),
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [setPointsRejet, setError])
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePointsRejet.ts
git commit -m "feat(rejet): hook listener points de rejet"
```

---

## Task 6: Service d'écriture Firestore

**Files:**
- Create: `src/services/pointsRejetService.ts`

- [ ] **Step 1: Implémenter le service**

Créer `src/services/pointsRejetService.ts` (calque sur `clientService.ts`, chaque écriture wrappée `trackWrite`) :

```ts
import {
  collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import { COLLECTIONS } from '@/lib/constants'
import type { BilanRejet, PointRejet } from '@/types'

const COLLECTION = COLLECTIONS.POINTS_REJET

export async function createPointRejet(nom: string, code: string, uid: string): Promise<string> {
  const ref = await trackWrite(addDoc(collection(db, COLLECTION), {
    nom,
    code,
    bilans: [],
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return ref.id
}

export async function updatePointRejet(
  id: string,
  data: Partial<Pick<PointRejet, 'nom' | 'code' | 'bilans'>>,
  uid: string,
): Promise<void> {
  await trackWrite(updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  }))
}

export async function deletePointRejet(id: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, COLLECTION, id)))
}

export interface ImportResult {
  created: number   // nouveaux points créés
  updated: number   // points existants enrichis
  added: number     // bilans réellement ajoutés (doublons par date ignorés)
}

/**
 * Upsert par nom de point. Les bilans en doublon (même point + même date) sont ignorés.
 */
export async function importBilans(
  parsedRows: { point: string; bilan: BilanRejet }[],
  existing: PointRejet[],
  uid: string,
): Promise<ImportResult> {
  const byName = new Map<string, BilanRejet[]>()
  for (const r of parsedRows) {
    const arr = byName.get(r.point) ?? []
    arr.push(r.bilan)
    byName.set(r.point, arr)
  }

  const batch = writeBatch(db)
  let created = 0, updated = 0, added = 0

  for (const [nom, newBilans] of byName) {
    const match = existing.find((p) => p.nom.trim().toLowerCase() === nom.trim().toLowerCase())
    if (match) {
      const dates = new Set(match.bilans.map((b) => b.date))
      const toAdd = newBilans.filter((b) => !dates.has(b.date))
      if (toAdd.length === 0) continue
      added += toAdd.length
      updated++
      batch.update(doc(db, COLLECTION, match.id), {
        bilans: [...match.bilans, ...toAdd],
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      })
    } else {
      const seen = new Set<string>()
      const deduped = newBilans.filter((b) => (seen.has(b.date) ? false : (seen.add(b.date), true)))
      added += deduped.length
      created++
      batch.set(doc(collection(db, COLLECTION)), {
        nom,
        code: '',
        bilans: deduped,
        createdBy: uid,
        updatedBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  await trackWrite(batch.commit())
  return { created, updated, added }
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/services/pointsRejetService.ts
git commit -m "feat(rejet): service écriture + import CSV batch"
```

---

## Task 7: Nuage de points SVG

**Files:**
- Create: `src/components/estimation/EstimationChart.tsx`

- [ ] **Step 1: Implémenter le composant**

Créer `src/components/estimation/EstimationChart.tsx`. SVG fait main, aucune dépendance. Affiche les bilans, la droite de régression (à partir de `base`/`coef`) et le point estimé surligné.

```tsx
import { COLORS } from '@/lib/constants'
import type { BilanRejet } from '@/types'

interface Props {
  bilans: BilanRejet[]
  base: number
  coef: number
  pluieMm: number
  volumeEstime: number
}

const W = 320
const H = 200
const PAD = 36

export function EstimationChart({ bilans, base, coef, pluieMm, volumeEstime }: Props) {
  const pts = bilans.filter(b => Number.isFinite(b.pluieMm) && Number.isFinite(b.volumeM3))
  const xs = [...pts.map(b => b.pluieMm), pluieMm]
  const ys = [...pts.map(b => b.volumeM3), volumeEstime]
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(0, ...ys), yMax = Math.max(...ys)

  const sx = (x: number) =>
    PAD + (xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin)) * (W - 2 * PAD)
  const sy = (y: number) =>
    H - PAD - (yMax === yMin ? 0.5 : (y - yMin) / (yMax - yMin)) * (H - 2 * PAD)

  const lineX1 = xMin, lineX2 = xMax
  const lineY1 = base + coef * lineX1
  const lineY2 = base + coef * lineX2

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Nuage de points pluviométrie / volume">
      {/* axes */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-border)" strokeWidth={1} />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--color-border)" strokeWidth={1} />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-text-tertiary)">pluie (mm)</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize={10} fill="var(--color-text-tertiary)" transform={`rotate(-90 10 ${H / 2})`}>volume (m³)</text>

      {/* droite de régression */}
      <line x1={sx(lineX1)} y1={sy(lineY1)} x2={sx(lineX2)} y2={sy(lineY2)}
        stroke={COLORS.ACCENT} strokeWidth={1.5} strokeDasharray="4 3" />

      {/* bilans historiques */}
      {pts.map((b, i) => (
        <circle key={i} cx={sx(b.pluieMm)} cy={sy(b.volumeM3)} r={3.5}
          fill="var(--color-text-secondary)" />
      ))}

      {/* point estimé */}
      <circle cx={sx(pluieMm)} cy={sy(volumeEstime)} r={5.5} fill={COLORS.ACCENT}
        stroke="white" strokeWidth={1.5} />
    </svg>
  )
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/estimation/EstimationChart.tsx
git commit -m "feat(rejet): nuage de points SVG"
```

---

## Task 8: Modale d'import CSV

**Files:**
- Create: `src/components/estimation/BilanImportModal.tsx`

- [ ] **Step 1: Implémenter la modale**

Créer `src/components/estimation/BilanImportModal.tsx`. Lecture fichier, parsing via `parseBilansCsv`, aperçu obligatoire avec comptes et erreurs, puis import via `importBilans`.

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { COLORS, Z_INDEX } from '@/lib/constants'
import { parseBilansCsv, type ParsedBilanRow, type CsvParseError } from '@/lib/parseBilansCsv'
import { importBilans } from '@/services/pointsRejetService'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { useAuthStore, selectUid } from '@/stores/authStore'

interface Props {
  onClose: () => void
}

export function BilanImportModal({ onClose }: Props) {
  const uid = useAuthStore(selectUid)
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)
  const [rows, setRows] = useState<ParsedBilanRow[]>([])
  const [errors, setErrors] = useState<CsvParseError[]>([])
  const [parsed, setParsed] = useState(false)
  const [importing, setImporting] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      const res = parseBilansCsv(text)
      setRows(res.rows)
      setErrors(res.errors)
      setParsed(true)
    })
  }

  async function handleImport() {
    if (!uid || rows.length === 0) return
    setImporting(true)
    try {
      const r = await importBilans(rows, pointsRejet, uid)
      alert(`Import terminé : ${r.created} point(s) créé(s), ${r.updated} enrichi(s), ${r.added} bilan(s) ajouté(s).`)
      onClose()
    } catch (err) {
      alert(`Échec de l'import : ${(err as Error).message}`)
    } finally {
      setImporting(false)
    }
  }

  const nbPoints = new Set(rows.map((r) => r.point)).size

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', zIndex: Z_INDEX.MODAL }}>
      <div className="w-full max-w-lg rounded-2xl p-5 max-h-[85vh] overflow-auto"
        style={{ background: COLORS.BG_SECONDARY }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Importer des bilans (CSV)</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg" style={{ background: COLORS.BG_TERTIARY }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-[12px] mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          Format : <code>point,date,pluie_mm,volume_m3</code> — date au format AAAA-MM-JJ.
        </p>

        <input type="file" accept=".csv,text/csv" onChange={handleFile} className="mb-4 text-sm" />

        {parsed && (
          <div className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
            <p className="mb-2">
              {rows.length} bilan(s) valides sur {nbPoints} point(s).
              {errors.length > 0 && <span style={{ color: COLORS.DANGER }}> {errors.length} ligne(s) ignorée(s).</span>}
            </p>

            {errors.length > 0 && (
              <ul className="mb-3 text-[12px]" style={{ color: COLORS.DANGER }}>
                {errors.slice(0, 10).map((e, i) => <li key={i}>Ligne {e.line} : {e.message}</li>)}
              </ul>
            )}

            <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--color-border-subtle)' }}>
              {rows.slice(0, 8).map((r, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5 text-[12px]"
                  style={{ borderBottom: i < Math.min(rows.length, 8) - 1 ? '1px solid var(--color-border-subtle)' : undefined }}>
                  <span>{r.point}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{r.bilan.date} · {r.bilan.pluieMm} mm · {r.bilan.volumeM3} m³</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={handleImport} disabled={importing || rows.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: importing || rows.length === 0 ? 0.5 : 1 }}>
              {importing ? 'Import…' : `Importer ${rows.length} bilan(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

> Note : `alert()` est utilisé pour le retour d'import par simplicité. Si le design system fournit un toast (`useToastStore`), le préférer. Ne pas bloquer le plan là-dessus.

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/estimation/BilanImportModal.tsx
git commit -m "feat(rejet): modale import CSV avec aperçu"
```

---

## Task 9: Gestion des points & bilans (CRUD)

**Files:**
- Create: `src/components/estimation/PointRejetManager.tsx`

- [ ] **Step 1: Implémenter le manager**

Créer `src/components/estimation/PointRejetManager.tsx`. Création de point, ajout de bilan à un point, suppression avec double-confirmation (pattern `useReducer`).

```tsx
import { useReducer, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { createPointRejet, updatePointRejet, deletePointRejet } from '@/services/pointsRejetService'
import type { BilanRejet } from '@/types'

// double-confirmation suppression
type ConfirmState = { id: string | null }
type ConfirmAction = { type: 'arm'; id: string } | { type: 'reset' }
function confirmReducer(_s: ConfirmState, a: ConfirmAction): ConfirmState {
  return a.type === 'arm' ? { id: a.id } : { id: null }
}

export function PointRejetManager() {
  const uid = useAuthStore(selectUid)
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)
  const [confirm, dispatch] = useReducer(confirmReducer, { id: null })
  const [nom, setNom] = useState('')
  const [selId, setSelId] = useState<string>('')
  const [bilan, setBilan] = useState<BilanRejet>({ date: '', pluieMm: 0, volumeM3: 0 })

  async function addPoint() {
    if (!uid || !nom.trim()) return
    await createPointRejet(nom.trim(), '', uid)
    setNom('')
  }

  async function addBilan() {
    if (!uid || !selId || !bilan.date) return
    const point = pointsRejet.find((p) => p.id === selId)
    if (!point) return
    await updatePointRejet(selId, { bilans: [...point.bilans, bilan] }, uid)
    setBilan({ date: '', pluieMm: 0, volumeM3: 0 })
  }

  async function remove(id: string) {
    if (confirm.id !== id) { dispatch({ type: 'arm', id }); return }
    await deletePointRejet(id)
    dispatch({ type: 'reset' })
  }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
      <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Gestion des points de rejet</h2>

      {/* nouveau point */}
      <div className="flex gap-2">
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du point"
          className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
        <button type="button" onClick={addPoint} className="px-3 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
          <Plus size={18} />
        </button>
      </div>

      {/* liste points */}
      <div className="flex flex-col gap-1">
        {pointsRejet.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
            style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
            <span>{p.nom} <span style={{ color: 'var(--color-text-tertiary)' }}>· {p.bilans.length} bilan(s)</span></span>
            <button type="button" onClick={() => remove(p.id)}
              className="px-2 py-1 rounded text-[12px] font-semibold"
              style={{ background: confirm.id === p.id ? COLORS.DANGER : 'transparent', color: confirm.id === p.id ? 'white' : COLORS.DANGER }}>
              {confirm.id === p.id ? 'Confirmer' : <Trash2 size={16} />}
            </button>
          </div>
        ))}
      </div>

      {/* ajout bilan */}
      <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <select value={selId} onChange={(e) => setSelId(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
          <option value="">Ajouter un bilan à…</option>
          {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={bilan.date} onChange={(e) => setBilan({ ...bilan, date: e.target.value })}
            className="flex-1 px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          <input type="number" value={bilan.pluieMm} onChange={(e) => setBilan({ ...bilan, pluieMm: Number(e.target.value) })}
            placeholder="mm" className="w-20 px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          <input type="number" value={bilan.volumeM3} onChange={(e) => setBilan({ ...bilan, volumeM3: Number(e.target.value) })}
            placeholder="m³" className="w-24 px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          <button type="button" onClick={addBilan} className="px-3 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/estimation/PointRejetManager.tsx
git commit -m "feat(rejet): gestion points et bilans (CRUD)"
```

---

## Task 10: Page d'estimation

**Files:**
- Create: `src/pages/EstimationVolumePage.tsx`

- [ ] **Step 1: Implémenter la page**

Créer `src/pages/EstimationVolumePage.tsx`. Branche le listener, le sélecteur, la saisie de pluie (Stepper réutilisé), le résultat, le chart, le mode dégradé, le bouton vers l'asservissement, le manager et l'import.

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Upload, ArrowRight } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { Stepper } from '@/components/asservissement/AsservissementStepper'
import { usePointsRejetListener } from '@/hooks/usePointsRejet'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { estimateVolume, nearestBilans } from '@/lib/estimationVolume'
import { EstimationChart } from '@/components/estimation/EstimationChart'
import { PointRejetManager } from '@/components/estimation/PointRejetManager'
import { BilanImportModal } from '@/components/estimation/BilanImportModal'

const WARN_LABEL: Record<string, string> = {
  correlation_faible: 'Corrélation faible entre pluie et volume — estimation peu fiable.',
  extrapolation: 'Pluviométrie hors de la plage des bilans connus — extrapolation.',
  peu_de_points: 'Pas assez de bilans pour une estimation fiable.',
}

export default function EstimationVolumePage() {
  usePointsRejetListener()
  const navigate = useNavigate()
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)

  const [selId, setSelId] = useState('')
  const [pluie, setPluie] = useState('10')
  const [showImport, setShowImport] = useState(false)

  const point = pointsRejet.find((p) => p.id === selId)
  const pluieMm = Number(pluie) || 0
  const res = point ? estimateVolume(point.bilans, pluieMm) : null
  const degraded = point && !res ? nearestBilans(point.bilans, pluieMm) : []

  function useInAsservissement() {
    if (!res) return
    navigate(`/outils/asservissement?v24h=${Math.round(res.volumeEstime)}`)
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: COLORS.BG_PRIMARY }}>
      {/* header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(245,245,247,0.92)', backdropFilter: 'var(--glass-panel)', WebkitBackdropFilter: 'var(--glass-panel)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate" style={{ color: COLORS.TEXT_PRIMARY }}>Estimation volume 24h</h1>
          <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Temps de pluie · à partir de l'historique</p>
        </div>
        <button type="button" onClick={() => setShowImport(true)} className="p-1.5 rounded-lg shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }} aria-label="Importer CSV">
          <Upload size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        {/* sélection point */}
        <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          <select value={selId} onChange={(e) => setSelId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
            <option value="">Choisir un point de rejet…</option>
            {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.bilans.length})</option>)}
          </select>
        </div>

        {/* saisie pluie */}
        {point && (
          <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <Stepper label="Pluie attendue" hint="Cumul sur 24h" value={pluie} onChange={setPluie} unit="mm" step={1} min={0} max={500} />
          </div>
        )}

        {/* résultat */}
        {res && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>Volume 24h estimé</p>
              <p className="text-2xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>~ {Math.round(res.volumeEstime).toLocaleString('fr-FR')} m³</p>
              <p className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                entre {Math.round(res.fourchetteBasse).toLocaleString('fr-FR')} et {Math.round(res.fourchetteHaute).toLocaleString('fr-FR')} m³
                <span style={{ color: 'var(--color-text-tertiary)' }}> · R² {res.r2.toFixed(2)}</span>
              </p>
            </div>

            {res.warnings.map((w) => (
              <p key={w.type} className="text-[12px] px-3 py-2 rounded-lg"
                style={{ background: 'var(--color-warning-light, rgba(255,149,0,0.12))', color: COLORS.WARNING }}>
                {WARN_LABEL[w.type]}
              </p>
            ))}

            <EstimationChart bilans={point!.bilans} base={res.base} coef={res.coef} pluieMm={pluieMm} volumeEstime={res.volumeEstime} />

            <button type="button" onClick={useInAsservissement}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: COLORS.ACCENT, color: 'white' }}>
              Utiliser dans l'asservissement <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* mode dégradé < 3 bilans */}
        {point && !res && (
          <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <p className="text-[13px] mb-2" style={{ color: COLORS.WARNING }}>{WARN_LABEL.peu_de_points} Bilans les plus proches :</p>
            {degraded.length === 0 && <p className="text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>Aucun bilan enregistré.</p>}
            {degraded.map((bz, i) => (
              <div key={i} className="flex justify-between text-[13px] py-1" style={{ color: COLORS.TEXT_PRIMARY }}>
                <span>{bz.date}</span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>{bz.pluieMm} mm → {bz.volumeM3} m³</span>
              </div>
            ))}
          </div>
        )}

        <PointRejetManager />
      </div>

      {showImport && <BilanImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/pages/EstimationVolumePage.tsx
git commit -m "feat(rejet): page estimation volume"
```

---

## Task 11: Route + entrée dans Outils

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/PlusPage.tsx`

- [ ] **Step 1: Déclarer la page lazy et la route**

Dans `src/App.tsx`, après la ligne `const AsservissementPage = lazy(...)` (≈ ligne 34) ajouter :

```tsx
const EstimationVolumePage = lazy(() => import('@/pages/EstimationVolumePage'))
```

Puis, juste après le bloc `<Route path="/outils/asservissement" …>` (≈ ligne 137-139), ajouter une route protégée du même format que les autres routes `/outils/*` :

```tsx
        <Route path="/outils/estimation-volume" element={
          <Suspense fallback={<PageSpinner />}><EstimationVolumePage /></Suspense>
        } />
```

> Reproduire exactement le wrapper utilisé par `/outils/asservissement` (même `RequireAuth`/`Suspense` que les routes voisines).

- [ ] **Step 2: Ajouter l'entrée dans Outils (PlusPage)**

Dans `src/pages/PlusPage.tsx`, dans la liste où figure `{ to: '/outils/asservissement', icon: FlaskConical, label: 'Asservissement' }` (≈ ligne 61), ajouter juste après :

```tsx
          { to: '/outils/estimation-volume', icon: CloudRain, label: 'Estimation volume'    },
```

Et ajouter `CloudRain` à l'import `lucide-react` en tête de `PlusPage.tsx` (à côté de `FlaskConical`, `Pipette`).

- [ ] **Step 3: Vérifier build + lint**

Run: `npm run build && npm run lint`
Expected: build OK, pas d'erreur de lint.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/PlusPage.tsx
git commit -m "feat(rejet): route /outils/estimation-volume + entrée Outils"
```

---

## Task 12: Pré-remplissage du volume dans l'Asservissement

**Files:**
- Modify: `src/pages/AsservissementPage.tsx`

- [ ] **Step 1: Lire `v24h` depuis le query param**

Dans `src/pages/AsservissementPage.tsx` :

1. Ajouter `useSearchParams` à l'import `react-router-dom` (qui importe déjà `useNavigate`) :

```ts
import { useNavigate, useSearchParams } from 'react-router-dom'
```

2. Dans le composant, après `const navigate = useNavigate()`, lire le param et l'utiliser comme valeur initiale du reducer via `useReducer(calcReducer, initialCalcState, init)` :

```ts
  const [searchParams] = useSearchParams()
  const v24hParam = searchParams.get('v24h')

  const [calc, dispatch] = useReducer(
    calcReducer,
    initialCalcState,
    (s): CalcState => (v24hParam && Number.isFinite(Number(v24hParam)) ? { ...s, v24h: v24hParam } : s),
  )
```

(Remplacer la ligne existante `const [calc, dispatch] = useReducer(calcReducer, initialCalcState)`.)

Le reste de la page est inchangé : si aucun `?v24h=` n'est présent, le comportement par défaut (`'100'`) est conservé.

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Vérification manuelle**

Run: `npm run dev`
- Ouvrir `/outils/asservissement?v24h=1234` → le champ « Rejet 24h » affiche 1234.
- Ouvrir `/outils/asservissement` (sans param) → le champ affiche 100.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AsservissementPage.tsx
git commit -m "feat(asservissement): pré-remplissage Rejet 24h via query param v24h"
```

---

## Task 13: Vérification d'ensemble & règles Firestore

**Files:**
- Modify: règles Firestore (`firestore.rules` ou équivalent du projet)

- [ ] **Step 1: Lancer toute la suite de tests + build**

Run: `npm run test && npm run build`
Expected: tous les tests passent (dont les nouveaux `estimationVolume` et `parseBilansCsv`), build OK.

- [ ] **Step 2: Ajouter la règle Firestore pour `points-rejet`**

Localiser le fichier de règles (`firestore.rules`). Ajouter un bloc pour la collection `points-rejet`, calqué sur une collection existante comparable (lecture authentifiée, écriture selon le contrôle de rôle en place dans le projet). Ne pas inventer un modèle de rôle : reproduire celui d'une collection voisine (ex. `tuyaux` ou `equipements`).

> ⚠️ Conformément à la spec §8 : l'outil ne doit pas être déployé en **production** avant le chantier « rôles Firestore » (blocage prod connu). Le déploiement **staging** (`bash deploy-dev.sh`) reste possible pour validation.

- [ ] **Step 3: Vérification manuelle bout-en-bout (staging ou dev)**

Parcours « golden path » :
1. Importer un CSV (3+ bilans sur un point) → aperçu → import → le point apparaît avec ses bilans.
2. Sélectionner le point, saisir une pluie dans la plage → volume + fourchette + nuage de points affichés.
3. Saisir une pluie hors plage → bandeau extrapolation.
4. Créer un point à la main, ajouter 1 bilan → mode dégradé (« bilans les plus proches »).
5. Cliquer « Utiliser dans l'asservissement » → la page Asservissement s'ouvre avec Rejet 24h pré-rempli.

- [ ] **Step 4: Déploiement staging**

Run: `bash deploy-dev.sh`
Expected: build + déploiement staging réussis.

- [ ] **Step 5: Commit (si modif règles)**

```bash
git add firestore.rules
git commit -m "feat(rejet): règles Firestore collection points-rejet"
```

---

## Self-Review (auteur du plan)

**Couverture spec :**
- §3.1 modèle de données → Task 1 ✅
- §3.2 couches (service/hook/store/lib/page/composants) → Tasks 4,5,6,2,3,10,7,8,9 ✅
- §4 moteur + garde-fous + tests → Task 2 ✅
- §5.1 vue estimation → Task 10 ✅
- §5.2 gestion données → Task 9 ✅
- §5.3 mode dégradé → Task 2 (`nearestBilans`) + Task 10 ✅
- §5.4/§5.5 import CSV + tests → Tasks 3, 8 ✅
- §6 branchement asservissement → Task 12 ✅
- §7 impacts existant → Tasks 1, 11, 12 ✅
- §8 règles/sécurité → Task 13 ✅
- §9 critères d'acceptation → Task 13 step 3 ✅

**Cohérence des types :** `estimateVolume`/`nearestBilans` (Task 2), `parseBilansCsv`/`ParsedBilanRow` (Task 3), `importBilans(parsedRows, existing, uid)` (Task 6) consommés tels quels par `BilanImportModal` (Task 8) et la page (Task 10). `EstimationResult.{base,coef,volumeEstime,fourchette*}` utilisés par chart + page. Cohérent.

**Pas de placeholder** : chaque étape de code contient le code complet. Les seuls points laissés ouverts sont des choix d'intégration locaux et explicitement signalés (toast vs `alert`, format exact des règles Firestore à calquer sur l'existant), pas des trous d'implémentation.
