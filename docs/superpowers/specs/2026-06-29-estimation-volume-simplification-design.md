# Spec — Simplification UX de l'outil Estimation volume

**Date :** 2026-06-29
**Statut :** Validé, prêt pour plan d'implémentation
**Module :** Outils → Estimation volume (`/outils/estimation-volume`)

---

## 1. Problème

L'outil actuel (`EstimationVolumePage`) entasse sur un seul écran : sélection d'un point, création de points, saisie/import de bilans. Pour un nouvel utilisateur c'est déroutant :
- **(A) Concept flou** — l'écran ne dit pas ce qu'il attend ni dans quel ordre ; les champs de saisie sont cryptiques (deux champs « 0 » sans libellé pour pluie/volume).
- **(C) Workflow trop lourd au quotidien** — le résultat d'estimation (le seul intérêt jour de pluie) est noyé dans la gestion de données et n'apparaît jamais clairement quand l'écran est vide.

## 2. Objectif

Séparer franchement **utiliser** (simple, quotidien) de **préparer les données** (rare, ponctuel), et clarifier le vocabulaire. Au quotidien : choisir un point → saisir la pluie annoncée → lire le volume. Rien d'autre.

**Non-objectifs (YAGNI) :**
- Aucun changement du modèle de données (`points-rejet`), du moteur (`estimationVolume.ts`), de l'import (`parseBilansCsv.ts` / `importBilans`) ni du graphe (`EstimationChart`).
- Pas d'assistant de premier lancement (écarté).
- Pas de verrouillage admin de la gestion des données pour l'instant (réservé à une évolution ultérieure ; aujourd'hui accessible à tout utilisateur authentifié).

## 3. Conception

### 3.1 Un écran, deux onglets

`EstimationVolumePage` affiche en haut un sélecteur à deux onglets, dans le style segmenté déjà utilisé dans l'app (cf. toggle « Auto / Manuel » de `AsservissementPage`, ou « Mon activité / Suivi équipe` du dashboard) :

```
[ 📊 Estimer ]   [ ⚙ Données ]
```

- État local `view: 'estimer' | 'donnees'`, défaut `'estimer'`.
- Pas de nouvelle route : un simple toggle dans la page. Le bouton retour du header reste inchangé.

### 3.2 Onglet « Estimer » (par défaut, épuré)

Contenu, dans l'ordre :

1. **Phrase d'explication** (lève le point A), texte tertiaire :
   > « Estime le volume qui passera sur un point de rejet pendant 24h selon la pluie annoncée, à partir de vos bilans passés. »

2. **Si aucun point de rejet n'existe encore** (`pointsRejet.length === 0`) → état vide explicite :
   > « Aucun bilan enregistré pour l'instant. Pour estimer un volume, ajoutez d'abord vos bilans passés. »
   - + bouton **« Aller dans Données → »** qui fait `setView('donnees')`.
   - Ne PAS afficher le sélecteur ni le Stepper dans ce cas.

3. **Si des points existent :**
   - Sélecteur **« Point de rejet »** (le `<select>` actuel, avec un libellé visible au-dessus).
   - Saisie **« Pluie annoncée »** (composant `Stepper` existant, `unit="mm"`, hint « sur 24h »).
   - Carte **résultat** (inchangée vs aujourd'hui) : volume estimé en grand, fourchette, bandeaux de warning (corrélation faible / extrapolation), `EstimationChart`, bouton **« Utiliser dans l'asservissement »**.
   - **Mode dégradé** (< 3 bilans) inchangé : message « pas assez d'historique » + bilans les plus proches (`nearestBilans`).

Toute la logique d'estimation actuelle (calcul `estimateVolume`, navigation `?v24h=`, warnings) est conservée telle quelle, seulement déplacée sous l'onglet.

### 3.3 Onglet « Données »

Reprend la gestion existante, déplacée ici :
- **`PointRejetManager`** (création de point + ajout de bilan + suppression), avec **libellés clairs** :
  - le champ date reçoit un libellé visible « Date du bilan » (au-dessus ou inline) ;
  - les deux champs numériques aujourd'hui à `placeholder="mm"` / `placeholder="m³"` sans libellé visible reçoivent un **libellé visible** : **« Pluie (mm) »** et **« Volume (m³) »** (en plus des `aria-label` déjà présents) ;
  - un mot d'aide court sous le bloc d'ajout : « Un bilan = un épisode pluvieux passé : sa pluviométrie 24h et le volume réellement mesuré. »
- **Import CSV** : aujourd'hui déclenché par l'icône ⬆️ du header. Le déplacer en **bouton visible** dans l'onglet Données (« Importer un CSV »), avec rappel du format `point,date,pluie_mm,volume_m3`. L'icône du header est retirée.

### 3.4 Header

- Le titre « Estimation volume 24h » et le bouton retour restent.
- L'icône d'import ⬆️ du header est retirée (l'import vit désormais dans l'onglet Données). Cela évite un point d'entrée orphelin et simplifie le header.

## 4. Fichiers concernés

| Fichier | Modification |
|---------|--------------|
| `src/pages/EstimationVolumePage.tsx` | Ajout du toggle `view`, séparation Estimer/Données, phrase d'explication, état vide, retrait de l'icône import du header, déplacement de l'ouverture de la modale CSV dans l'onglet Données |
| `src/components/estimation/PointRejetManager.tsx` | Libellés visibles sur les champs (date, Pluie (mm), Volume (m³)) + phrase d'aide ; bouton « Importer un CSV » qui ouvre la modale (callback remonté à la page) |
| `src/components/estimation/BilanImportModal.tsx` | Inchangé ; déclenché depuis l'onglet Données au lieu du header |

Aucun changement dans : `estimationVolume.ts`, `parseBilansCsv.ts`, `pointsRejetService.ts`, `pointsRejetStore.ts`, `usePointsRejet.ts`, `EstimationChart.tsx`, `firestore.rules`, types.

## 5. Tests

- Les tests existants (`estimationVolume`, `parseBilansCsv`) restent verts (logique inchangée).
- Vérification manuelle (staging) — voir §6.

## 6. Critères d'acceptation

1. À l'ouverture, l'onglet **Estimer** est actif et ne montre que : explication + (état vide **ou** sélecteur + pluie + résultat). Aucune zone de création/saisie visible.
2. Quand aucun point n'existe, l'onglet Estimer affiche l'état vide avec un bouton qui mène à l'onglet **Données**.
3. L'onglet **Données** contient la création de points, l'ajout de bilans (champs **étiquetés** Date / Pluie (mm) / Volume (m³)) et l'import CSV (bouton visible + format rappelé).
4. Le calcul d'estimation, la fourchette, les warnings, le graphe et le bouton « Utiliser dans l'asservissement » fonctionnent comme avant.
5. `npm run build` et `npm run test` passent.
