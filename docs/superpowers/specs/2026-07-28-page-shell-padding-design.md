# Harmonisation du padding et de la largeur des pages

## Contexte

Audit des 28 pages de `src/pages/` : le padding racine varie sans logique apparente (`p-6`, `px-4 py-6`, `px-4 py-8`, `px-6 py-5`, `p-4 sm:p-6`), le `mx-auto` est appliqué de façon incohérente même entre pages de largeur identique, deux pages n'ont aucune contrainte de largeur (`MissionsPage`, `InfosPage`), et les pages à header sticky (`AsservissementPage`, `EstimationVolumePage`) gèrent leur padding en deux temps non alignés avec le reste.

## Décisions validées avec Tom

1. **Centrage** : toujours `mx-auto` — le contenu flotte au centre de l'écran, cohérent avec le rail de sidebar repliable.
2. **3 paliers de largeur** (au lieu des 6 valeurs actuelles `lg/xl/2xl/4xl/5xl/6xl`) :
   - **Étroit** `max-w-2xl` (672px) — fiches et formulaires à un seul enregistrement
   - **Moyen** `max-w-4xl` (896px) — listes éditées / contenu éditorial
   - **Large** pas de `max-w` (pleine largeur) — vues denses (tableaux, kanban, matrices)
3. **Padding standard** : `px-4 py-6 md:px-8` partout (précédent déjà en place sur `ActusPage.tsx`, mobile-first, un seul rythme).

## Cas particuliers conservés (ne pas normaliser)

- **`pb-*` supplémentaire lié à une barre d'action fixe mobile** : ex. `MissionDetailPage.tsx` (`pb-48 md:pb-32`) compense `MissionDetailActions.tsx` (`fixed ... md:hidden`). Ces valeurs restent — elles s'ajoutent au shell standard, ne le remplacent pas. Vérifier au cas par cas avant de toucher un `pb-*` inhabituel.
- **Headers sticky** (`AsservissementPage`, `EstimationVolumePage`, `InfosPage`) : gardent leur propre padding compact (`px-4 py-3` / `px-4 pt-4 pb-3`) — seul le conteneur de contenu en dessous adopte le shell standard.
- **Pages hors périmètre** : `LoginPage` (écran d'auth plein écran, pas un contenu de page standard), `ChatPage` (layout sidebar+thread propre au module), `PlanningPage` (délègue déjà tout le padding à ses sous-vues), `DashboardPage` (déjà `max-w-6xl`, hors des 3 paliers car c'est la page d'accueil — laissée telle quelle).

## Répartition des pages par palier

**Étroit (`max-w-2xl`)** : ComptePage, EquipementPage, MaintenancePage, VerificationPage, PlanPage, VisiteFormPage, ClientPage, MissionDetailPage *(actuellement `max-w-lg`, remonté à 2xl)*, PointMesureFichePage *(idem)*, TourneePage *(actuellement `max-w-xl`)*, AdminPage, PlusPage *(actuellement `max-w-lg`)*, AsservissementPage, EstimationVolumePage

**Moyen (`max-w-4xl`)** : ActusPage *(déjà conforme)*, RapportsPage, TodosPage *(actuellement `2xl`)*, AidePage *(actuellement `6xl`)*, TuyauxPage *(actuellement `5xl`)*

**Large (pleine largeur)** : MissionsPage, MaterielPage *(actuellement `2xl`, listes de cartes — passe en pleine largeur)*, MetrologiePage *(idem)*, MaintenancesPage *(idem)*, InfosPage, PilotagePage, DemandesPage

## Implémentation

Remplacement mécanique du conteneur racine de chaque page (className) selon le palier assigné, en conservant tout `pb-*` spécifique identifié ci-dessus. Pas de nouveau composant : simple normalisation de classes Tailwind existantes, page par page.

## Tests

Aucun test automatisé dédié (changement CSS pur, pas de logique). Vérification : `npx tsc -b` (pas d'impact TS), puis contrôle visuel sur staging d'un échantillon des 3 paliers (une fiche, une liste éditoriale, une vue dense) en desktop et mobile.
