# Filtres par Site et Technicien dans l'Onglet Charge — Plan d'Implémentation

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter des contrôles de filtrage par site (Brest/Quimper) et par technicien dans l'onglet Charge/Vue annuelle de MissionsPage, en passant ces filtres aux composants WorkloadMatrixView et YearMatrixView qui les supportent déjà.

**Architecture:** 
- MissionsPage gère deux états de filtre (`filterSite` et `filterTech`)
- Quand la vue est 'charge' ou 'annee', afficher deux sélecteurs (site et technicien) au-dessus de la matrice
- Récupérer dynamiquement les sites uniques des prélèveurs et les techniciens disponibles
- Passer les filtres sélectionnés à WorkloadMatrixView/YearMatrixView qui appliquent déjà la logique de filtrage

**Tech Stack:** React (useState), Zustand stores, tailwindcss, lucide-react

---

## Task 1: Ajouter les états de filtre dans MissionsPage

**Files:**
- Modify: `src/pages/MissionsPage.tsx:28-32`

- [ ] **Step 1:** Ajouter deux états pour les filtres site et technicien après l'état `view`

Remplacer les lignes 28-32:
```tsx
  const [search, setSearch] = useState('')
  const [onlyRetard, setOnlyRetard] = useState(false)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<'liste' | 'annee' | 'charge'>('liste')
  const [year, setYear] = useState(new Date().getFullYear())
```

Par:
```tsx
  const [search, setSearch] = useState('')
  const [onlyRetard, setOnlyRetard] = useState(false)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<'liste' | 'annee' | 'charge'>('liste')
  const [year, setYear] = useState(new Date().getFullYear())
  const [filterSite, setFilterSite] = useState('')
  const [filterTech, setFilterTech] = useState('')
```

- [ ] **Step 2:** Commit

```bash
git add src/pages/MissionsPage.tsx
git commit -m "feat(missions): add filter state for site and technician"
```

---

## Task 2: Calculer les listes uniques de sites et techniciens

**Files:**
- Modify: `src/pages/MissionsPage.tsx:33-35`

- [ ] **Step 1:** Ajouter le calcul des sites et techniciens uniques après l'appel aux stores

Ajouter après la ligne 35 (`const uid = useAuthStore(selectUid)`):

```tsx
  // Extraire les sites uniques des prélèveurs
  const availableSites = useMemo(() => {
    const sites = new Set<string>()
    preleveurs.forEach(p => {
      if (p.site) sites.add(p.site)
    })
    return Array.from(sites).sort()
  }, [preleveurs])

  // Extraire les techniciens uniques assignés à des plans
  const availableTechs = useMemo(() => {
    const techs = new Set<string>()
    clients.forEach(c => {
      c.plans.forEach(p => {
        if (c.preleveur) techs.add(c.preleveur)
      })
    })
    return Array.from(techs).sort()
  }, [clients])
```

- [ ] **Step 2:** Importer `useMemo` si ce n'est pas déjà fait

Vérifier que la ligne 1 contient `useMemo`:
```tsx
import { useState, useMemo } from 'react'
```

Si `useMemo` n'y est pas, l'ajouter.

- [ ] **Step 3:** Commit

```bash
git add src/pages/MissionsPage.tsx
git commit -m "feat(missions): compute unique sites and technicians for filters"
```

---

## Task 3: Ajouter les contrôles de filtre dans l'UI

**Files:**
- Modify: `src/pages/MissionsPage.tsx:129-150`

- [ ] **Step 1:** Ajouter la section de filtres juste après la navigation année, avant le rendu des matrices

Après la ligne 149 (après le bouton année suivante), ajouter:

