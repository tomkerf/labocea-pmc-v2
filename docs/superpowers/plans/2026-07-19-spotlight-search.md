# Spotlight (Cmd+K) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Cmd/Ctrl+K search (Spotlight) that jumps directly to a client or a point de prélèvement, without navigating through menus.

**Architecture:** A pure, testable hook (`useSpotlightResults`) computes matches from `Client[]` already in memory (`useMissionsStore`) — no new Firestore reads. A minimal Zustand store (`spotlightStore`) tracks only open/closed state. A generic `useGlobalHotkey` hook wires Cmd/Ctrl+K in `AppLayout`. The UI (`SpotlightModal`) reuses the existing `BaseModal` component and renders results grouped by category with keyboard navigation.

**Tech Stack:** React, TypeScript, Zustand, Vitest + Testing Library (`renderHook`), existing `BaseModal`/`COLORS` design system.

**Deviation from spec (implementation detail, not scope change):** The spec describes `useSpotlightResults` as reading `useMissionsStore` directly. This plan instead makes it a pure hook that takes `clients: Client[]` as a parameter, matching the existing `useDashboardStats` pattern in this codebase (`src/hooks/useDashboardStats.ts:78-81`). The `SpotlightModal` component reads the store and passes `clients` down. This makes the hook trivially testable without mocking Zustand.

---

### Task 1: Text normalization utility

**Files:**
- Create: `src/lib/textUtils.ts`
- Test: `src/lib/__tests__/textUtils.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/textUtils.test.ts
import { describe, expect, it } from 'vitest'
import { normalize } from '@/lib/textUtils'

describe('normalize', () => {
  it('met en minuscules', () => {
    expect(normalize('LE FAOU')).toBe('le faou')
  })

  it('retire les accents', () => {
    expect(normalize('Le Faoû')).toBe('le faou')
    expect(normalize('ÉCOLE')).toBe('ecole')
  })

  it('laisse une chaîne déjà normalisée inchangée', () => {
    expect(normalize('cd29')).toBe('cd29')
  })

  it('gère une chaîne vide', () => {
    expect(normalize('')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/textUtils.test.ts`
Expected: FAIL — `Cannot find module '@/lib/textUtils'` (le fichier n'existe pas encore)

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/textUtils.ts

/** Normalise une chaîne pour un matching insensible à la casse et aux accents. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/textUtils.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/textUtils.ts src/lib/__tests__/textUtils.test.ts
git commit -m "feat(spotlight): ajouter l'utilitaire de normalisation de texte"
```

---

### Task 2: Spotlight store (état ouvert/fermé)

**Files:**
- Create: `src/stores/spotlightStore.ts`

Pas de test dédié pour ce store : c'est un simple booléen + deux setters, sans logique (même convention que `missionsStore.ts` et `preleveursStore.ts`, non testés unitairement dans ce projet — seule la logique dérivée dans les hooks l'est).

- [ ] **Step 1: Write the store**

```typescript
// src/stores/spotlightStore.ts
import { create } from 'zustand'

interface SpotlightState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useSpotlightStore = create<SpotlightState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/stores/spotlightStore.ts
git commit -m "feat(spotlight): ajouter le store d'état ouvert/fermé"
```

---

### Task 3: Hook `useGlobalHotkey`

**Files:**
- Create: `src/hooks/useGlobalHotkey.ts`
- Test: `src/hooks/__tests__/useGlobalHotkey.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useGlobalHotkey.test.ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGlobalHotkey } from '@/hooks/useGlobalHotkey'

describe('useGlobalHotkey', () => {
  it('déclenche le callback sur Cmd+K (Mac)', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('déclenche le callback sur Ctrl+K (Windows/Linux)', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('ignore la touche seule sans modificateur', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))

    expect(callback).not.toHaveBeenCalled()
  })

  it('ignore une autre touche même avec un modificateur', () => {
    const callback = vi.fn()
    renderHook(() => useGlobalHotkey('k', callback))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))

    expect(callback).not.toHaveBeenCalled()
  })

  it('retire le listener au démontage', () => {
    const callback = vi.fn()
    const { unmount } = renderHook(() => useGlobalHotkey('k', callback))
    unmount()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

    expect(callback).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useGlobalHotkey.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useGlobalHotkey'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hooks/useGlobalHotkey.ts
import { useEffect, useRef } from 'react'

/** Écoute Cmd+<key> (Mac) ou Ctrl+<key> (Windows/Linux) au niveau window. */
export function useGlobalHotkey(key: string, callback: () => void) {
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        callbackRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useGlobalHotkey.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGlobalHotkey.ts src/hooks/__tests__/useGlobalHotkey.test.ts
git commit -m "feat(spotlight): ajouter le hook de raccourci clavier global"
```

---

### Task 4: Hook `useSpotlightResults`

**Files:**
- Create: `src/hooks/useSpotlightResults.ts`
- Test: `src/hooks/__tests__/useSpotlightResults.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useSpotlightResults.test.ts
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { useSpotlightResults } from '@/hooks/useSpotlightResults'
import type { Client, Plan } from '@/types'

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    nom: 'Aven',
    siteNom: 'Aven',
    frequence: 'Mensuel',
    meteo: 'pluie',
    nature: 'Rivière',
    methode: 'Ponctuel',
    lat: '',
    lng: '',
    gpsApprox: false,
    customMonths: [],
    bimensuelMonths: [],
    defaultDay: 4,
    customDays: {},
    samplings: [],
    ...overrides,
  }
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    annee: '2026',
    nom: 'DREAL CORPEP',
    numClient: '',
    nouvelleDemande: 'Avenant',
    interlocuteur: '',
    telephone: '',
    mobile: '',
    email: '',
    fonction: '',
    mission: '',
    segment: 'SRA',
    numDevis: '',
    numConvention: '',
    preleveur: 'THK',
    dureeContrat: '',
    periodeIntervention: '',
    sites: [],
    montantTotal: 0,
    partPMC: 0,
    partSousTraitance: 0,
    plans: [],
    createdBy: '',
    updatedBy: '',
    updatedAt: Timestamp.now(),
    ...overrides,
  }
}

