---
name: planning-view-extraction
description: >
  Procédure structurée et prudente pour extraire les trois vues calendrier
  (DayView, WeekView, MonthView) de PlanningPage.tsx vers des fichiers
  composants séparés. À utiliser pour la tâche #34 du projet Labocea PMC V2.
  Déclencher dès que la tâche #34 est abordée.
---

# Extraction DayView / WeekView / MonthView — Procédure de refactoring

## Contexte

`src/pages/PlanningPage.tsx` contient ~1280 lignes. Les trois vues sont du JSX
inline dans le return principal :

- **DayView** (l.762–928) : `{viewMode === 'jour' && (() => { ... })()}`
- **WeekView** (l.933–1085) : `{viewMode==='semaine' && (...)}`
- **MonthView** (l.1087–1175) : `{viewMode==='mois' && (...)}`

Ces vues sont couplées à de nombreux state/handlers du parent. L'approche
choisie est de les extraire en composants dans
`src/components/planning/` qui reçoivent toutes leurs dépendances via props
explicites. Pas de Context pour garder la lisibilité.

---

## Règles de sécurité pendant ce refactoring

1. **Une vue à la fois.** Extraire, compiler, tester → passer à la suivante.
2. **Jamais de `git commit` entre deux extractions non testées.**
3. **Vérifier `npx tsc --noEmit` après chaque étape.** Zéro erreur TypeScript
   avant de continuer.
4. **Ne pas modifier la logique.** Copier-coller strict. Aucune refactorisation
   de la logique métier pendant cette étape.
5. **Rollback = `git stash`** si une vue casse le build de manière irrécupérable.

---

## Interfaces de props à construire

Avant d'extraire chaque vue, construire son interface. Voici l'audit complet
des dépendances de chaque vue.

### DayView props

```typescript
interface DayViewProps {
  // Données
  selectedDate:   Date
  today:          Date
  eventsByDate:   Record<string, PlanningEvent[]>
  holidays:       Record<string, string>
  filterTech:     string
  filterRetard:   boolean

  // Handlers navigation
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchEnd:   (e: React.TouchEvent) => void

  // Handlers événements
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
  setSelectedDay:    (day: string | null) => void

  // Fonctions utilitaires (importées directement dans le composant, pas props)
  // → toISO, sortEvts, assignColumns, parseHHMM, sameDay : importer depuis planningUtils
}
```

> **Note** : `filterTech` et `filterRetard` sont utilisés inline dans DayView
> pour filtrer `eventsByDate[dateStr]`. Le composant les reçoit en props et
> refait le filtrage localement (comme dans PlanningPage).

### WeekView props

```typescript
interface WeekViewProps {
  // Données calendrier
  weekDays:       Date[]
  today:          Date
  holidays:       Record<string, string>

  // Données événements
  eventsByDate:   Record<string, PlanningEvent[]>
  bilanBand:      BilanGroup[][]   // type exporté depuis PlanningPage ou déclaré localement
  allDayItems:    AllDayItem[]     // type exporté depuis PlanningPage ou déclaré localement
  evenements:     EvenementPersonnel[]

  // Filtres
  filterTech:     string
  filterRetard:   boolean

  // Handlers drag
  isDragging:     boolean
  handleDragMouseDown:  (e: React.MouseEvent, dateStr: string) => void
  handleDragMouseEnter: (dateStr: string) => void
  handleDragMouseUp:    (e: React.MouseEvent) => void
  setIsDragging:        (v: boolean) => void
  setDragStart:         (v: string | null) => void
  setDragEnd:           (v: string | null) => void

  // Handlers navigation/événements
  handleSelectEvent:    (event: PlanningEvent, dateStr: string) => void
  goToDay:              (dateStr: string) => void
  setCtxMenu:           (v: { dateStr: string; x: number; y: number } | null) => void
}
```

> **Note** : `filteredForDayFlat` n'est PAS passé en prop — WeekView l'appelle
> directement depuis `eventsByDate` + ses filtres. Dupliquer la logique de
> filtrage (2 lignes) plutôt que de passer un callback complexe.
> Même chose pour `isInDrag`.

