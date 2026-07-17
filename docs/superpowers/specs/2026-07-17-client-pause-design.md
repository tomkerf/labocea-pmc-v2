# Mise en pause d'un client — design

## Contexte

Un client dont la mission se termine (ex: Ezide) ne doit plus polluer le planning, la matrice de charge ni les alertes de retard, mais ses données doivent rester consultables et réactivables — pas de suppression.

## Données

- Nouveau champ optionnel `Client.pause?: boolean` dans `src/types/index.ts`.
- Absent ou `false` = client actif (comportement actuel, aucune migration requise).
- `true` = client en pause.

## Bascule pause / réactivation

- Bouton dans `ClientHeader.tsx`, à côté de "Supprimer" : "Mettre en pause" ↔ "Réactiver" selon `client.pause`.
- Écriture via le service client existant (`clientService`), wrappée `trackWrite` comme toute écriture Firestore du projet.
- Style neutre (pas la couleur danger réservée à Supprimer).

## Liste Missions (`MissionsPage.tsx`)

- Nouvelle pilule de filtre à côté de Site / Technicien : **Actifs** (défaut) / **En pause** / **Tous**.
- Persistée en `localStorage` (même pattern que `filterSite` / `filterTech`, clé par `uid`).
- `ClientCard.tsx` affiche un badge "En pause" (gris discret) quand un client en pause est visible (mode En pause / Tous).

## Planning & alertes

- `usePlanningData` et `useDashboardStats` excluent systématiquement les clients `pause === true` — pas d'option pour les réafficher ici.
- Filtrage appliqué au même endroit que le filtre géographique par site existant (`useMemo` sur `clients` en entrée de hook).
- Effet en cascade : absent du planning, de la matrice de charge (`WorkloadMatrixView`), et des compteurs "en retard" du dashboard.

## Hors scope

- Pas de nouvel état (ex: "résilié") — un booléen suffit ; migration vers enum si un vrai second état apparaît un jour.
- Pas de suppression ni d'archivage Firestore : la fiche, les plans et les prélèvements restent inchangés et modifiables.
- Pas de génération/arrêt automatique de prélèvements futurs (aucun processus de ce type n'existe actuellement dans le codebase).

## Tests

- `clientService` : écriture du champ `pause`.
- `usePlanningData` / `useDashboardStats` : clients en pause exclus des résultats.
- Filtre Missions : rendu correct des 3 modes (Actifs / En pause / Tous).
