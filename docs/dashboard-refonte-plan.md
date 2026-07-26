# Refonte esthétique du Dashboard — plan validé

> **Statut : maquette validée par Tom, implémentation non démarrée.**
> Session du 26/07/2026. Option retenue : **refonte complète** (structure + finition).
> Maquette de référence : [dashboard-refonte-mockup.html](./dashboard-refonte-mockup.html) — ouvrir dans un navigateur.

---

## Périmètre

`src/pages/DashboardPage.tsx` (440 l.) + `src/components/dashboard/*` (14 composants, 1502 l.).
Onglet **« Mon activité »** uniquement. L'onglet « Suivi équipe » (`EquipeSuiviWidget`, 344 l.) n'est **pas** dans le périmètre.

---

## Diagnostic (état au 26/07/2026)

### Structurel

1. **Mur de 7 accordéons identiques** en bas de page — `DashboardNewsWidget`, `TodosWidget`,
   `RapportsWidget`, `RetardWidget`, `PluieWidget`, `MaintenancesWidget`, `MetrologieWidget`.
   Chacun a le même header (label uppercase + badge compteur + chevron). Aucune hiérarchie :
   la page devient une liste de tiroirs indifférenciés.
2. **Pas de hiérarchie visuelle** — le planning du jour (l'info clé pour un technicien terrain)
   a exactement le même poids que le donut « État du parc matériel ».
3. **`max-w-4xl`** (896px) sur `DashboardPage.tsx:281` → sur écran large tout est comprimé
   à gauche, beaucoup de vide à droite.

### Finition

4. **Deux systèmes de style coexistent** — classes Tailwind `bg-[var(--color-*)]`
   (`StatCard`, `DashboardNewsWidget`, `DashboardHeader`) vs. `style={{ background: COLORS.X }}`
   (`RetardWidget`, `MetrologieWidget`, `MaintenancesWidget`, `PluieWidget`, `DonutChart`,
   `EmptyCard`, `DashboardPlanningWidget`). Les hovers de lignes sont gérés en JS
   (`onMouseEnter` / `onMouseLeave` mutant `e.currentTarget.style.background`) au lieu de CSS
   `hover:` → micro-incohérences visuelles + jank + code verbeux.
5. **Rayons de bordure mélangés** — `rounded-2xl` (16px) sur `StatCard` et les cartes actus,
   `rounded-xl` (12px) sur tous les widgets accordéon, alors que le token `--radius-md`
   vaut **18px** dans `src/index.css:47`. Trois valeurs côte à côte.
6. **`SectionTitle` en `--color-text-tertiary`** (#AEAEB2) sur fond `--color-bg-primary`
   (#F2F2F7) → contraste ≈ **1.9:1**, échec WCAG AA (minimum 4.5:1).
   Même problème sur les headers des widgets accordéon (valeur inline identique).
7. **Emojis** `👋` (`DashboardHeader.tsx:37`), `🌧` (`DashboardPlanningWidget.tsx:103,154`,
   `RetardWidget`), `🚙` (`DashboardPlanningWidget.tsx:199`), et dans `TodosWidget` :
   `📅` (l. 172), `💼` (l. 186), `🔧` (l. 201) — contredit la règle DS n°4
   « les icônes sont monochromes, Lucide React, stroke-width 1.5 ».
   Remplacements : `CalendarClock`, `Briefcase`, `Wrench`.
8. **Aucun skeleton de chargement** — `useMissionsStore` expose bien `loading`
   (`missionsStore.ts:16`) mais `DashboardPage` ne le consomme pas → les KPI affichent `0` / `—`
   avant l'arrivée de Firestore, puis sautent aux vraies valeurs.
9. **`DonutChart` sans finition** — `strokeLinecap="butt"`, pas de gap entre segments,
   pas d'animation d'entrée, légende non interactive.
10. **`StatCard` sans icône** — 4 chiffres nus alignés ; la couleur du chiffre est le seul signal
    d'état.

### Dette documentaire découverte au passage

`.claude/docs/design-system.md` est **périmé** sur deux points :
- il annonce `--radius-md: 10px` → `index.css` a **18px** (et `--radius-lg`/`--radius-xl` aussi à 18px) ;
- il annonce `--color-bg-primary: #F5F5F7` → `index.css:10` a **#F2F2F7**.

À corriger dans le même chantier.

---

## Cibles de la refonte

| Avant | Après |
|---|---|
| 7 accordéons empilés, headers identiques | 1 carte **« À traiter »** à onglets segmentés, compteurs colorés visibles d'un coup d'œil |
| KPI = 4 chiffres nus | icône Lucide teintée (carré 30px, radius 9px) + badge contextuel + micro-barre de progression pour la conformité |
| Planning au même poids que le donut | grille `1.55fr / 1fr` — planning dominant à gauche, rail secondaire à droite |
| `max-w-4xl` (896px) | `max-w-6xl` (1152px) |
| Emojis 👋 🌧 🚙 | icônes Lucide monochromes (`CloudRain`, `Truck`, `FlaskConical`, `FileText`, `Gauge`, `Crosshair`) |
| Rayons 12 / 16 / 18px mélangés | `--radius-md` (18px) pour les cartes, 14px pour les boutons, `--radius-full` pour les pills |
| `SectionTitle` #AEAEB2 (1.9:1) | `--color-text-secondary` #6E6E73 (**5.1:1**, WCAG AA ✓) |
| Donut `linecap: butt`, statique | caps arrondis, gaps entre segments, animation de tracé à l'entrée |
| Bandeau pluie génerique | « Temps de pluie prévu — N prélèvements pluie concernés » |
| Bouton « Mode Tournée du Jour » + sous-titre | « Démarrer la tournée du jour · N prélèvements » |
| Hovers en JS | CSS `hover:` via Tailwind |
| Styles inline `COLORS.X` | classes Tailwind `bg-[var(--color-*)]` partout |

### Structure cible de la page

```
┌─ Header : date · « Bonjour, Thomas » · switcher rôle · avatar
├─ KPI row (4 colonnes desktop / 2×2 mobile)
├─ Hero grid (1.55fr / 1fr)
│  ├─ gauche : Planning du jour (bandeau pluie + timeline + CTA tournée)
│  └─ droite : État du parc (donut) · Actualités  [· Todos ?]
├─ Bande « Mes tâches prioritaires » (TodosWidget, pleine largeur)
└─ Carte « À traiter » (pleine largeur, onglets)
   Rapports · Retards · Pluie · Maintenances · Métrologie
```

---

## Décisions tranchées le 26/07/2026

### 1. Placement du `TodosWidget` → **bande pleine largeur**

Section propre entre le hero et « À traiter », sur toute la largeur (`max-w-6xl`).

**Pourquoi pas les deux autres options :**
- *6ᵉ onglet de « À traiter »* — les 5 autres onglets sont des listes **en lecture seule**,
  2 lignes, badge à droite. `TodosWidget` a une checkbox qui **écrit dans Firestore**
  (`saveTodo`, l. 43-49), 3 liens cliquables (client / équipement / échéance), un badge de
  priorité et un footer. Le mettre en onglet casse l'uniformité des lignes, ou oblige à
  l'amputer.
- *Rail droit* — le rail fait ~380px. La ligne de métadonnées à 3 liens (l. 164-205)
  passerait à la ligne salement, et 5 tâches × 4 lignes rendraient le rail deux fois plus
  haut que la colonne planning.

**Conséquence :** la page passe de 7 sections empilées à **2** (bande Todos + carte À traiter).
Le composant garde toutes ses fonctions ; seuls le header (contraste, emojis) et le style
(Tailwind au lieu de `COLORS.X` inline, hovers CSS au lieu de `onMouseEnter`) changent.

### 2. Comportement mobile de « À traiter » → **dépliée sur l'onglet le plus urgent**

Sous le breakpoint 720px : 1 colonne, barre d'onglets scrollable horizontalement, et la carte
s'ouvre **automatiquement sur le premier onglet contenant des éléments en retard**.

Ordre de priorité pour l'onglet auto-sélectionné :
1. `Retards` si `prelevementsEnRetard.length > 0`
2. sinon `Rapports` si `rapportsAFaireMoi.some(r => r.enRetard)`
3. sinon `Métrologie` si au moins un équipement a `daysDiff < 0`
4. sinon le premier onglet non vide
5. sinon la carte entière ne s'affiche pas (comportement actuel : `if (items.length === 0) return null`)

L'urgent est visible sans un tap, et la page reste courte puisqu'un seul onglet s'affiche
à la fois. Même logique appliquée sur desktop (cohérence).

---

## Points encore à valider

- Rendu de la bande Todos et des onglets scrollables sur **téléphone réel** (pas seulement
  en redimensionnant le navigateur) — à faire pendant les retours équipe Brest.

---

## Ordre d'implémentation proposé

1. **Socle sans risque** — unifier les styles (Tailwind partout, hovers CSS), rayons sur
   `--radius-md`, corriger le contraste de `SectionTitle`, remplacer les emojis par Lucide.
   Aucune régression fonctionnelle possible.
2. **Composants** — nouveau `StatCard` avec icône, `DonutChart` avec caps arrondis + gaps +
   animation, skeletons branchés sur `missionsStore.loading`.
3. **Structure** — `max-w-6xl`, grille hero `1.55fr/1fr`, planning dominant.
4. **Nouveau composant `ATraiterWidget`** — fusionne Rapports / Retard / Pluie / Maintenances /
   Métrologie derrière des onglets segmentés. Les 5 anciens widgets deviennent des rendus de
   listes sans header propre. Inclut la logique d'onglet auto-sélectionné (voir décision n°2).
5. **`TodosWidget`** — repositionné en bande pleine largeur, header corrigé (contraste +
   suppression du chevron accordéon), emojis → Lucide, styles unifiés.
6. **Mettre à jour `.claude/docs/design-system.md`** (radius 18px, bg #F2F2F7) et ajouter la
   spec « carte à onglets ».
7. **Vérification** — `npm run lint`, `npm run test`, `npm run doctor`, contrôle visuel en
   `npm run dev`, puis `bash deploy-dev.sh` pour les retours équipe Brest.

---

## Rappel contexte projet

L'app est fonctionnellement complète (phases 1-7). En attente des retours de l'équipe Brest
avant prod. Cette refonte est **cosmétique** — elle ne doit rien changer aux flux de données
(Firestore → hook → store Zustand → composants) ni aux écritures (toujours via `src/services/`
wrappées dans `trackWrite()`).
