# Design — Détection et exclusion des valeurs aberrantes (Estimation volume 24h)

**Date :** 2026-06-29
**Statut :** Validé, prêt pour plan d'implémentation
**Contexte :** Outil `/outils/estimation-volume`. Sur les données terrain (≈15 bilans), la corrélation pluie→volume est faible (R² ≈ 0.11) et le nuage contient des points clairement à l'écart de la droite. L'utilisateur veut pouvoir écarter ces points pour obtenir une estimation plus fiable.

## Objectif

**Améliorer l'estimation affichée** en écartant les points qui faussent la régression, tout en gardant l'utilisateur conscient de l'effet (anti-illusion) et sans vider l'échantillon (garde-fou).

Décisions actées lors du brainstorming :
- Contrôle : **détection automatique + interrupteur** manuel (pas d'exclusion silencieuse).
- Méthode de détection : **résidus de la régression** (seuil 2σ).
- Garde-fou : **plafond ~20 % des points** ET **minimum 5 points restants**.

## 1. Cœur statistique — `src/lib/estimationVolume.ts`

### Algorithme

1. **Passe initiale** : régression moindres carrés sur tous les points valides (logique existante) → `base`, `coef`, résidus, `sResid = sqrt(ssRes / (n-2))`.
2. **Marquage** : un point est candidat aberrant si `|résidu| > 2 × sResid`.
3. **Garde-fou** : trier les candidats du résidu le plus grand au plus petit. Retenir comme exclus seulement jusqu'à respecter **à la fois** :
   - au plus `floor(0.20 × n)` points exclus,
   - au moins 5 points restants (`n - exclus >= 5`).
   Si le nombre de candidats dépasse ce que le plafond autorise → **on n'exclut personne** et on lève le warning `trop_d_aberrants`.
4. **Passe finale** (seulement si `exclureAberrants === true` et garde-fou OK) : recalcul `base`, `coef`, `r2`, fourchette sur les points conservés.

`pointsAberrants` est **toujours calculé** (pour l'affichage), indépendamment de l'interrupteur. L'exclusion du calcul de la droite ne se produit que si `exclureAberrants === true`.

### Changements d'API

Signature :
```ts
estimateVolume(
  bilans: BilanRejet[],
  pluieMm: number,
  options?: { exclureAberrants?: boolean }   // défaut false
): EstimationResult | null
```

`EstimationResult` gagne :
```ts
pointsAberrants: BilanRejet[]   // candidats détectés (toujours renseigné)
nbAberrants: number             // = pointsAberrants.length
r2Brut: number                  // R² sur TOUS les points (comparaison avant/après)
```

`EstimationWarning.type` gagne la valeur `'trop_d_aberrants'`.

Quand `exclureAberrants === false` : `r2 === r2Brut` et le calcul est identique à aujourd'hui (rétro-compatibilité, hors nouveaux champs).

### Cas limites
- `n < 3` → `null` (inchangé).
- `sResid === 0` (alignement parfait) → aucun aberrant.
- Garde-fou dépassé → `pointsAberrants` non vide, mais exclusion ignorée même si interrupteur ON ; warning `trop_d_aberrants` présent.

## 2. UI page — `src/pages/EstimationVolumePage.tsx`

État local `exclureAberrants` (bool, défaut `false`) passé en option à `estimateVolume`.

Encart conditionnel sous « Volume 24h estimé », affiché **uniquement si `nbAberrants > 0`** :

```
┌─────────────────────────────────────────────┐
│ ⚠ 2 valeurs atypiques détectées              │
│ [○ Exclure les valeurs aberrantes      ]     │  ← Switch
│ Avec : R² 0.42  ·  Sans : R² 0.11   (si ON)  │
└─────────────────────────────────────────────┘
```

- Le switch pilote `exclureAberrants`.
- Affichage des **deux R²** : `r2Brut` (sans) et `r2` recalculé (avec), pour rendre l'effet visible.
- Si warning `trop_d_aberrants` : switch **désactivé/grisé**, message « Trop de valeurs atypiques — vérifie tes données plutôt que de les exclure. » Aucune exclusion appliquée.
- Le bandeau « Corrélation faible » existant reflète le R² du **mode actif** (nettoyé si interrupteur ON).

Tokens : réutiliser `COLORS`, `Z_INDEX`. Le switch suit le composant switch existant du design system (à confirmer à l'implémentation, sinon checkbox stylée).

## 3. UI graphe — `src/components/estimation/EstimationChart.tsx`

- Points aberrants rendus **différemment** : cercle creux / gris atténué, distinct des points pleins normaux.
- Interrupteur ON → la droite tracée est la droite **nettoyée** (`base`/`coef` du résultat) ; les points exclus restent visibles mais estompés (jamais supprimés — traçabilité).
- Point bleu « pluie annoncée » inchangé.
- Le chart reçoit la liste des points aberrants (ou un flag par point) en plus des données existantes.

## Tests (`src/lib/__tests__/estimationVolume.test.ts`)

- Détection : jeu avec 1 point manifestement hors droite → `nbAberrants === 1`.
- Exclusion : R² nettoyé > R² brut sur un jeu avec aberrant net.
- Rétro-compat : `exclureAberrants` absent/false → `r2 === r2Brut`, valeurs inchangées vs avant.
- Garde-fou plafond : jeu où > 20 % des points sont hors 2σ → warning `trop_d_aberrants`, aucune exclusion.
- Garde-fou minimum : petit échantillon où l'exclusion descendrait sous 5 points → pas d'exclusion.
- `sResid === 0` → aucun aberrant, pas de division par zéro.

## Hors périmètre (YAGNI)
- Méthodes alternatives (IQR, distance de Cook).
- Sélection manuelle des points au clic.
- Persistance du choix d'exclusion (état local, non sauvegardé).
