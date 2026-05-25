# Mode Tournée du Jour — Spec Design

**Date :** 2026-05-25
**Statut :** Approuvé — prêt pour implémentation

---

## Objectif

Remplacer la navigation en 4 niveaux (Missions → Client → Plan → Prélèvement) par un écran unique optimisé pour une utilisation terrain : debout, en extérieur, avec un téléphone.

---

## Point d'entrée

Bouton **"▶ Démarrer la tournée"** dans le Dashboard, à droite du titre "Planning du jour".

- Icône `Route` (Lucide)
- Couleur accent bleu (`--color-accent`)
- Affiché uniquement si au moins 1 prélèvement de type `sampling` est à faire aujourd'hui (statut `planned` ou `overdue`)
- Navigue vers `/tournee`

---

## Route

`/tournee` — nouvelle route React, accessible uniquement depuis le Dashboard. Non listée dans la Sidebar ni la TabBar.

---

## Composants

### `src/pages/TourneePage.tsx`
Page principale. Orchestre l'état de la tournée.

- Consomme les stores Zustand déjà hydratés (`useMissionsStore`, `useEvenementsStore`, etc.) — pas de nouveau listener, pas de double fetch
- Filtre `jourItems` pour ne garder que `kind === 'sampling'`
- Trie par `plannedTime` croissant (items sans heure en premier)
- Gère un état local `Map<samplingId, 'todo' | 'done' | 'non_effectue'>` initialisé depuis le statut Firestore courant
- Affiche `TourneeFinEcran` automatiquement quand tous les items ont un statut terminal

### `src/components/tournee/TourneeItem.tsx`
Une ligne de site dans la liste.

**Contenu affiché :**
- Heure prévue (`plannedTime`) ou point coloré si absente
- Nom du client (titre)
- Sous-titre : `siteNom · planNom`
- Icône 🌧 si `plan.meteo === 'pluie'`
- Badge statut (À faire / En cours / Réalisé / Non effectué / Urgent)

**Actions :**
- `[✓ Réalisé]` → ouvre `SaisieRapideModal` avec statut `done` pré-sélectionné
- `[✗ Non effectué]` → ouvre `SaisieRapideModal` avec statut `non_effectue` pré-sélectionné
- `[↗ GPS]` → `window.open(https://maps.apple.com/?q=lat,lng)` — affiché uniquement si `lat` et `lng` non vides

**États visuels :**
- `todo` : fond blanc, boutons visibles
- `done` : fond `--color-success-light`, badge vert, boutons masqués
- `non_effectue` : fond `--color-warning-light`, badge orange, boutons masqués

### `src/components/tournee/SaisieRapideModal.tsx`
Modale bottom-sheet (slide-up 300ms, Framer Motion). Champs :

1. **Date réalisée** — `<input type="date">`, pré-remplie à aujourd'hui
2. **Nappe** — `haute / basse / —` — affiché uniquement si `plan.nature === 'Souterraine'`
3. **Commentaire** — `<textarea>`, optionnel
4. **Statut final** — toggle `Réalisé` (défaut) / `Non effectué`
5. **Motif** — champ texte, affiché et requis si statut = `Non effectué`

**À la validation :**
- Appelle `saveClient(...)` via `clientService` (pattern existant)
- Ferme la modale
- L'état local `Map` se met à jour via le re-render déclenché par `onSnapshot`

### `src/components/tournee/TourneeFinEcran.tsx`
Affiché automatiquement quand tous les items sont terminés.

**Contenu :**
- Icône ✓ verte
- Titre "Tournée terminée !"
- Date du jour
- Liste récapitulative : ✓ item réalisé / ✗ item non effectué + motif
- Bouton `[Retour au dashboard]` → `navigate('/')`

---

## En-tête de TourneePage

```
← Retour          Tournée du jour
                  lundi 26 mai · N sites
                  ████████░░  X/N réalisés
```

- Bouton retour → `navigate(-1)`
- Barre de progression linéaire (largeur proportionnelle aux items terminés)
- Couleur barre : `--color-accent`

---

## Données

Les listeners Firestore (`useClientsListener`, etc.) sont déjà actifs depuis `DashboardPage` via les stores Zustand. `TourneePage` lit depuis les mêmes stores — aucun nouveau `onSnapshot`.

La logique de calcul de `jourItems` est réutilisée depuis `useDashboardStats` (ou extraite dans un helper partagé si besoin).

---

## Ce que cette feature n'est pas

- Pas un remplacement des fiches détaillées — raccourci uniquement
- Pas d'optimisation d'itinéraire GPS (hors scope)
- Pas de mode hors-ligne spécifique (le cache Firestore existant suffit)
- Pas d'affichage des événements personnels (rappels, réunions) — prélèvements uniquement

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/pages/TourneePage.tsx` | Créer |
| `src/components/tournee/TourneeItem.tsx` | Créer |
| `src/components/tournee/SaisieRapideModal.tsx` | Créer |
| `src/components/tournee/TourneeFinEcran.tsx` | Créer |
| `src/pages/DashboardPage.tsx` | Modifier — ajouter bouton + import |
| `src/App.tsx` (ou router) | Modifier — ajouter route `/tournee` |
