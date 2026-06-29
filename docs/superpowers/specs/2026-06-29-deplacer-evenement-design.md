# Design — Décaler un événement dans le temps

**Date :** 2026-06-29
**Statut :** Validé, prêt pour implémentation
**Contexte :** Le popover d'un événement de planning (collection `evenements` : rappels, réunions, congés…) n'offre aujourd'hui que « Supprimer l'événement ». Il n'y a aucun moyen de décaler un événement à une autre date sans le supprimer et le recréer. Les prélèvements, eux, ont déjà un « Déplacer à une autre date ». On veut la même possibilité pour les événements.

## Objectif

Ajouter une action « Déplacer à une autre date » dans le popover d'un événement, qui change sa date (et décale `dateFin` pour préserver la durée). **Phase 1 : bouton dans le popover.** Le glisser-déposer de la pastille est souhaité mais reporté à plus tard (hors périmètre ici).

Décisions actées :
- **Interaction** : bouton dans le popover (réutilise le sélecteur de date existant). Drag-and-drop = plus tard.
- **Durée** : préservée — un événement multi-jours est décalé en bloc (`dateFin` suit le même delta).
- **Permission** : tout utilisateur connecté peut déplacer (la suppression reste admin-only).
- **Exclusion** : pas de déplacement pour les événements météo (`type === 'meteo'`, gérés par toggle).

## 1. Service — `src/services/evenementService.ts`

Ajout d'un vrai update (préserve `id`/`createdAt`/`createdBy`, contrairement à delete+recreate) :

```ts
export async function updateEvenementDate(
  id: string,
  date: string,
  dateFin?: string,
): Promise<void> {
  await trackWrite(updateDoc(doc(db, COLLECTIONS.EVENEMENTS, id), {
    date,
    dateFin: dateFin || null,
  }))
}
```

## 2. Handler — `src/hooks/usePlanningActions.ts` (+ `DashboardPage.tsx`)

Nouveau `handleMoveEvenement(event, newDate)` :
- Récupère `event.evenementData` (`date`, `dateFin`).
- Calcule le delta en jours entre l'ancienne `date` et `newDate`.
- Si `dateFin` existe, le décale du même delta ; sinon `undefined`.
- Appelle `updateEvenementDate(id, newDate, newDateFin)`.
- `try/catch` + `addToast('error', …)` comme les autres handlers (pas de garde `clientId/planId/samplingId`, qui sont propres aux prélèvements).

Le calcul de delta réutilise les utilitaires de date existants (`toISO`, parsing `+ 'T12:00:00'` comme ailleurs dans le hook) pour éviter les pièges de fuseau.

`DashboardPage.tsx` câble le même handler (il instancie déjà `onMove`/`onDelete` localement).

## 3. UI — `EventDetailModal.tsx` + `EventDetailMovePanel.tsx`

- `EventDetailMovePanel` gagne un prop `showReason?: boolean` (défaut `true`). Les prélèvements gardent le champ motif (historique de report) ; les événements le masquent.
- Nouvelle prop modal `onMoveEvenement?: (event, newDate) => Promise<void>`.
- Le modal réutilise le panneau `moving` :
  - prélèvement → `handleMove` (avec motif), comportement inchangé.
  - événement → nouvelle branche `handleMoveEvenement` (sans motif).
- Nouveau bouton « Déplacer à une autre date » affiché si `isEvt && event.evenementData?.type !== 'meteo'` (aucune restriction de rôle).
- `PlanningModals.tsx` passe `onMoveEvenement={handleMoveEvenement}`.

## Tests

`usePlanningActions` n'a pas de tests dédiés actuellement ; on ajoute si une lib pure est extractible. Le calcul de delta de dates (préservation de durée) est la seule logique testable : si on l'isole dans une petite fonction pure (`shiftDateFin(date, dateFin, newDate)`), on la teste (single-day → undefined ; multi-jours → dateFin décalée du bon nombre de jours ; passage de mois/année).

## Vérification end-to-end (staging)
1. Créer un événement (rappel) un jour donné, ouvrir son popover → bouton « Déplacer à une autre date » présent, pas de champ motif.
2. Choisir une nouvelle date → l'événement apparaît au nouveau jour, disparaît de l'ancien.
3. Événement multi-jours (congés) → la durée est conservée après déplacement.
4. Événement météo → pas de bouton déplacer.
5. Prélèvement → « Déplacer » inchangé, motif toujours présent.

## Hors périmètre (YAGNI)
- Glisser-déposer de la pastille (phase 2).
- Modification de la durée / heure depuis ce panneau (seulement décalage en bloc).