### MonthView props

```typescript
interface MonthViewProps {
  // Données calendrier
  monthGrid:      (Date | null)[]
  today:          Date
  holidays:       Record<string, string>

  // Données événements
  eventsByDate:   Record<string, PlanningEvent[]>

  // Filtres
  filterTech:     string
  filterRetard:   boolean

  // Handlers drag
  isDragging:     boolean
  handleDragMouseDown:  (e: React.MouseEvent, dateStr: string) => void
  handleDragMouseEnter: (dateStr: string) => void
  handleDragMouseUp:    (e: React.MouseEvent) => void
  setIsDragging:        (v: boolean) => void
  setDragStart:         (v: string | null) => void
  setDragEnd:           (v: string | null) => void

  // Handlers navigation/événements
  handleSelectEvent:    (event: PlanningEvent, dateStr: string) => void
  goToDay:              (dateStr: string) => void
  setCtxMenu:           (v: { dateStr: string; x: number; y: number } | null) => void
}
```

---

## Procédure étape par étape

### PHASE 0 — Préparation (avant toute extraction)

```bash
# 1. Vérifier que le build actuel est propre
cd /sessions/brave-vigilant-bohr/mnt/app-pmc-v2
npx tsc --noEmit 2>&1 | head -20

# 2. Checkpoint git
git add -A && git stash
git stash pop  # On remet, juste pour vérifier que stash fonctionne
```

Résultat attendu : zéro erreur TypeScript. Si des erreurs pré-existent,
les corriger d'abord.

---

### PHASE 1 — Extraire DayView

#### Étape 1.1 — Créer le fichier vide

Créer `src/components/planning/DayView.tsx` avec :
- Les imports (React, lucide-react, planningUtils, EventPill)
- L'interface `DayViewProps`
- Un export default vide `function DayView(props: DayViewProps) { return null }`

#### Étape 1.2 — Vérifier le build

```bash
npx tsc --noEmit 2>&1 | head -20
```

Si erreur → corriger l'interface avant de continuer.

#### Étape 1.3 — Copier le JSX

Dans PlanningPage.tsx, le bloc DayView commence à la ligne ~762 :
```
{viewMode === 'jour' && (() => {
  const D_START = 7, ...
  return (
    <div className="flex-1 overflow-hidden flex flex-col relative"
    ...
  )
})()}
```

Copier le contenu du IIFE (entre `{` et `}`) dans le corps de `DayView`.
Le composant doit `return (...)` le JSX qui était dans le `return` du IIFE.

Les variables locales au IIFE (`D_START`, `D_END`, `PX_H`, `PX_M`, `dateStr`,
`allEvts`, `allDayEvts`, `timedEvts`, `now`, `nowMin`, `showNow`, `weekNum`)
deviennent des `const` locales dans le corps du composant.

Remplacer les références aux props par `props.xxx` ou déstructurer :
```typescript
const {
  selectedDate, today, eventsByDate, holidays,
  filterTech, filterRetard,
  handleTouchStart, handleTouchEnd,
  handleSelectEvent, setSelectedDay,
} = props
```

#### Étape 1.4 — Vérifier le build

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Corriger les erreurs une par une. Types manquants habituels :
- `normTech` → importer depuis `@/lib/planningUtils`
- `toISO`, `sortEvts`, `assignColumns`, `parseHHMM`, `sameDay` → même import

#### Étape 1.5 — Brancher dans PlanningPage

Dans PlanningPage.tsx :
1. Ajouter l'import : `import DayView from '@/components/planning/DayView'`
2. Remplacer le bloc `{viewMode === 'jour' && (() => { ... })()}` par :
```tsx
{viewMode === 'jour' && (
  <DayView
    selectedDate={selectedDate}
    today={today}
    eventsByDate={eventsByDate}
    holidays={holidays}
    filterTech={filterTech}
    filterRetard={filterRetard}
    handleTouchStart={handleTouchStart}
    handleTouchEnd={handleTouchEnd}
    handleSelectEvent={handleSelectEvent}
    setSelectedDay={setSelectedDay}
  />
)}
```

