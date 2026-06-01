# Planning — Filtres site + technicien Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un filtre par site (Quimper / Brest) dans le header du planning, qui restreint les pills technicien visibles, sans modifier la logique de filtrage des événements existante.

**Architecture:** `filterSite` est un état local dans `PlanningPage` (persiste dans localStorage). `visibleTechs` est dérivé de `allTechs` filtré par `preleveur.site`. `PlanningHeader` reçoit ces deux valeurs et affiche une ligne de pills site au-dessus de la ligne tech. Quand le site change et que `filterTech` courant n'est plus dans `visibleTechs`, `filterTech` est remis à `''`.

**Tech Stack:** React, TypeScript, Framer Motion, localStorage pour persistance

---

### Task 1 : Ajouter `filterSite` dans PlanningPage + dériver `visibleTechs`

**Files:**
- Modify: `src/pages/PlanningPage.tsx`

- [ ] **Step 1 : Ajouter l'état `filterSite`**

Dans `PlanningPage.tsx`, après la ligne 80 (`filterTech` / `setFilterTech`), ajouter :

```tsx
const [filterSite, setFilterSite] = useState<string>(
  () => localStorage.getItem('planning_filter_site') ?? ''
)
```

- [ ] **Step 2 : Dériver `visibleTechs` depuis `allTechs` + `filterSite`**

Après le bloc `usePlanningData` (vers la ligne 120, là où `allTechs` est destructuré), ajouter le memo suivant :

```tsx
const visibleTechs = useMemo(() => {
  if (!filterSite) return allTechs
  return allTechs.filter(code => {
    const prel = preleveurs.find(p => p.code === code)
    return (prel?.site ?? '') === filterSite
  })
}, [allTechs, filterSite, preleveurs])
```

- [ ] **Step 3 : Remettre `filterTech` à vide quand il n'est plus dans `visibleTechs`**

Après le memo `visibleTechs`, ajouter un effet :

```tsx
useEffect(() => {
  if (filterTech && !visibleTechs.includes(filterTech)) {
    setFilterTech('')
    localStorage.removeItem('planning_filter_tech')
  }
}, [visibleTechs, filterTech, setFilterTech])
```

Ajouter `useEffect` à l'import React si absent (ligne 1) :

```tsx
import { useState, useMemo, useEffect } from 'react'
```

- [ ] **Step 4 : Passer `filterSite`, `setFilterSite`, `visibleTechs` à `PlanningHeader`**

Trouver le JSX `<PlanningHeader` (vers la ligne 193) et ajouter les trois props :

```tsx
allTechs={visibleTechs}          {/* remplace allTechs={allTechs} */}
filterSite={filterSite}
setFilterSite={setFilterSite}
```

`allTechs` est renommé en `visibleTechs` ici — seuls les techs du site sélectionné apparaissent dans les pills.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/PlanningPage.tsx
git commit -m "feat(planning): filterSite state + visibleTechs derivation"
```

---

### Task 2 : Afficher les pills site dans PlanningHeader

**Files:**
- Modify: `src/components/planning/PlanningHeader.tsx`

- [ ] **Step 1 : Étendre l'interface `PlanningHeaderProps`**

Dans `PlanningHeader.tsx`, étendre `Preleveur` pour inclure `site` :

```tsx
type Preleveur = { code: string; nom?: string; site?: string }
```

Ajouter les props dans `PlanningHeaderProps` :

```tsx
filterSite:     string
setFilterSite:  Dispatch<SetStateAction<string>>
```

- [ ] **Step 2 : Déstructurer les nouvelles props**

Dans la signature de la fonction `PlanningHeader`, ajouter :

```tsx
filterSite, setFilterSite,
```

- [ ] **Step 3 : Calculer les sites disponibles**

Au début du composant (avant le `return`), ajouter :

```tsx
const availableSites = useMemo(() => {
  const sites = new Set(preleveurs.map(p => p.site).filter(Boolean) as string[])
  return [...sites].sort()
}, [preleveurs])
```

Ajouter `useMemo` à l'import React :

```tsx
import { useMemo } from 'react'
```

- [ ] **Step 4 : Afficher les pills site avant la ligne tech**

Dans la "Ligne 2 : filtres technicien + pluie" (autour de la ligne 159), **avant** le bloc `{allTechs.length > 1 && (`, insérer les pills site :

```tsx
{availableSites.length > 1 && (
  <div className="flex items-center gap-1.5 flex-wrap mr-3"
    style={{ borderRight: '1px solid var(--color-border-subtle)', paddingRight: '12px' }}>
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => { setFilterSite(''); localStorage.removeItem('planning_filter_site') }}
      className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
      style={{
        background: !filterSite ? 'var(--color-text-primary)' : 'var(--color-bg-secondary)',
        color: !filterSite ? 'white' : 'var(--color-text-secondary)',
        border: `1px solid ${!filterSite ? 'transparent' : 'var(--color-border-subtle)'}`,
      }}
    >
      Tous les sites
    </motion.button>
    {availableSites.map(site => {
      const isActive = filterSite === site
      return (
        <motion.button
          key={site}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            const v = site === filterSite ? '' : site
            setFilterSite(v)
            if (v) localStorage.setItem('planning_filter_site', v)
            else localStorage.removeItem('planning_filter_site')
          }}
          className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
          style={{
            background: isActive ? 'var(--color-text-secondary)' : 'var(--color-bg-secondary)',
            color: isActive ? 'white' : 'var(--color-text-secondary)',
            border: `1px solid ${isActive ? 'transparent' : 'var(--color-border-subtle)'}`,
          }}
        >
          {site}
        </motion.button>
      )
    })}
  </div>
)}
```

- [ ] **Step 5 : Vérifier que `tsc` passe sans erreur**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/components/planning/PlanningHeader.tsx
git commit -m "feat(planning): pills filtre par site dans PlanningHeader"
```

---

### Task 3 : Pré-remplir `site` dans Firestore pour les préleveurs existants

> Cette tâche est manuelle / admin — elle ne touche pas le code React mais est nécessaire pour que les filtres fonctionnent en production.

- [ ] **Step 1 : Vérifier les préleveurs en base**

Dans la console Firebase (Firestore → collection `preleveurs`), vérifier que chaque document a un champ `site`.

- [ ] **Step 2 : Mettre à jour les documents manquants**

Pour chaque préleveur sans `site`, ajouter le champ manuellement dans la console :
- Thomas (THK), Romain → `site: "Quimper"`
- Ludovic, Hubert, Pierre-Olivier, Fabien → `site: "Brest"`

- [ ] **Step 3 : Déployer et valider sur staging**

```bash
bash deploy-dev.sh
```

Ouvrir le planning sur staging, vérifier que les pills "Tous les sites / Quimper / Brest" apparaissent, que sélectionner "Brest" restreint les pills tech aux techs de Brest, et que les événements se filtrent correctement.
