# Spec — Estimation du volume 24h sur point de rejet (temps de pluie)

**Date :** 2026-06-28
**Statut :** Validé, prêt pour plan d'implémentation
**Module :** Outils (à côté de l'Asservissement)

---

## 1. Problème & objectif

Lors de la préparation d'un **bilan 24h temps de pluie**, l'équipe a du mal à estimer le **volume total qui passera sur le point de rejet**. Or ce volume (`Rejet 24h`) est l'entrée qui pilote tout le calcul d'asservissement de l'échantillonneur (volume de prise, nombre de flacons). Une mauvaise estimation → échantillonneur saturé ou flacons sous-remplis.

**Objectif :** fournir un outil qui, à partir de l'historique des bilans passés d'un point de rejet (volume mesuré ↔ pluviométrie 24h), **estime le volume attendu** pour une pluviométrie donnée, avec une fourchette de confiance, puis permet de l'injecter dans la page Asservissement existante.

**Périmètre (Option A retenue) :** l'outil s'arrête à l'estimation du volume. Le réglage de l'échantillonneur reste géré par la page Asservissement existante, qui reçoit le volume estimé.

**Non-objectifs (YAGNI) :**
- Pas d'IA / modèle boîte noire — régression linéaire explicable uniquement.
- Pas de calcul des paramètres d'asservissement ici (déjà couvert par `AsservissementPage`).
- Pas de prévision météo intégrée : l'utilisateur saisit lui-même la pluie attendue.
- Pas de nouvelle dépendance (graphe fait main en SVG).

---

## 2. Données disponibles (contexte métier)

- Des **dizaines de points de rejet** distincts.
- Environ **10 bilans 24h temps de pluie passés** exploitables par point.
- Pour chaque bilan passé, l'utilisateur dispose (depuis ses rapports réseau + pluviomètres installés) :
  - le **volume total 24h** réellement passé (m³),
  - la **pluviométrie 24h** de l'épisode (mm).
- Ces données ne sont **pas encore dans l'app** → un **import CSV** est nécessaire pour amorcer l'historique.

---

## 3. Architecture

Respecte le flux existant : `Firestore (onSnapshot) → hook → store Zustand → composants`, écritures via service wrappé `trackWrite()`.

### 3.1 Modèle de données — Firestore

Nouvelle collection, clé ajoutée à `COLLECTIONS` (`src/lib/constants.ts`) :

```ts
POINTS_REJET: 'points-rejet',
```

Document :

```
points-rejet/{id}
  nom: string                 // ex. "STEP Quimper - rejet principal"
  code?: string               // code interne / réseau (optionnel)
  bilans: BilanRejet[]        // ~10 entrées, tableau (pas de sous-collection)
  createdAt: Timestamp
  updatedAt: Timestamp
```

Type (dans `src/types/index.ts`) :

```ts
export interface BilanRejet {
  date: string      // 'YYYY-MM-DD'
  pluieMm: number   // pluviométrie 24h, mm
  volumeM3: number  // volume total 24h mesuré, m³
}

export interface PointRejet {
  id: string
  nom: string
  code?: string
  bilans: BilanRejet[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Décision :** tableau `bilans` embarqué plutôt que sous-collection. ~10 entrées par document = volume négligeable, lecture/écriture simplifiées. Si un point dépassait ~100 bilans un jour, on migrerait (non prévu).

### 3.2 Couches

| Couche | Fichier | Rôle |
|--------|---------|------|
| Service | `src/services/pointsRejetService.ts` | écritures Firestore (create/update point, add/edit/delete bilan, import CSV en batch), chaque écriture wrappée `trackWrite()` |
| Hook | `src/hooks/usePointsRejet.ts` | abonnement `onSnapshot` sur `points-rejet`, écrit dans le store |
| Store | `src/stores/pointsRejetStore.ts` | état mémoire + sélecteurs nommés (`selectPointsRejet`, `selectPointRejetById`) |
| Lib | `src/lib/estimationVolume.ts` | moteur de régression (pur, testé) |
| Lib | `src/lib/parseBilansCsv.ts` | parseur CSV (pur, testé) |
| Page | `src/pages/EstimationVolumePage.tsx` | page lazy, route `/outils/estimation-volume` |
| Composants | `src/components/estimation/` | sous-composants de la page |

Le hook `usePointsRejet` est branché au même endroit que les autres abonnements globaux (suivre le pattern des hooks existants type `useEquipements`).

---

## 4. Moteur d'estimation — `src/lib/estimationVolume.ts`

Fonction pure, sans I/O, entièrement testable.

```ts
export interface EstimationResult {
  volumeEstime: number       // m³
  base: number               // ordonnée à l'origine = volume "temps sec" 24h
  coef: number               // m³ par mm de pluie
  r2: number                 // qualité d'ajustement [0..1]
  fourchetteBasse: number    // borne basse intervalle de prédiction
  fourchetteHaute: number    // borne haute
  nbPoints: number
  warnings: EstimationWarning[]
}

export type EstimationWarning =
  | { type: 'peu_de_points' }       // < 3 bilans : régression non fiable
  | { type: 'correlation_faible' }  // r2 < seuil (ex. 0.5)
  | { type: 'extrapolation' }       // pluieMm hors [min, max] historique

export function estimateVolume(bilans: BilanRejet[], pluieMm: number): EstimationResult | null
```

### 4.1 Calcul

- Régression linéaire **moindres carrés** sur les couples `(pluieMm, volumeM3)` : `volume = base + coef × pluieMm`.
- `r2` = coefficient de détermination.
- **Fourchette** = intervalle de prédiction simplifié : `volumeEstime ± t × s_résidus`, où `s_résidus` est l'écart-type des résidus. On peut utiliser un facteur `t` fixe (ex. ≈ 2, ~95 %) pour rester simple et lisible, sans table de Student. Documenté comme approximation.

### 4.2 Garde-fous (évite d'afficher de faux chiffres rassurants)

- **< 3 bilans** → retourne `null` côté régression ; la page affiche à la place les bilans passés **les plus proches en pluviométrie** (mode dégradé, voir §5.3).
- **r2 < 0.5** → warning `correlation_faible`, bandeau « corrélation faible, estimation peu fiable ».
- **pluieMm hors de l'intervalle historique** → warning `extrapolation`, bandeau « extrapolation au-delà des bilans connus ».

### 4.3 Tests (Vitest)

- cas nominal (corrélation forte) → volume et coef attendus, r2 élevé ;
- 2 points → `null` + chemin mode dégradé ;
- pluie au-delà du max historique → warning extrapolation ;
- nuage dispersé → r2 faible + warning ;
- valeurs aberrantes / volumes nuls → comportement défini (pas de crash, NaN évités).

---

## 5. Interface — `EstimationVolumePage`

Page lazy, route `/outils/estimation-volume`, entrée ajoutée dans la sidebar / `PlusPage` à côté de l'Asservissement. Style aligné sur `AsservissementPage` (header sticky, cartes `BG_SECONDARY`, tokens `COLORS`, composant `Stepper` réutilisé).

### 5.1 Bloc estimation (vue principale)

1. **Sélecteur de point de rejet** (liste depuis le store).
2. **Saisie de la pluie attendue** (mm sur 24h) — réutilise `Stepper` de l'asservissement pour la cohérence.
3. **Résultat :**
   - volume estimé en grand (ex. « ~1 200 m³ »),
   - fourchette (« entre 950 et 1 450 m³ »),
   - bandeaux de warning le cas échéant (couleurs `COLORS.WARNING` / `COLORS.DANGER`).
4. **Nuage de points SVG** (fait main, pas de dépendance) :
   - axe X = pluie (mm), axe Y = volume (m³),
   - points = bilans historiques,
   - droite de régression,
   - point estimé surligné (couleur accent).
5. **Bouton « Utiliser dans l'asservissement »** → navigation `/outils/asservissement?v24h=<volumeEstimeArrondi>`.

### 5.2 Bloc gestion des données

- Ajouter / éditer / supprimer un **point de rejet** (nom, code).
- Ajouter / éditer / supprimer un **bilan passé** d'un point (`date`, `pluieMm`, `volumeM3`).
- Suppressions protégées par double-confirmation (pattern `useReducer` existant dans l'app) ; respect des rôles (lecture pour tous, écriture/suppression selon le contrôle d'accès en vigueur dans l'app).

### 5.3 Mode dégradé (< 3 bilans)

Au lieu d'une régression, afficher les **bilans passés triés par proximité de pluviométrie** avec la pluie saisie, accompagnés d'un message « pas assez d'historique pour une estimation fiable — voici les bilans les plus proches ».

### 5.4 Import CSV

- **Format attendu :** `point,date,pluie_mm,volume_m3`
  - `point` : nom du point de rejet (rapproché par nom ; créé s'il n'existe pas — upsert).
  - `date` : `YYYY-MM-DD`.
  - `pluie_mm`, `volume_m3` : nombres (séparateur décimal `.`).
  - Séparateur de colonnes : `,` (point-virgule `;` toléré, détecté automatiquement).
- **Parseur** `src/lib/parseBilansCsv.ts` (pur, testé) : retourne lignes valides + liste d'erreurs (n° de ligne, motif).
- **Aperçu obligatoire avant validation** : tableau des lignes parsées, erreurs surlignées, comptes (« 47 bilans sur 8 points, 2 lignes ignorées »). L'utilisateur confirme avant écriture.
- **Écriture** : upsert des points (par nom) + ajout des bilans, en batch via le service (`trackWrite`).
- **Idempotence raisonnable** : un bilan déjà présent (même point + même `date`) n'est pas dupliqué (remplacé ou ignoré — comportement à confirmer au plan ; défaut : ignoré).

### 5.5 Tests parseur CSV (Vitest)

- CSV valide multi-points → structure attendue ;
- en-tête manquant / colonnes en désordre → erreur explicite ;
- nombres mal formés, dates invalides → lignes en erreur listées, pas de crash ;
- séparateur `;` → détecté ;
- lignes vides / espaces → ignorées proprement.

---

## 6. Branchement sur l'Asservissement

`AsservissementPage` (`src/pages/AsservissementPage.tsx`) lit aujourd'hui un `v24h` initial codé en dur (`'100'`). **Seule modification de l'existant :** initialiser `v24h` depuis le query param `?v24h=` s'il est présent, sinon conserver `'100'`.

```ts
// initialCalcState devient calculé depuis le query param (useSearchParams)
const v24hParam = searchParams.get('v24h')
// v24h initial = v24hParam ?? '100'
```

Aucune autre modification de la page Asservissement. Le reste du calcul (flacon, volume unitaire, mode, taux) est inchangé.

---

## 7. Impacts sur l'existant

| Fichier | Modification |
|---------|--------------|
| `src/lib/constants.ts` | + clé `POINTS_REJET` dans `COLLECTIONS` |
| `src/types/index.ts` | + `BilanRejet`, `PointRejet` |
| `src/App.tsx` | + import lazy `EstimationVolumePage` + route `/outils/estimation-volume` |
| `src/pages/AsservissementPage.tsx` | `v24h` initial lu depuis query param `?v24h=` |
| Sidebar / `PlusPage` | + entrée « Estimation volume » dans Outils |
| Hook global d'abonnements | + branchement `usePointsRejet` |

Nouveaux fichiers : service, hook, store, 2 libs, page + sous-composants `src/components/estimation/`.

---

## 8. Sécurité / règles Firestore

Ajouter les règles pour `points-rejet` (cohérentes avec les autres collections : lecture authentifiée, écriture selon le contrôle de rôle en place). À cadrer avec le chantier « rôles Firestore » en cours (blocage prod connu) — l'outil ne doit pas être déployé en prod avant que ce chantier soit traité.

---

## 9. Critères d'acceptation

1. Je peux importer un CSV `point,date,pluie_mm,volume_m3`, voir un aperçu, et après validation les points + bilans apparaissent dans l'outil.
2. Je sélectionne un point ayant ≥ 3 bilans, je saisis une pluie attendue, j'obtiens un volume estimé + une fourchette + un nuage de points avec droite de régression.
3. Avec une pluie hors plage historique ou une corrélation faible, un bandeau d'avertissement s'affiche.
4. Avec < 3 bilans, l'outil affiche les bilans les plus proches au lieu d'une estimation.
5. Le bouton « Utiliser dans l'asservissement » ouvre la page Asservissement avec le champ Rejet 24h pré-rempli.
6. Les fonctions `estimateVolume` et `parseBilansCsv` sont couvertes par des tests Vitest qui passent.
7. `npm run build` et `npm run test` passent.
