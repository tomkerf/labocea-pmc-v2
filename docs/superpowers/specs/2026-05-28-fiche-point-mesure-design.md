# Spec — Fiche Point de Mesure dédiée

**Date :** 2026-05-28  
**Statut :** Approuvé  

---

## Contexte

Pour faciliter la préparation des chantiers et conserver une mémoire fiable des points de prélèvement, nous créons une **Fiche Point de Mesure** dédiée accessible à tout moment, indépendamment de la planification d'une mission quotidienne.

Cette fiche centralise toutes les connaissances sur un point : la carte GPS, les contraintes terrain (mises à jour en direct), les photos historiques, les visites préliminaires associées et l'historique des prélèvements.

---

## 1. Routage & Points d'Entrée

### Nouvelle Route
* Raccordée dans `src/App.tsx` : `/missions/:clientId/plan/:planId/fiche`
* Pointée vers une nouvelle page : `src/pages/PointMesureFichePage.tsx`

### Points d'Accès
1. **Fiche Plan de Prélèvement (`src/pages/PlanPage.tsx`)** :
   - Ajout d'un bouton d'action secondaire Apple-style dans l'en-tête : *"Fiche du point"* ou *"Mémoire du point"*.
2. **Fiche Client (`src/components/client/ClientPlans.tsx`)** :
   - Ajout d'une icône descriptive ou d'un lien à côté du nom de chaque plan de prélèvement.

---

## 2. Intégration des Données & Mappings

La page exploite deux hooks de chargement de données existants :
1. **`useClientData(clientId)`** : Pour charger le client, identifier le plan de prélèvement (`planId`), récupérer ses métadonnées et son historique de prélèvements (`plan.samplings`).
2. **`useVisites(clientId)`** : Pour charger l'ensemble des visites préliminaires du client.

### Filtrage des Visites Préliminaires
Pour identifier les comptes-rendus de visites préliminaires qui concernent spécifiquement ce point de mesure, nous filtrons la sous-collection `points` des visites par correspondance exacte de nom (insensible à la casse et aux espaces superflus) :
```typescript
const matchingPointVisits = visites.flatMap(v => 
  (v.points || [])
    .filter(p => p.nom.trim().toLowerCase() === plan.nom.trim().toLowerCase())
    .map(p => ({
      visitId: v.id,
      date: v.date,
      technicienNom: v.technicienNom,
      ...p
    }))
)
```

### Agrégation de la Galerie Photos
Nous extrayons et fusionnons toutes les images associées au point de prélèvement :
* Les photos prises lors des **visites préliminaires** spécifiques à ce point (`matchingPointVisits.flatMap(pv => pv.photos || [])`).
* Les photos prises par les préleveurs lors des **campagnes passées** (`plan.samplings.flatMap(s => s.photos || [])`).

---

## 3. Structure & Rendu UI (Style Apple)

### A. En-tête & Carte
* Bouton retour vers la fiche plan de prélèvement.
* Titre principal : Nom du client · Nom du site.
* Iframe Google Maps interactive basée sur les coordonnées GPS du plan (`plan.lat`, `plan.lng`).

### B. Mémoire Terrain éditables
* Affichage des contraintes d'accès (`plan.contraintesParticulieres`).
* Cette zone est un **textarea éditable** en direct : toute modification met à jour le champ sur l'objet plan du client et déclenche la sauvegarde automatique via `triggerSave` (debounce ou enregistrement au floutage / onBlur).

### C. Historique des Prélèvements
* Liste des prélèvements triés par date décroissante (`status === 'done'`).
* Chaque ligne affiche : Date de réalisation, technicien référent, commentaire de prélèvement et photos associées si présentes.
