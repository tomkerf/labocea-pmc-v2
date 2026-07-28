# Vue annuelle — mode plein écran

## Contexte

`YearMatrixView.tsx` (matrice annuelle des plans de prélèvement) est affichée inline dans deux endroits : l'onglet "Année" du Planning (`PlanningViewRenderer.tsx`) et `PilotagePage.tsx`. Dans les deux cas, elle est contrainte par le layout habituel de l'app (`AppLayout.tsx` : sidebar desktop toujours visible + bottom tab bar sur mobile), ce qui réduit l'espace horizontal disponible pour une matrice dense.

## Objectif

Permettre d'agrandir la vue annuelle en superposition plein écran (masquant sidebar/bottom tab bar), sans navigation vers une nouvelle route ni changement de layout global.

## Design retenu

### État

Nouvel état local `isFullscreen: boolean` dans `YearMatrixView.tsx` (`useState(false)`). Propre au composant — aucune prop, aucun store, aucune remontée vers les composants parents. Se réinitialise à chaque montage (pas de persistance entre changements d'onglet Planning ou navigation).

### Déclenchement

Un bouton icône ajouté dans la barre d'outils existante du composant (ligne ~131, `<div className="shrink-0 px-5 py-3 ... flex flex-wrap items-center gap-3 ...">`, à côté des badges "Fait"/"En retard" déjà présents) :
- Icône `Maximize2` (lucide-react) quand `isFullscreen === false`, libellé/aria-label "Plein écran"
- Icône `Minimize2` quand `isFullscreen === true`, libellé/aria-label "Quitter le plein écran"
- Au clic : `setIsFullscreen(v => !v)`

### Rendu

Le conteneur racine du composant (ligne 127, `<div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6">`) change de classes conditionnellement :

- **Normal** (`isFullscreen === false`) : classes actuelles inchangées.
- **Plein écran** (`isFullscreen === true`) : `fixed inset-0 z-50 p-4 md:p-6` avec `background: var(--color-bg-primary)` — recouvre sidebar et bottom tab bar sans les toucher (ni l'un ni l'autre n'a de z-index explicite, donc un élément `position: fixed` avec `z-50` — la valeur `Z_INDEX.MODAL` de `src/lib/constants.ts` — passe naturellement au-dessus).

Le contenu interne (toolbar, badges, grille de la matrice) reste strictement identique dans les deux modes — seul le conteneur racine change de position/dimensions.

### Sortie

Deux mécanismes, cohérents avec le pattern déjà utilisé dans `BaseModal.tsx` :
1. Clic sur le bouton (devenu `Minimize2`)
2. Touche `Échap` — `useEffect` avec listener `keydown` sur `window`, actif uniquement quand `isFullscreen === true`, appelle `setIsFullscreen(false)`

### Portée

Le bouton et la logique vivent entièrement dans `YearMatrixView.tsx`. Aucune modification de `PlanningViewRenderer.tsx` ni `PilotagePage.tsx` : la fonctionnalité est donc automatiquement disponible dans les deux contextes d'utilisation existants.

## Hors périmètre

- Pas d'utilisation de la Fullscreen API navigateur (`element.requestFullscreen()`) — overlay in-app uniquement, cf. décision utilisateur (fiabilité cross-navigateur/mobile, pas de permission requise).
- Pas de persistance de l'état plein écran entre montages/démontages du composant.
- Pas de changement du contenu ou du comportement interne de la matrice (filtres, drill-down mensuel, etc.) — uniquement le conteneur.

## Tests

`YearMatrixView.tsx` n'a actuellement aucun fichier de test. Créer `src/components/planning/__tests__/YearMatrixView.test.tsx` avec une couverture minimale ciblée sur le nouveau comportement :
- Le bouton "Plein écran" (aria-label) est présent au rendu initial.
- Un clic sur le bouton fait apparaître l'aria-label "Quitter le plein écran" (bascule de l'état).
- La touche `Échap`, une fois en plein écran, revient à l'aria-label "Plein écran".
- La touche `Échap` n'a aucun effet quand le mode plein écran n'est pas actif (pas d'erreur, pas de changement d'état).
