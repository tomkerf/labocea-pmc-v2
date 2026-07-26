# Récap dans la modale de détail pour un prélèvement déjà traité

Date : 2026-07-26

## Problème

`EventDetailModal.tsx` affiche toujours le même bloc d'actions (Ouvrir la mission, Déplacer, Changer le technicien, Assigner du matériel, Retirer du calendrier) quel que soit le statut du prélèvement (`Sampling`). Pour un prélèvement qui n'est plus à venir — effectué, non effectué, ou en retard — ces actions n'ont plus de sens : l'utilisateur veut voir ce qui s'est passé (checklist, commentaire, motif, photos), pas re-planifier.

Cas déclencheur observé : clic sur le J2 d'un bilan 24h (méthode `Automatique`/`Composite`) alors que le prélèvement a déjà eu lieu.

## Portée

- Concerne uniquement les événements de type prélèvement (`isPrelev`), J1 et J2 des bilans 24h inclus.
- Statuts concernés (bascule vers le récap) : `done`, `non_effectue`, et `overdue` (en retard, même si le champ Firestore `status` est encore `planned`).
- Un prélèvement `planned` et **non** en retard garde le comportement actuel (boutons d'action inchangés).

## Détection

Ajout d'un champ calculé `isPlanned: boolean` sur `PlanningEvent` (`src/lib/planningUtils.ts`), positionné dans `usePlanningData.ts` :

```
isPlanned = !overdue && s.status === 'planned'
```

Le récap s'affiche dans `EventDetailModal.tsx` quand `event.isPrelev && !event.isPlanned`.

## Données du récap

`PlanningEvent` s'enrichit d'un champ `samplingDetail` (optionnel, présent uniquement pour les événements de type prélèvement), peuplé dans `usePlanningData.ts` à partir du `Sampling` déjà chargé en mémoire via `useMissionsStore` (aucun appel Firestore supplémentaire) :

```ts
samplingDetail?: {
  doneDate?: string
  comment?: string
  motif?: string
  checklist?: ChecklistItem[]
  photos?: string[]
  history?: SamplingHistoryEntry[]
}
```

Ce pattern reprend celui déjà utilisé pour `maintenanceData` / `evenementData` / `todoData` sur `PlanningEvent`.

## Composant `EventDetailRecapPanel.tsx`

Nouveau composant, `src/components/planning/EventDetailRecapPanel.tsx`, affiché dans `EventDetailModal.tsx` à la place du bloc de boutons d'action existant (Déplacer / Changer technicien / Assigner du matériel / Retirer) quand `isPrelev && !event.isPlanned`.

Contenu, dans l'ordre :
1. Badge de statut (réutilise `statusLabel`/couleurs déjà calculés — Effectué / Non effectué / En retard)
2. Date et technicien effectifs (`doneDate`, `event.technicien`)
3. Commentaire (`comment`), si présent
4. Motif de non-réalisation (`motif`), si présent — pertinent surtout pour `non_effectue`/`overdue`
5. Checklist (`checklist`) : liste des items avec coche ✓ / croix ✗
6. Photos (`photos`) : grille de vignettes cliquables, ouverture en grand (nouvel onglet ou lightbox simple) au clic
7. Historique (`history`) : liste chronologique des modifications de champs sensibles (qui, quoi, quand, valeur avant/après)

Le bouton **"Ouvrir la mission"** (ou "Voir la mission" selon le libellé existant) reste affiché sous le récap — c'est la seule action conservée, elle permet de naviguer vers la fiche complète pour corriger si besoin.

Aucune section n'est affichée si son champ correspondant est vide (pas de "Commentaire : —" ni de checklist vide affichée).

## Ce qui ne change pas

- Le header de la modale (nom mission, lieu, badge, date, bouton fermer) reste identique.
- Les événements non-prélèvement (maintenance, événement personnel, tâche) gardent leur comportement actuel, inchangé par cette spec.
- Un prélèvement `planned` non en retard garde le comportement actuel (tous les boutons d'action).

## Hors périmètre

- Pas de nouvelle collection Firestore, pas de nouveau champ persisté — uniquement de la restitution de données déjà existantes sur `Sampling`.
- Pas de modification du contenu de la page mission complète (`/missions/{clientId}/plan/{planId}/sampling/{samplingId}`).
- Pas de lightbox avancée (zoom, navigation entre photos) si une solution simple (ouverture en nouvel onglet de l'URL Storage) suffit — à trancher en phase d'implémentation selon ce qui existe déjà ailleurs dans le code pour l'affichage de photos.
