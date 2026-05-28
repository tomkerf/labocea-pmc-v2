# Spec — Bloc "Suivi équipe" pour chargés de mission

**Date :** 2026-05-28  
**Statut :** Approuvé

---

## Contexte

Les chargés de mission (Cindy à Brest, rôle `charge_mission`) n'ont pas de vue adaptée à leur rôle dans le dashboard actuel. Ils voient la même chose que les techniciens. L'objectif est de leur donner une visibilité immédiate sur l'état du travail terrain sans avoir à naviguer client par client.

---

## Ce qu'on construit

Une nouvelle section **"Suivi équipe"** dans `DashboardPage`, visible uniquement pour les rôles `charge_mission` et `admin`. Purement en lecture — aucune action depuis le dashboard. Les chargés de mission naviguent vers les fiches pour corriger ou compléter.

---

## Design

### KPIs (4 chiffres)

| Chiffre | Définition |
|---------|-----------|
| Réalisés | Prélèvements avec `status === 'done'` sur le mois en cours (tous techniciens) |
| Incomplets | Prélèvements `done` avec au moins un champ obligatoire vide (voir règle ci-dessous) |
| En retard | Prélèvements `overdue` selon `isSamplingOverdue()` existant |
| Rapports dus | Prélèvements avec `rapportPrevu === true` et `rapportDate === ''` |

### Règle "incomplet"

Un prélèvement `done` est considéré incomplet si **au moins un** des champs suivants est vide :
- `doneDate` — toujours obligatoire
- `doneBy` — toujours obligatoire  
- `nappe` — obligatoire uniquement pour les plans de nature `'Rivière'`, `'Souterraine'`, `'AEP'`

### Liste "Prélèvements incomplets"

- Triée par date de réalisation (plus récente en premier)
- Chaque ligne affiche : nom client · nom site, date réalisée, technicien (initiales), badge avec le champ manquant
- Chaque ligne est un lien `<Link>` vers `/missions/:clientId/plan/:planId`
- Si aucun prélèvement incomplet : section masquée (pas d'état vide affiché)

---

## Architecture

### Nouveau composant

`src/components/dashboard/EquipeSuiviWidget.tsx`

- Props : `clients: Client[]`, `uid: string`, `currentYear: string`
- Calcule les 4 KPIs et la liste des incomplets en interne via `useMemo`
- Retourne `null` si aucun incomplet (widget entier masqué dans ce cas)

### Modification DashboardPage

- Import et rendu conditionnel de `<EquipeSuiviWidget>` si `role === 'charge_mission' || role === 'admin'`
- Placé après les widgets existants, avant la fin de page

### Aucune modification Firestore

Tout est calculé depuis les données `clients` déjà chargées dans `useMissionsStore`. Pas de nouveau listener, pas de nouveau champ.

---

## Ce qui n'est pas dans le scope

- Validation explicite de prélèvements (pas de `validatedBy`/`validatedAt`)
- Actions depuis le dashboard (compléter, marquer, notifier)
- Filtres par technicien dans le widget
- Vue mobile spécifique (le widget suit le layout existant du dashboard)
