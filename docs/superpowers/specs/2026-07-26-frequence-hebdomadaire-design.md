# Fréquence hebdomadaire pour les plans de prélèvement — design

> Brainstorming du 26/07/2026. Design approuvé par Tom section par section.
>
> **Amendement du 27/07/2026** : en préparant le plan d'implémentation, vérification faite que
> `defaultDay`/`customDays` (le pattern "override par mois" que la Section UI d'origine disait
> réutiliser) **n'a en réalité aucune UI nulle part dans l'app** — ces champs existent dans le
> modèle et dans `generateSamplings`, mais restent toujours à leurs valeurs par défaut. Le vrai
> mécanisme pour corriger un jour ponctuel est l'édition ligne par ligne après génération
> (`SamplingForm.tsx`). En conséquence, `customWeeklyDays` est retiré du design : un seul
> `defaultWeeklyDay` par plan, et un changement de jour en cours d'année se gère en éditant les
> lignes concernées à la main — exactement comme pour toute autre exception aujourd'hui. Confirmé
> avec Tom. Les sections ci-dessous reflètent déjà cet amendement.

## Contexte et cas d'usage

Certains clients ont une obligation réglementaire de prélèvement chaque semaine (ex. STEP, rejet
industriel), sur un jour fixe (ex. tous les lundis). Le modèle actuel (`FrequenceType`) ne propose
que Mensuel / Bimensuel / Trimestriel / Semestriel / Annuel / Personnalisé — rien en dessous du
mensuel.

Volume attendu : inconnu à ce stade (« je ne sais pas encore »), potentiellement amené à grandir.
Le design doit donc être robuste (pas un simple patch d'affichage), sans pour autant refondre toute
la granularité temporelle de l'app (approche 2 écartée, voir plus bas).

Un même plan peut avoir un **jour de semaine différent selon la période de l'année** (ex. lundi de
janvier à juin, puis mardi à partir de juillet) — confirmé par Tom.

## Approches envisagées

1. **Extension légère (retenue)** — nouveau type de fréquence + génération automatique des ~52
   occurrences/an + adaptation ciblée de la vue planning annuelle. Réutilise tout l'existant
   (type `Sampling` inchangé, génération manuelle via bouton, exports).
2. **Granularité "semaine" dans tout le modèle** — écarté, chantier disproportionné par rapport au
   besoin (volume inconnu, pas justifié).
3. **`Hebdomadaire` = alias de `Personnalisé`** (pas de génération auto) — écarté, viderait la
   fonctionnalité de son intérêt (l'auto-génération annuelle est la valeur ajoutée d'une fréquence).

## Modèle de données

- `FrequenceType` (`src/types/index.ts`) : ajout de `'Hebdomadaire'`.
- `Plan` : un nouveau champ, sur le modèle exact de `defaultDay` (jour du mois) :
  - `defaultWeeklyDay: number` — jour de la semaine, **0 = lundi … 6 = dimanche**, unique pour tout
    le plan. Utilisé uniquement si `frequence === 'Hebdomadaire'`.
- Champ **requis** (pas optionnel), comme `defaultDay`, pour rester cohérent avec le reste du
  modèle `Plan`. Tous les sites de construction d'un `Plan` (`ClientPage.tsx`, `VisiteFormPage.tsx`)
  doivent initialiser `defaultWeeklyDay: 0`. Le compilateur TS pointera les endroits à corriger.
- `Sampling` **ne change pas** : chaque occurrence garde `plannedMonth`/`plannedDay` (date
  concrète), exactement comme pour les autres fréquences. Aucune notion de "semaine" stockée par
  sampling.

## Génération des samplings

Contrairement aux autres fréquences (où mois + jour suffisent, l'année n'intervenant qu'à
l'affichage via `client.annee`), calculer "tous les lundis" **nécessite l'année réelle** — la
correspondance jour-de-semaine / date-du-mois change chaque année.

`generateSamplings` (`src/lib/samplings.ts`) change de signature :

```ts
export function generateSamplings(plan: Plan, year: number): Sampling[]
```

Nouvelle fonction interne, scan jour par jour de l'année, un seul jour de semaine cible pour tout
le plan :

```ts
function generateWeeklySamplings(plan: Plan, year: number): Sampling[] {
  const result: Sampling[] = []
  const end = new Date(year, 11, 31)
  let num = 1
  for (const d = new Date(year, 0, 1); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = (d.getDay() + 6) % 7 // JS: dim=0..sam=6 → lun=0..dim=6
    if (weekday === plan.defaultWeeklyDay) {
      result.push(blankSampling(num++, d.getMonth(), d.getDate()))
    }
  }
  return result
}
```

Si le jour de semaine doit changer en cours d'année (ex. lundi jusqu'en juin puis mardi ensuite),
la technicienne édite à la main les lignes concernées après génération via `SamplingForm.tsx`
(`plannedMonth`/`plannedDay` par ligne) — exactement le mécanisme déjà utilisé pour toute exception
sur les autres fréquences.

