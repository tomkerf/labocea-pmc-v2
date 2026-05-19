# Design — Page Rapports

Date : 2026-05-19  
Statut : approuvé

---

## Contexte et problème

Les prélèvements ont deux champs rapport :
- `rapportPrevu: boolean` — un rapport est attendu pour ce prélèvement
- `rapportDate: string` — utilisé jusqu'ici comme date d'envoi **effectif** (rempli par "Envoyé ✓" dans le widget dashboard)

Ce matin une modification a ajouté une valeur par défaut automatique à +1 mois dans `rapportDate`, cassant la logique du dashboard (qui considère `rapportDate !== ''` comme "déjà envoyé").

Ce design règle le conflit et ajoute la page Rapports.

---

## Modèle de données — changements

### Nouveau champ : `rapportDatePrevue: string`

Ajouté sur `Sampling` dans `src/types/index.ts`.

- Format ISO `YYYY-MM-DD`, vide par défaut
- Rempli automatiquement à `doneDate + 1 mois` quand `rapportPrevu` passe à `true` (ou quand `doneDate` est saisi et `rapportPrevu` est déjà coché)
- Modifiable manuellement depuis la page Rapports ou le SamplingForm

### `rapportDate` — sémantique inchangée

Reste la **date d'envoi effectif**. Vide = non envoyé. Rempli = envoyé ce jour-là. La logique du dashboard widget et de `useDashboardStats` reste identique.

### Correction du bug de ce matin

Le code dans `PlanPage.tsx` qui écrivait dans `rapportDate` doit écrire dans `rapportDatePrevue` à la place.

---

## Navigation

Ajout d'une 6ème entrée dans la sidebar desktop et la tab bar mobile :

```
📋 Missions
🔧 Matériel
📐 Métrologie
🔨 Maintenances
📄 Rapports       ← nouveau
👤 Mon compte
```

Route : `/rapports`

---

## Page `/rapports`

### Structure

Deux sections dans la même page, séparées par un titre de section :

1. **À envoyer** — `rapportPrevu=true` AND `rapportDate=''` AND `status='done'`
2. **Envoyés** — `rapportPrevu=true` AND `rapportDate !== ''`

### Filtre

Bouton toggle en haut à droite : "Mes rapports" / "Toute l'équipe"

- Par défaut : "Mes rapports" (même filtre que le widget dashboard : `s.doneBy === uid` ou `client.preleveur === initiales`)
- Admin (isGeneraliste) : "Toute l'équipe" par défaut
- Le filtre s'applique aux deux sections

### Section "À envoyer"

Carte liste avec une ligne par rapport :

| Champ | Source | Notes |
|-------|--------|-------|
| Client | `client.nom` | |
| Site | `plan.siteNom \|\| plan.nom` | |
| Date intervention | `s.doneDate` | Format DD/MM/YYYY |
| Date envoi prévue | `s.rapportDatePrevue` | Champ date éditable inline |
| Délai | Calculé : `rapportDatePrevue - today` | Badge coloré : vert (>7j), orange (1-7j), rouge (dépassé) |
| Actions | Lien fiche + bouton "Envoyé ✓" | |

Tri par défaut : date envoi prévue croissante (les plus urgents en premier).

Bouton "Envoyé ✓" → remplit `rapportDate` avec la date du jour (même comportement que le widget dashboard).

Lien fiche → navigate vers `/missions/:clientId/plan/:planId` avec `?sampling=:samplingId` pour ouvrir directement le bon panneau.

Si aucun rapport à envoyer : message "✓ Tous les rapports ont été envoyés."

### Section "Envoyés"

Carte liste avec une ligne par rapport, triée par `rapportDate` décroissant (les plus récents en premier).

| Champ | Source |
|-------|--------|
| Client | `client.nom` |
| Site | `plan.siteNom \|\| plan.nom` |
| Date intervention | `s.doneDate` |
| Date envoi effectif | `s.rapportDate` |
| Technicien | Résolu depuis `s.doneBy` → `users` store |

Pas d'action sur les lignes envoyées (lecture seule).

---

## Dashboard widget — ajustements

Le composant `RapportsWidget` et le hook `useDashboardStats` ne changent pas dans leur logique.

Deux petits ajustements :
1. Ajouter un lien "Voir tous les rapports →" en bas du widget qui navigue vers `/rapports`
2. Afficher la `rapportDatePrevue` sur chaque ligne du widget (à la place des "jours depuis intervention", qui devient secondaire)

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/types/index.ts` | Ajouter `rapportDatePrevue?: string` sur `Sampling` |
| `src/pages/PlanPage.tsx` | Corriger le bug : écrire dans `rapportDatePrevue` au lieu de `rapportDate` |
| `src/components/plan/SamplingForm.tsx` | Afficher/éditer `rapportDatePrevue` (label "Date envoi prévue") |
| `src/pages/RapportsPage.tsx` | Nouveau fichier — page principale |
| `src/hooks/useDashboardStats.ts` | Exposer aussi les rapports envoyés pour la page (ou créer `useRapportsData`) |
| `src/components/dashboard/RapportsWidget.tsx` | Ajouter lien "Voir tous", afficher `rapportDatePrevue` |
| `src/components/AppLayout.tsx` | Ajouter entrée nav Rapports |
| `src/components/MobileDrawer.tsx` | Ajouter entrée nav Rapports |
| `src/App.tsx` (ou router) | Ajouter route `/rapports` avec lazy import |

---

## Ce qui n'est PAS dans ce scope

- Export des rapports (PDF/Excel) — hors scope
- Statut "en cours de rédaction" — pas demandé
- Notifications push pour les rapports en retard — hors scope