#### Étape 1.6 — Vérifier le build + tester

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Zéro erreur → ouvrir l'app en staging/local et tester la **vue Jour** :
- Navigation prev/next
- Swipe mobile (si possible)
- Clic sur un événement → modal EventDetail
- Bouton FAB "Planifier"

---

### PHASE 2 — Extraire WeekView

Même séquence :

#### Étape 2.1 — Créer `src/components/planning/WeekView.tsx`

L'interface WeekView a des types internes (`BilanGroup`, `AllDayItem`) qui
sont actuellement définis inline dans PlanningPage via `useMemo`. Ces types
doivent être déclarés dans WeekView.tsx :

```typescript
type BilanItem  = { colIdx: number; event: PlanningEvent }
type BilanGroup = { colStart: number; colEnd: number; techColor: string; items: BilanItem[] }

type AllDayItem = {
  key: string; colStart: number; colEnd: number; row: number
  bg: string; color: string; label: string
  badge?: string; tag?: string
  onClick: () => void; tooltip: string
}
```

> Ces types sont actuellement implicites dans PlanningPage. Les rendre
> explicites dans WeekView est l'occasion de les formaliser.

#### Étape 2.2 — Vérifier build (fichier vide)

#### Étape 2.3 — Copier le JSX

Le bloc WeekView dans PlanningPage commence à :
```
{viewMode==='semaine' && (
  <div className="flex flex-col flex-1 overflow-hidden">
```

Copier jusqu'au `)}` fermant correspondant (autour de la ligne 1085).

Dans WeekView, les fonctions locales à recréer :
- `filteredForDayFlat(dateStr)` → recalculer inline :
  ```typescript
  function filteredForDayFlat(dateStr: string) {
    let evts = eventsByDate[dateStr] ?? []
    if (filterTech)   evts = evts.filter(e => normTech(e.technicien) === filterTech)
    if (filterRetard) evts = evts.filter(e => e.priority === 0)
    return sortEvts(evts)
  }
  ```
- `isInDrag(dateStr)` → recalculer depuis `dragStart`/`dragEnd`... mais
  ces states ne sont pas passés en props. **Solution** : passer `isInDrag`
  comme prop `(dateStr: string) => boolean`, calculé dans PlanningPage.

#### Étape 2.4 — Ajuster les props si nécessaire

Si pendant la copie on découvre d'autres dépendances non prévues :
1. Ajouter la prop à l'interface
2. Passer la valeur depuis PlanningPage
3. Recompiler

#### Étape 2.5 — Vérifier build

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

#### Étape 2.6 — Brancher dans PlanningPage

Remplacer le bloc `{viewMode==='semaine' && (...)}` par :
```tsx
{viewMode === 'semaine' && (
  <WeekView
    weekDays={weekDays}
    today={today}
    holidays={holidays}
    eventsByDate={eventsByDate}
    bilanBand={bilanBand}
    allDayItems={allDayItems}
    evenements={evenements}
    filterTech={filterTech}
    filterRetard={filterRetard}
    isDragging={isDragging}
    handleDragMouseDown={handleDragMouseDown}
    handleDragMouseEnter={handleDragMouseEnter}
    handleDragMouseUp={handleDragMouseUp}
    setIsDragging={setIsDragging}
    setDragStart={setDragStart}
    setDragEnd={setDragEnd}
    handleSelectEvent={handleSelectEvent}
    goToDay={goToDay}
    setCtxMenu={setCtxMenu}
    isInDrag={isInDrag}
  />
)}
```

#### Étape 2.7 — Vérifier build + tester

Tester la **vue Semaine** :
- En-têtes colonnes (fériés en rouge)
- Bande bilan J1/J2
- Bande "toute la journée" (événements multi-jours)
- Drag-to-create (glisser sur plusieurs jours)
- Clic droit (context menu)
- EventPill : clic → modal, grouped → goToDay

