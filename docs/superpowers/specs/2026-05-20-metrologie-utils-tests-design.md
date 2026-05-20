# Design — Tests logique métier métrologie

Date : 2026-05-20  
Statut : approuvé

## Objectif

Extraire la logique métier de `useMetrologieRows` en fonctions pures testables, puis écrire les tests dans le même style que les tests existants (`src/lib/__tests__/`).

## Ce qui change

### 1. Nouveau fichier : `src/lib/metrologieUtils.ts`

Contient les fonctions pures extraites de `useMetrologieRows.ts` :

- **`buildMetroRows(verifications, equipements): MetroRow[]`** — construit et trie la liste combinée (vérifications + équipements sans vérification). Logique actuellement dans le `useMemo` `allRows`.
- **`filterMetroRows(rows, filterStatut): MetroRow[]`** — filtre par statut. Logique actuellement dans le `useMemo` `filtered`.
- **`countLate(rows): number`** — compte les lignes en retard. Logique actuellement dans le `useMemo` `lateCount`.

`calcStatut` est déjà exportée depuis `useMetrologieRows.ts` — elle reste là, pas de déplacement.

### 2. `useMetrologieRows.ts` mis à jour

Les trois `useMemo` appellent les nouvelles fonctions pures au lieu de recalculer inline. Comportement identique, zéro régression.

### 3. Nouveau fichier : `src/lib/__tests__/metrologieUtils.test.ts`

Tests avec factories (même pattern que `dashboardStats.test.ts`).

**`calcStatut` — 4 cas :**
- date vide → `none`
- date passée → `late`
- date dans < 30 jours → `soon`
- date dans > 30 jours → `ok`

**`buildMetroRows` — cas couverts :**
- Ordre de tri : late avant soon avant ok avant none
- Un équipement avec `prochainEtalonnage` et sans vérification → inclus comme row `equipement`
- Un équipement avec vérification existante → non dupliqué
- Un équipement sans `prochainEtalonnage` → exclu

**`filterMetroRows` — cas couverts :**
- `filterStatut` vide → retourne tout
- `filterStatut = 'late'` → retourne seulement les retards
- `filterStatut = 'ok'` → retourne seulement les à jour

**`countLate` — cas couverts :**
- 0 retards
- 2 retards sur 5 lignes

## Ce qui ne change pas

- Le comportement de `useMetrologieRows` (même output, même interface)
- Les autres hooks (hors scope)
- `calcStatut` reste dans `useMetrologieRows.ts`

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `src/lib/metrologieUtils.ts` | Créer |
| `src/lib/__tests__/metrologieUtils.test.ts` | Créer |
| `src/hooks/useMetrologieRows.ts` | Modifier (appel fonctions pures) |
