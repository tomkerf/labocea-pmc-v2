# Vue annuelle — mode plein écran — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode plein écran (overlay in-app, sans navigation) à `YearMatrixView.tsx`, déclenché par un bouton dans sa barre d'outils et fermable via le même bouton ou la touche Échap.

**Architecture:** Un seul état local (`isFullscreen`) dans `YearMatrixView.tsx` pilote les classes CSS du conteneur racine (`fixed inset-0 z-50` en plein écran vs classes actuelles sinon). Aucune prop, aucun store, aucun changement dans les composants parents (`PlanningViewRenderer.tsx`, `PilotagePage.tsx`) — la fonctionnalité est donc disponible automatiquement partout où `YearMatrixView` est utilisé.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library (nouveau fichier de test), `lucide-react` (icônes `Maximize2`/`Minimize2`), `Z_INDEX.MODAL` de `src/lib/constants.ts`.

Référence : spec `docs/superpowers/specs/2026-07-28-year-matrix-fullscreen-design.md`.

---

### Task 1: Créer le fichier de test et écrire les tests qui échouent

**Files:**
- Create: `src/components/planning/__tests__/YearMatrixView.test.tsx`

- [ ] **Step 1: Écrire le fichier de test complet**

Créer `src/components/planning/__tests__/YearMatrixView.test.tsx` avec ce contenu :

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import YearMatrixView from '../YearMatrixView'
import type { Client } from '@/types'

function renderYearMatrix(props: Partial<React.ComponentProps<typeof YearMatrixView>> = {}) {
  const defaults: React.ComponentProps<typeof YearMatrixView> = {
    clients: [] as Client[],
    year: 2026,
    filterTech: '',
    filterSite: '',
    preleveurs: [],
  }
  const merged = { ...defaults, ...props }
  return render(<MemoryRouter><YearMatrixView {...merged} /></MemoryRouter>)
}

describe('YearMatrixView — plein écran', () => {
  it('affiche le bouton "Plein écran" au rendu initial', () => {
    renderYearMatrix()
    expect(screen.getByRole('button', { name: 'Plein écran' })).toBeTruthy()
  })

  it('bascule vers "Quitter le plein écran" au clic', () => {
    renderYearMatrix()
    fireEvent.click(screen.getByRole('button', { name: 'Plein écran' }))
    expect(screen.getByRole('button', { name: 'Quitter le plein écran' })).toBeTruthy()
  })

  it('la touche Échap quitte le plein écran une fois actif', () => {
    renderYearMatrix()
    fireEvent.click(screen.getByRole('button', { name: 'Plein écran' }))
    expect(screen.getByRole('button', { name: 'Quitter le plein écran' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Plein écran' })).toBeTruthy()
  })

  it('la touche Échap ne fait rien quand le plein écran est déjà inactif', () => {
    renderYearMatrix()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Plein écran' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run --project unit src/components/planning/__tests__/YearMatrixView.test.tsx`
Expected: FAIL — `screen.getByRole('button', { name: 'Plein écran' })` ne trouve rien, le bouton n'existe pas encore.

- [ ] **Step 3: Commit**

```bash
git add src/components/planning/__tests__/YearMatrixView.test.tsx
git commit -m "test(planning): ajoute les tests du mode plein écran pour YearMatrixView"
```

---

### Task 2: Implémenter le bouton, l'état et le raccourci Échap

**Files:**
- Modify: `src/components/planning/YearMatrixView.tsx`

- [ ] **Step 1: Importer les icônes et ajouter l'état `isFullscreen`**

Ligne 3, remplacer :

```typescript
import { ChevronRight, ChevronDown, Search } from 'lucide-react'
```

par :

```typescript
import { ChevronRight, ChevronDown, Search, Maximize2, Minimize2 } from 'lucide-react'
```

Ligne 1, ajouter `useEffect` à l'import existant — remplacer :

```typescript
import { useMemo, useState } from 'react'
```

par :

```typescript
import { useEffect, useMemo, useState } from 'react'
```

Ligne 22-24, juste après la déclaration de `focusedMonth`, ajouter le nouvel état et l'effet Échap :

```typescript
  const [issueModalType, setIssueModalType] = useState<'overdue' | 'non_effectue' | null>(null)
  const [monthModal, setMonthModal] = useState<{ month: number; planId?: string } | null>(null)
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFullscreen])
```

- [ ] **Step 2: Rendre le conteneur racine conditionnel**

Ligne 127 (devenue ligne ~133 après l'ajout du Step 1), remplacer :

```typescript
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6">
```

par :

```typescript
    <div className={isFullscreen
      ? 'fixed inset-0 z-50 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6'
      : 'flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6'
    }>
```

- [ ] **Step 3: Ajouter le bouton plein écran dans la barre d'outils**

Dans la barre d'outils (bloc "Légende"), juste après le bouton "Tout déplier/replier" (qui se termine à la ligne ~167 par `</button>`), ajouter un nouveau bouton :

```typescript
          <button type="button"
            onClick={() => setIsFullscreen(v => !v)}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            className="flex items-center justify-center size-7 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
```

Ce bouton doit être le dernier élément de la barre d'outils (après le bouton "Tout déplier/replier" qui a `className="ml-auto ..."` — le nouveau bouton vient donc juste après lui, pas besoin de `ml-auto` puisque le précédent bouton pousse déjà tout le reste à droite).

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run --project unit src/components/planning/__tests__/YearMatrixView.test.tsx`
Expected: PASS — les 4 tests passent.

- [ ] **Step 5: Lancer la suite complète, le typecheck et le lint**

Run: `npx tsc -b && npx vitest run --project unit && npm run lint`
Expected: 0 erreur TypeScript, tous les tests passent (429 tests attendus : 428 existants + les 4 nouveaux moins aucun retrait — vérifier le compte exact affiché plutôt que de se fier à ce nombre), 0 erreur lint.

- [ ] **Step 6: Commit**

```bash
git add src/components/planning/YearMatrixView.tsx
git commit -m "feat(planning): mode plein écran pour la vue annuelle (YearMatrixView)"
```

---

### Task 3: Vérification manuelle sur le staging

**Files:** aucun — validation fonctionnelle.

- [ ] **Step 1: Build de contrôle**

Run: `npm run build`
Expected: build réussi, aucune erreur TypeScript.

- [ ] **Step 2: Déployer sur staging**

Run: `bash deploy-dev.sh`
Expected: `✅ Staging déployé : https://labocea-pmc-v2-dev.tomkerf.workers.dev`

- [ ] **Step 3: Test manuel**

Sur https://labocea-pmc-v2-dev.tomkerf.workers.dev/planning, onglet "Année" :
- Cliquer sur le bouton plein écran (icône agrandir, à droite de "Tout déplier") : vérifier que la sidebar et la bottom tab bar (mobile) disparaissent, que la matrice occupe toute la fenêtre.
- Cliquer à nouveau (icône réduire) : vérifier le retour à l'affichage normal.
- Répéter en plein écran, puis appuyer sur Échap : vérifier la sortie du plein écran.
- Vérifier que les interactions existantes (drill-down mensuel, filtre "Isoler la colonne", modales "En retard"/"Non effectué") fonctionnent normalement en mode plein écran.
- Aller sur https://labocea-pmc-v2-dev.tomkerf.workers.dev/pilotage et vérifier que le même bouton plein écran est présent et fonctionnel sur la vue annuelle de Pilotage.