---

### PHASE 3 — Extraire MonthView

#### Étape 3.1 — Créer `src/components/planning/MonthView.tsx`

MonthView est la plus simple : pas de `bilanBand` ni `allDayItems`. Elle
n'utilise que `filteredForDay` (avec regroupement par client).

Même pattern que WeekView :
- Recréer `filteredForDay` localement (appelle `groupByClient`)
- Passer `isInDrag` en prop

#### Étapes 3.2 à 3.6 — Même séquence

Tester la **vue Mois** :
- Grille 5 colonnes, toutes les semaines
- Numéros de jours (aujourd'hui en rouge)
- EventPills compact
- "+X autres" si > 3 events
- Drag-to-create
- Fériés
- Congés overlay

---

### PHASE 4 — Vérification finale et commit

```bash
# Build propre
npx tsc --noEmit 2>&1 | grep -v "node_modules"

# Compter les lignes restantes dans PlanningPage
wc -l src/pages/PlanningPage.tsx
```

Résultat attendu : PlanningPage < 700 lignes (était ~1280).

```bash
# Commit
git add src/pages/PlanningPage.tsx \
        src/components/planning/DayView.tsx \
        src/components/planning/WeekView.tsx \
        src/components/planning/MonthView.tsx

git commit -m "refactor(planning): extraire DayView, WeekView, MonthView

PlanningPage passe de ~1280 à <700 lignes.
Chaque vue est un composant isolé dans src/components/planning/.
Logique et comportement inchangés — refactoring pur.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Points de vigilance connus

### `EventRow` et `MiniCalendarPanel`

Ces deux sous-fonctions (définies dans PlanningPage, ~lignes 464 et 515)
**ne sont PAS dans le scope de cette tâche**. Les laisser en place.
Elles pourront être extraites en étape 6 si besoin.

### `isInDrag` — passage en prop vs recalcul

`isInDrag(dateStr)` dépend de `dragStart`, `dragEnd`, `isDragging`.
Options :
- **Option A** (recommandée) : passer `isInDrag` comme prop `(dateStr: string) => boolean`
- **Option B** : passer `dragStart`, `dragEnd`, `isDragging` séparément et recalculer dans le composant

Option A est plus propre car elle encapsule la logique du drag dans PlanningPage.

### `filteredForDay` vs `filteredForDayFlat`

Ces deux fonctions sont définies dans PlanningPage comme `useCallback`.
**Ne pas les passer en props** — les recréer localement dans chaque vue
(2-3 lignes chacune). Cela évite des dépendances de callback complexes.

### Types `BilanGroup` et `AllDayItem`

Ces types sont actuellement implicites (TypeScript les infère). Les rendre
explicites dans WeekView.tsx est **obligatoire** pour que le composant soit
correctement typé. Utiliser exactement les shapes observées dans
PlanningPage (voir audit ci-dessus).

### Imports dans les vues extraites

Chaque composant extrait doit importer directement :
```typescript
import {
  type PlanningEvent,
  JOURS_COURT, MOIS_LONG,  // selon les besoins
  getTechColor, normTech,
  toISO, sameDay, addDays,
  sortEvts, groupByClient,
  parseHHMM, assignColumns, isMultiDay,
} from '@/lib/planningUtils'
import EventPill from '@/components/planning/EventPill'
```

---

## Checklist de validation finale

Avant de marquer la tâche #34 comme `completed` :

- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] Vue Jour : navigation, swipe, FAB, EventDetail modal
- [ ] Vue Semaine : bilan J1/J2, événements multi-jours, drag-to-create, clic droit
- [ ] Vue Mois : grille, compact pills, "+X autres", drag, fériés
- [ ] Vue mobile (liste période) : inchangée, toujours fonctionnelle
- [ ] DayModal, CellContextMenu, EventDetailModal, GhostDetailModal : toujours ouverts correctement
- [ ] `PlanningPage.tsx` < 700 lignes
- [ ] Git commit propre