describe('useSpotlightResults', () => {
  it('retourne des listes vides pour une recherche vide', () => {
    const clients = [makeClient()]
    const { result } = renderHook(() => useSpotlightResults(clients, ''))
    expect(result.current.clients).toEqual([])
    expect(result.current.plans).toEqual([])
  })

  it('trouve un client par nom, insensible à la casse et aux accents', () => {
    const clients = [makeClient({ id: 'c1', nom: 'Mairie du Faoû' })]
    const { result } = renderHook(() => useSpotlightResults(clients, 'faou'))
    expect(result.current.clients.map((c) => c.id)).toEqual(['c1'])
  })

  it('trouve un client par segment ou par préleveur', () => {
    const clients = [
      makeClient({ id: 'c1', nom: 'Client A', segment: 'RSDE' }),
      makeClient({ id: 'c2', nom: 'Client B', preleveur: 'ROD' }),
    ]
    const bySegment = renderHook(() => useSpotlightResults(clients, 'rsde'))
    expect(bySegment.result.current.clients.map((c) => c.id)).toEqual(['c1'])

    const byPreleveur = renderHook(() => useSpotlightResults(clients, 'rod'))
    expect(byPreleveur.result.current.clients.map((c) => c.id)).toEqual(['c2'])
  })

  it('trouve un point de prélèvement par nom ou par site, avec référence au client parent', () => {
    const plan = makePlan({ id: 'p1', nom: 'CD29 — Le Faou', siteNom: 'Le Faou' })
    const clients = [makeClient({ id: 'c1', nom: 'Mairie du Faou', plans: [plan] })]

    const byNom = renderHook(() => useSpotlightResults(clients, 'cd29'))
    expect(byNom.result.current.plans).toEqual([{ plan, client: clients[0] }])

    const bySite = renderHook(() => useSpotlightResults(clients, 'faou'))
    expect(bySite.result.current.plans).toEqual([{ plan, client: clients[0] }])
  })

  it('limite à 6 résultats par catégorie', () => {
    const clients = Array.from({ length: 10 }, (_, i) =>
      makeClient({ id: `c${i}`, nom: `Client Test ${i}` })
    )
    const { result } = renderHook(() => useSpotlightResults(clients, 'client test'))
    expect(result.current.clients).toHaveLength(6)
  })

  it("n'inclut pas les clients dont aucun champ ne correspond", () => {
    const clients = [makeClient({ id: 'c1', nom: 'Client A' })]
    const { result } = renderHook(() => useSpotlightResults(clients, 'zzz'))
    expect(result.current.clients).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useSpotlightResults.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useSpotlightResults'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hooks/useSpotlightResults.ts
import { useMemo } from 'react'
import type { Client, Plan } from '@/types'
import { normalize } from '@/lib/textUtils'

const MAX_RESULTS_PER_CATEGORY = 6

export interface SpotlightPlanResult {
  plan: Plan
  client: Client
}

export interface SpotlightResults {
  clients: Client[]
  plans: SpotlightPlanResult[]
}

export function useSpotlightResults(clients: Client[], query: string): SpotlightResults {
  return useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return { clients: [], plans: [] }

    const matchedClients: Client[] = []
    const matchedPlans: SpotlightPlanResult[] = []

    for (const client of clients) {
      const clientHaystack = [client.nom, client.numClient, client.segment, client.preleveur]
        .filter(Boolean)
        .map(normalize)
      if (clientHaystack.some((field) => field.includes(q))) {
        matchedClients.push(client)
      }

      for (const plan of client.plans) {
        const planHaystack = [plan.nom, plan.siteNom].filter(Boolean).map(normalize)
        if (planHaystack.some((field) => field.includes(q))) {
          matchedPlans.push({ plan, client })
        }
      }
    }

    return {
      clients: matchedClients.slice(0, MAX_RESULTS_PER_CATEGORY),
      plans: matchedPlans.slice(0, MAX_RESULTS_PER_CATEGORY),
    }
  }, [clients, query])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useSpotlightResults.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSpotlightResults.ts src/hooks/__tests__/useSpotlightResults.test.ts
git commit -m "feat(spotlight): ajouter le hook de recherche clients/points de prélèvement"
```

---

### Task 5: Composant `SpotlightModal`

**Files:**
- Create: `src/components/spotlight/SpotlightModal.tsx`

Pas de test dédié (composant de présentation branché sur des hooks déjà testés individuellement — cohérent avec le périmètre de tests défini dans la spec, section "Tests").

- [ ] **Step 1: Write the component**

```typescript
// src/components/spotlight/SpotlightModal.tsx
import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import BaseModal from '@/components/ui/BaseModal'
import { useMissionsStore } from '@/stores/missionsStore'
import { useSpotlightStore } from '@/stores/spotlightStore'
import { useSpotlightResults } from '@/hooks/useSpotlightResults'
import { COLORS } from '@/lib/constants'

interface FlatResult {
  key: string
  label: string
  sublabel: string
  to: string
}

export default function SpotlightModal() {
  const navigate = useNavigate()
  const isOpen = useSpotlightStore((s) => s.isOpen)
  const close = useSpotlightStore((s) => s.close)
  const clients = useMissionsStore((s) => s.clients)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useSpotlightResults(clients, query)

  const flatResults = useMemo<FlatResult[]>(() => [
    ...results.clients.map((c) => ({
      key: `client-${c.id}`,
      label: c.nom,
      sublabel: c.segment || 'Client',
      to: `/missions/${c.id}`,
    })),
    ...results.plans.map(({ plan, client }) => ({
      key: `plan-${plan.id}`,
      label: plan.nom,
      sublabel: `${client.nom} · ${plan.siteNom}`,
      to: `/missions/${client.id}/plan/${plan.id}`,
    })),
  ], [results])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  function handleSelect(result: FlatResult) {
    navigate(result.to)
    close()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = flatResults[selectedIndex]
      if (selected) handleSelect(selected)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={close} hideCloseButton maxWidth="lg">
      <div className="flex flex-col gap-1 -mt-2">
        <div className="flex items-center gap-2 px-1 pb-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Search size={16} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un client, un point…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: COLORS.TEXT_PRIMARY }}
            aria-label="Rechercher"
          />
        </div>

        {query.trim() && flatResults.length === 0 && (
          <p className="text-sm px-1 py-4" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun résultat pour « {query} »
          </p>
        )}

        {results.clients.length > 0 && (
          <div className="flex flex-col pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-1 pb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Clients
            </p>
            {results.clients.map((c, i) => (
              <button key={c.id} type="button"
                onClick={() => handleSelect(flatResults[i])}
                className="flex flex-col items-start px-2 py-2 rounded-lg text-left"
                style={{ background: selectedIndex === i ? 'var(--color-accent-light)' : 'transparent' }}>
                <span className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{c.nom}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{c.segment || 'Client'}</span>
              </button>
            ))}
          </div>
        )}

        {results.plans.length > 0 && (
          <div className="flex flex-col pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-1 pb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Points de prélèvement
            </p>
            {results.plans.map(({ plan, client }, i) => {
              const flatIndex = results.clients.length + i
              return (
                <button key={plan.id} type="button"
                  onClick={() => handleSelect(flatResults[flatIndex])}
                  className="flex flex-col items-start px-2 py-2 rounded-lg text-left"
                  style={{ background: selectedIndex === flatIndex ? 'var(--color-accent-light)' : 'transparent' }}>
                  <span className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{plan.nom}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{client.nom} · {plan.siteNom}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </BaseModal>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/spotlight/SpotlightModal.tsx
git commit -m "feat(spotlight): ajouter le composant de la fenêtre de recherche"
```

---

### Task 6: Intégration — raccourci global, icône sidebar, montage

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Monter `SpotlightModal` et le raccourci Cmd+K dans `AppLayout.tsx`**

Ajouter les imports en haut du fichier (après la ligne 12, `import { COLORS } from '@/lib/constants'`) :

```typescript
import SpotlightModal from '@/components/spotlight/SpotlightModal'
import { useSpotlightStore } from '@/stores/spotlightStore'
import { useGlobalHotkey } from '@/hooks/useGlobalHotkey'
```

Dans le corps de `AppLayout` (après la ligne `useNetworkStatus()`, avant `const isChatPage = ...`) :

```typescript
  const openSpotlight = useSpotlightStore((s) => s.open)
  useGlobalHotkey('k', openSpotlight)
```

Juste avant la fermeture du composant, à côté de `<ChangelogModal ... />` (dernière ligne du JSX) :

```typescript
      {/* Spotlight */}
      <SpotlightModal />
```

- [ ] **Step 2: Ajouter l'icône loupe dans `Sidebar.tsx`**

Ajouter les imports en haut du fichier :

```typescript
import { Search } from 'lucide-react'
import { useSpotlightStore } from '@/stores/spotlightStore'
```

(Le fichier importe déjà plusieurs icônes `lucide-react` sur une seule ligne à la ligne 3 — ajouter `Search` à cette liste plutôt que créer un import séparé.)

Dans le corps de `Sidebar`, après `const [collapsedSections, ...]` :

```typescript
  const openSpotlight = useSpotlightStore((s) => s.open)
```

Dans le JSX, juste avant le bouton "Nouveautés" (avant la ligne `<button type="button" onClick={() => changelog.show()} ...>`) :

```tsx
        <button type="button"
          onClick={openSpotlight}
          className="relative flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = COLORS.TEXT_SECONDARY)}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
          <Search size={14} strokeWidth={1.8} />
          Rechercher
          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: COLORS.BG_TERTIARY, color: 'var(--color-text-tertiary)' }}>
            ⌘K
          </span>
        </button>
```

- [ ] **Step 3: Vérifier la compilation et le lint**

Run: `npx tsc --noEmit -p . && npx eslint src/components/layout/AppLayout.tsx src/components/layout/Sidebar.tsx src/components/spotlight/SpotlightModal.tsx`
Expected: aucune erreur

- [ ] **Step 4: Lancer la suite de tests complète**

Run: `npm run test`
Expected: tous les tests passent (les nouveaux + les existants, aucune régression)

- [ ] **Step 5: Vérification manuelle en dev**

Run: `npm run dev`

Dans le navigateur :
1. Appuyer sur `Cmd+K` (ou `Ctrl+K`) depuis n'importe quelle page → la fenêtre Spotlight s'ouvre, le focus est sur le champ de recherche
2. Taper le nom d'un client existant → il apparaît sous "Clients"
3. Taper le nom d'un point de prélèvement existant → il apparaît sous "Points de prélèvement"
4. Utiliser `↓`/`↑` puis `Enter` → navigation vers la bonne page, fenêtre fermée
5. Taper une recherche sans résultat → message "Aucun résultat pour « … »"
6. `Escape` → ferme la fenêtre
7. Cliquer sur l'icône loupe dans la sidebar → ouvre la fenêtre (même comportement que Cmd+K)

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/AppLayout.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(spotlight): brancher le raccourci Cmd+K et l'icône sidebar"
```

---

## Self-Review

**Couverture de la spec :**
- Déclenchement (Cmd/Ctrl+K + icône sidebar) → Task 6 ✅
- Architecture (store, hooks, composant) → Tasks 2–5 ✅
- Matching et données (normalisation, champs, limite 6/catégorie) → Tasks 1, 4 ✅
- Navigation (URLs client/plan) → Task 5 ✅
- Comportement clavier (↑/↓/Enter/Escape) → Task 5 (Escape géré nativement par `BaseModal`) ✅
- Rendu visuel (disposition A, groupement par catégorie) → Task 5 ✅
- Cas limites (aucun résultat) → Task 5 ✅
- Tests (`useSpotlightResults`) → Task 4 ✅

**Cohérence des types :** `SpotlightResults` (Task 4) est utilisé tel quel dans `SpotlightModal` (Task 5) — mêmes noms de champs (`clients`, `plans`), même forme `{ plan, client }`. `useSpotlightStore` (Task 2) expose `isOpen`/`open`/`close`, utilisés identiquement dans `AppLayout` et `Sidebar` (Task 6). `useGlobalHotkey(key, callback)` (Task 3) est appelé avec `('k', openSpotlight)` dans `AppLayout` (Task 6) — signature cohérente.

**Hors scope confirmé (pas de tâche correspondante, volontairement) :** techniciens, pages/outils, historique de recherche, fuzzy-matching, test E2E navigateur — tous listés dans la section "Hors scope" de la spec.
