# Spotlight (Cmd+K) — design

## Contexte

Naviguer vers un client ou un point de prélèvement précis oblige à passer par Missions → recherche/filtre → clic. Objectif : une recherche globale type "Spotlight" (Cmd/Ctrl+K), qui saute directement à la fiche client ou au point de prélèvement recherché, sans repasser par les menus.

## Périmètre v1

- **Cherchable** : clients/missions, points de prélèvement (plans imbriqués dans un client).
- **Hors scope v1** : techniciens (pas de fiche dédiée à ouvrir), pages/outils de l'app (remplacerait la nav du menu — pas nécessaire tout de suite), historique/derniers consultés (état vide = rien tant qu'on n'a pas tapé).

## Déclenchement

- Raccourci `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux), capté globalement.
- Icône loupe dans la sidebar (`AppLayout`), pour l'usage tactile/terrain où le raccourci clavier n'est pas naturel.

## Composants et architecture

- `src/stores/spotlightStore.ts` — Zustand minimal : `{ isOpen: boolean; open: () => void; close: () => void }`. Le texte de recherche (`query`) reste un state local du composant, pas besoin d'être global.
- `src/hooks/useGlobalHotkey.ts` — hook générique `useGlobalHotkey(combo, callback)` pour capter `mod+k` (mod = Cmd sur Mac, Ctrl sinon, détection `metaKey || ctrlKey`). Ignore le raccourci si un champ de saisie a déjà le focus, sauf si c'est justement Cmd+K (dans ce cas `preventDefault()` systématique pour éviter les conflits navigateur). Posé une seule fois dans `AppLayout.tsx` — premier raccourci clavier global de l'app, donc isolé dans un hook réutilisable plutôt qu'inline.
- `src/hooks/useSpotlightResults.ts` — hook pur `useSpotlightResults(query: string) → { clients: Client[]; plans: { plan: Plan; client: Client }[] }`. Lit `useMissionsStore` directement, calcul mémoïsé (`useMemo`) sur `query`.
- `src/components/spotlight/SpotlightModal.tsx` — utilise `BaseModal` existant (`hideCloseButton`), le champ de recherche tient lieu de header (pas de `title` classique).

## Matching et données

- Normalisation accents/casse : `normalize(s) = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`, ajoutée comme utilitaire partagé (`src/lib/textUtils.ts`, ou fichier lib existant équivalent si déjà présent) — réutilisable par d'autres recherches du projet.
- **Clients** : match sur `nom`, `segment`, `preleveur`, `numClient` — mêmes champs que le filtre existant de `MissionsPage.tsx:131-136`, réutilise la même règle de matching (substring insensible casse/accents) plutôt que d'en dupliquer une variante.
- **Points de prélèvement** : `client.plans[]` aplatis à la volée dans le hook, match sur `plan.nom` et `plan.siteNom`. Chaque résultat garde une référence à son client parent, nécessaire pour construire l'URL de destination.
- `query` vide → aucun résultat calculé, aucun rendu de liste (pas d'état "derniers consultés" en v1).
- Pas de scoring de pertinence (pas de lib fuzzy-search type Fuse.js) — substring simple suffisant vu le volume de données (quelques centaines de clients/plans en mémoire), évite une dépendance supplémentaire.
- Limite d'affichage : **6 résultats par catégorie maximum**, dans l'ordre d'apparition du store.

## Navigation

- Sélection d'un client → `/missions/{clientId}`.
- Sélection d'un point de prélèvement → `/missions/{clientId}/plan/{planId}`.
- La modale se ferme après navigation.

## Comportement clavier

- `↑` / `↓` : déplace la sélection à travers les deux groupes de résultats (liste unique visuellement, les flèches ignorent les séparateurs de catégorie).
- `Enter` : navigue vers le résultat sélectionné et ferme la modale.
- `Escape` : ferme (déjà géré nativement par `BaseModal`).
- Clic sur un résultat : équivalent à `Enter`.
- Premier résultat de la liste auto-sélectionné dès qu'une frappe produit des résultats.

## Rendu visuel

Modale centrée en haut de l'écran (disposition validée en brainstorm). Champ de recherche en header (icône loupe + input sans label, placeholder "Rechercher un client, un point…"). Résultats groupés sous des titres de catégorie ("CLIENTS", "POINTS DE PRÉLÈVEMENT"). Résultat sélectionné en surbrillance `var(--color-accent-light)`, cohérent avec les listes existantes (ex. `PlanningFilterBar`).

## Cas limites

- Aucun résultat → message "Aucun résultat pour « … »" (pas de liste vide silencieuse).
- Client/plan supprimé pendant que la modale est ouverte : non géré spécifiquement, les stores sont réactifs (`onSnapshot`), la liste se met à jour normalement.
- Icône loupe doit rester accessible en sidebar mobile/tablette réduite (à vérifier avec le composant sidebar existant lors de l'implémentation).

## Hors scope

- Techniciens, pages/outils de l'app, historique de recherche — reportés à une v2 éventuelle si le besoin se confirme à l'usage.
- Fuzzy-matching / scoring de pertinence.
- Raccourcis clavier globaux additionnels au-delà de Cmd+K (le hook `useGlobalHotkey` est générique mais aucun autre raccourci n'est spécifié ici).

## Tests

- `useSpotlightResults` : matching sur `nom`/`segment`/`preleveur`/`numClient` (clients) et `nom`/`siteNom` (plans), insensibilité aux accents/casse, limite de 6 résultats par catégorie, query vide → résultats vides.
- Pas de test E2E navigateur en v1 (hors scope Vitest actuel du projet — pas de projet Playwright pour les pages applicatives, uniquement pour Storybook).