```tsx
          {/* Filtres Site et Technicien */}
          <div className="shrink-0 flex gap-3 px-6 mb-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.TEXT_SECONDARY }}>
                Site
              </label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: COLORS.BG_SECONDARY,
                  border: '1px solid var(--color-border-subtle)',
                  color: COLORS.TEXT_PRIMARY,
                }}
              >
                <option value="">Tous les sites</option>
                {availableSites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.TEXT_SECONDARY }}>
                Technicien
              </label>
              <select
                value={filterTech}
                onChange={(e) => setFilterTech(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: COLORS.BG_SECONDARY,
                  border: '1px solid var(--color-border-subtle)',
                  color: COLORS.TEXT_PRIMARY,
                }}
              >
                <option value="">Tous les techniciens</option>
                {availableTechs.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>
            </div>
          </div>
```

- [ ] **Step 2:** Commit

```bash
git add src/pages/MissionsPage.tsx
git commit -m "feat(missions): add site and technician filter selects to matrix view"
```

---

## Task 4: Passer les filtres aux composants matrix

**Files:**
- Modify: `src/pages/MissionsPage.tsx:151-167`

- [ ] **Step 1:** Mettre à jour l'appel à YearMatrixView pour passer les filtres

Remplacer les lignes 152-158:
```tsx
          {view === 'annee' ? (
            <YearMatrixView
              clients={clients}
              year={year}
              filterTech=""
              filterSite=""
              preleveurs={preleveurs}
            />
```

Par:
```tsx
          {view === 'annee' ? (
            <YearMatrixView
              clients={clients}
              year={year}
              filterTech={filterTech}
              filterSite={filterSite}
              preleveurs={preleveurs}
            />
```

- [ ] **Step 2:** Mettre à jour l'appel à WorkloadMatrixView pour passer les filtres

Remplacer les lignes 159-167:
```tsx
          ) : (
            <WorkloadMatrixView
              clients={clients}
              year={year}
              filterTech=""
              filterSite=""
              preleveurs={preleveurs}
            />
          )}
```

Par:
```tsx
          ) : (
            <WorkloadMatrixView
              clients={clients}
              year={year}
              filterTech={filterTech}
              filterSite={filterSite}
              preleveurs={preleveurs}
            />
          )}
```

- [ ] **Step 3:** Commit

```bash
git add src/pages/MissionsPage.tsx
git commit -m "feat(missions): pass site and technician filters to matrix components"
```

---

## Task 5: Tester les filtres dans le navigateur

**Files:**
- No files modified (browser testing only)

- [ ] **Step 1:** Démarrer le serveur de développement

```bash
npm run dev
```

- [ ] **Step 2:** Naviguer vers /missions et cliquer sur l'onglet "Charge"

Expected: Voir deux dropdowns "Site" et "Technicien" s'afficher sous la navigation année

- [ ] **Step 3:** Tester le filtre par site

1. Sélectionner "Brest" dans le dropdown Site
2. Vérifier que seuls les techniciens/prélèvements du site Brest s'affichent
3. Sélectionner "Quimper"
4. Vérifier que la matrice se met à jour pour afficher Quimper

- [ ] **Step 4:** Tester le filtre par technicien

1. Sélectionner un technicien spécifique dans le dropdown
2. Vérifier que la matrice ne montre que ce technicien
3. Sélectionner un autre technicien
4. Vérifier la mise à jour

- [ ] **Step 5:** Tester les filtres combinés

1. Sélectionner Site = "Brest" et Technicien = "Thomas"
2. Vérifier que seuls les prélèvements de Thomas à Brest s'affichent

- [ ] **Step 6:** Tester la vue "Vue annuelle" avec les filtres

1. Cliquer sur "Vue annuelle"
2. Vérifier que les mêmes dropdowns de filtres s'affichent
3. Tester les filtres (site et technicien)
4. Vérifier que la matrice annuelle se filtre correctement

- [ ] **Step 7:** Tester le reset des filtres

1. Sélectionner un filtre
2. Cliquer sur "Tous les sites" / "Tous les techniciens"
3. Vérifier que la matrice affiche tous les techniciens/prélèvements