Branchée dans `generateSamplings` : `if (plan.frequence === 'Hebdomadaire') return generateWeeklySamplings(plan, year)`.

Deux appels à mettre à jour pour le nouveau paramètre `year` :
- `usePlanActions.ts:116` (`generateSamplingsForPlan`) — passer `Number(client.annee)`.
- Tests dans `samplings.test.ts`.

Les autres fréquences ignorent ce paramètre (comportement inchangé).

## UI de configuration

- `PlanConfigSection.tsx` : `'Hebdomadaire'` ajouté au tableau `FREQUENCES` (ligne 10) du
  `<select>`. Même ajout dans `demandesConfig.ts` (liste dupliquée, déjà divergente — pas
  d'unification dans ce chantier, juste éviter d'aggraver l'écart).
- `PlanConfigSection.tsx` : quand `frequence === 'Hebdomadaire'`, un nouveau `<select>` "Jour de la
  semaine" (Lundi…Dimanche) apparaît dans la configuration du plan et édite `defaultWeeklyDay` —
  même style que les autres champs de `PlanConfigSection` (`PlanField` + `field-input`). Un seul
  jour pour tout le plan ; pas d'override par mois (cf. amendement en tête de document).

## Affichage planning annuel

Décidé via compagnon visuel (3 options comparées : badge de synthèse, mini-cluster de pastilles,
mini barre de progression — badge retenu).

Dans `YearMatrixView`/`YearMatrixPlanRow`, la case du mois pour un plan `Hebdomadaire` passe en
mode badge de synthèse : `"4/4"` (fait/prévu), coloré selon la conformité (vert si tout fait,
orange/rouge sinon) — remplace les 1-2 pastilles individuelles utilisées pour les autres
fréquences. Un clic ouvre la modale de drill-down mensuel **déjà existante** (ajoutée session 191,
`IssueListModal` mode `'month'`), filtrée sur ce plan, qui liste les occurrences individuelles du
mois.

Pourquoi ce choix plutôt que les alternatives : la modale de drill-down existe déjà, donc on
réutilise l'infra plutôt que d'inventer une représentation dense (mini-cluster) qui devient
illisible sur les mois à 5 occurrences, ou une barre de progression qui perd l'info "en retard vs
pas encore dû" que donne la couleur du badge.

`YearMatrixPlanRow.tsx` gagne une branche `isHebdomadaire` (même esprit que la branche
`isBimensuel` existante). Aucune autre fréquence n'est affectée.

## Tests

- `samplings.test.ts` : nouveau `describe('generateSamplings — Hebdomadaire')` :
  - jour choisi sur toute l'année (nombre d'occurrences correct — 52 ou 53 selon l'année et le
    jour choisi)
  - comportement aux bornes (1er janvier / 31 décembre selon jour de la semaine choisi)
- Pas de nouveau test dédié à `YearMatrixView` au-delà de l'existant (aucun test actuel sur ce
  composant d'après l'exploration initiale — à confirmer en implémentant).

## Hors périmètre / non-régression

- Exports (`exportExcel.ts`, `exportPlanningPdf.ts`, `exportClientHtml.ts`, `reportHtml.ts`) :
  affichent uniquement le libellé `frequence` en texte — `'Hebdomadaire'` s'affiche automatiquement,
  aucun changement de code nécessaire.
- `EquipeSuiviWidget.tsx`, `WelcomeModal.tsx` : non touchés (déjà hors périmètre du chantier
  dashboard précédent, cf. `docs/dashboard-refonte-correctifs.md`).
- Vues Planning jour/semaine/mois (`DayView`, `WeekView`, `MonthView`) : affichent déjà les
  samplings individuels par date — un plan hebdomadaire y apparaît nativement sans changement.
  Seule la vue annuelle groupée par mois posait un problème de représentation.
- Unification des listes `FREQUENCES` dupliquées (`PlanConfigSection.tsx` vs `demandesConfig.ts`) :
  pas traitée ici, dette déjà existante avant ce chantier.
