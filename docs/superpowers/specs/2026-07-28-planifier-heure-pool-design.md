# Planification rapide — date plus lisible + heure optionnelle

## Contexte

Dans la modale journalière du Planning (`DayModal.tsx`, onglet "Interventions à planifier"), chaque prélèvement du pool peut être planifié sur une date via un champ `<input type="date">`. Ce champ est étroit, collé au bouton "Confirmer", et donc difficile à lire. Il n'existe par ailleurs aucun moyen d'y renseigner une heure — alors que le modèle de données (`Sampling.plannedTime`) le permet déjà et qu'un champ heure équivalent existe sur la fiche client (`SamplingForm.tsx`, toujours visible, `type="time"`, vide par défaut).

## Objectif

1. Rendre le champ date plus lisible (police plus grande, pleine largeur).
2. Ajouter un champ heure optionnel, toujours visible, cohérent avec le pattern déjà utilisé dans `SamplingForm.tsx`.

## Design retenu

### Disposition (`DayModalPoolTab.tsx`, bloc de validation d'un item du pool)

Les champs passent d'une ligne unique (`date` + bouton côte à côte) à un layout empilé :

```
Planifier le
[            31/07/2026            ]   ← plus grande police, pleine largeur

Heure (optionnel)
[             --:--                ]   ← type="time", vide par défaut

[            Confirmer              ]
```

- Le champ date reste un `<input type="date">` natif (calendrier natif du navigateur/téléphone inchangé), simplement stylé plus grand (`font-size` ~15-16px) et en pleine largeur.
- Le champ heure est un nouvel `<input type="time">` natif, toujours affiché (pas de toggle), vide par défaut.
- Le bouton "Confirmer" passe sur sa propre ligne pleine largeur, sous les deux champs.
- Le message d'erreur jour férié (déjà existant) reste inchangé, sous les champs.

### Données

Aucun changement de schéma : `Sampling.plannedTime?: string` (`"HH:MM"`) existe déjà dans `src/types/index.ts`.

### État local (`DayModalPoolTab.tsx`)

- Nouvel état `poolTime: string`, à côté de `poolDate`.
- À l'ouverture de la validation d'un item (clic sur la ligne dans `PoolItemRow`), `poolTime` est initialisé à `item.sampling.plannedTime ?? ''` (pré-remplissage si l'item avait déjà une heure).
- Pas de réinitialisation particulière à la fermeture — le state pool est de toute façon partagé/écrasé à chaque ouverture d'item, comme `poolDate` aujourd'hui.

### Propagation

La signature `onValidatePool` gagne un 3ᵉ paramètre optionnel `time?: string`, propagé sans changement de logique intermédiaire à travers la chaîne existante :

```
DayModalPoolTab.tsx  (onValidate(item) → onValidatePool(item, poolDate, poolTime || undefined))
  → DayModal.tsx        (prop onValidatePool, type mis à jour)
    → PlanningModals.tsx  (prop handleValidatePool, type mis à jour)
      → usePlanningActions.ts  (handleValidatePool(item, date, time?))
```

Dans `usePlanningActions.ts::handleValidatePool`, le `saveClient` inclut désormais `plannedTime: time || undefined` en plus de `plannedDay`/`plannedMonth` existants.

### Règles de validation

- Aucune heure requise : le champ reste optionnel, à l'image du champ existant dans `SamplingForm.tsx`.
- Aucun impact sur la règle jour férié existante (basée uniquement sur la date).
- Aucune validation de format supplémentaire : le navigateur garantit le format `HH:MM` via `type="time"`.

## Hors périmètre

- Pas de changement sur `SamplingForm.tsx` (déjà conforme).
- Pas de changement sur l'affichage de l'heure planifiée ailleurs dans l'app (déjà géré : `DayView`, exports PDF/Excel, etc. lisent déjà `plannedTime`).
- Pas de notification/rappel liée à l'heure — hors périmètre de cette demande.

## Tests

- Mettre à jour/étendre les tests existants de `usePlanningActions` (`handleValidatePool`) pour couvrir le cas avec et sans heure.
- Pas de nouveau test de rendu nécessaire au-delà de la couverture existante de `DayModalPoolTab` si elle existe déjà (vérifier avant l'implémentation).
