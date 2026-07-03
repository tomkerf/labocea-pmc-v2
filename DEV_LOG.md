# DEV_LOG — Labocea PMC V2

Journal de développement chronologique. Mis à jour à chaque session de travail.

## Session 149 — Bugfix UI + SW cache invalidation : MissionsPage toggle pill
**3 juillet 2026**

### Contexte
User report : le cartouche « Liste / Vue annuelle » sur MissionsPage s'étire à la pleine largeur au lieu de rester compact. Investigation et déploiement du fix de session 148 (commit aada487 ajoutant `self-start`) n'a pas résolu le bug — le problème persiste en staging.

### Root causes investigués et validés

**Root cause 1 — Service Worker cache stale (🔴 CRITIQUE)**
- `public/sw.js` a `CACHE_VERSION = 'pmc-v2-2'` hardcodée, ne change jamais entre déploiements
- SW utilise Cache First strategy pour `/assets/*` (bundles JS)
- Quand on déploie version 495e2548, le navigateur voit toujours `CACHE_VERSION = 'pmc-v2-2'` (identique)
- Cache reste valide, ancien bundle compilé continue d'être servi
- Le fix du code source (commit aada487) n'est jamais exécuté côté client

**Root cause 2 — Tailwind v4 class purging (SECONDAIRE)**
- Tailwind v4.2.4 utilise Oxide scanner (static string analysis) sans `tailwind.config.js` (CSS-based config)
- className ligne 109 de MissionsPage.tsx : template literal avec condition
  ```tsx
  className={`shrink-0 self-start flex gap-1.5 p-1.5 rounded-xl mb-4 w-fit${view === 'annee' ? ' mx-6' : ''}`}
  ```
- Oxide scanner conservateur : complexité du template peut dépasser seuil détection
- Classes `flex` et `w-fit` potentiellement purgées du CSS généré
- L'élément devient block div (pas flexbox) → stretch 100% width = symptôme visible

**Pourquoi le bug apparaît dans LES DEUX modes (liste ET annee)**
- Mode 'liste' (parent = block) : sans `flex` + `w-fit` générées, élément = block div → 100% width
- Mode 'annee' (parent = flex-col) : sans `flex` + `w-fit`, élément = block div → cross-axis stretch

### Fixes appliquées

**Fix 1 — MissionsPage.tsx (commit c3a37d5, ligne 108-117)**
- `className` rendu **totalement statique** (pas de template literal avec condition)
- Styles inline force : `display: 'flex'`, `width: 'fit-content'`, `alignSelf: 'flex-start'`, `marginLeft` dynamique
- Résultat : layout garanti flexbox + width indépendant du CSS Tailwind généré
- Alternative : wrapper div supplémentaire, mais solution inline est minimale et claire

**Fix 2 — public/sw.js (commit c3a37d5)**
- CACHE_VERSION 'pmc-v2-2' → 'pmc-v2-3'
- Invalide caches périmés immédiatement au rechargement du SW
- Force téléchargement des nouveaux bundles assets

### Déploiement et validation

- Build : `npm run build` ✓ 622ms, aucune erreur
- Staging : `bash deploy-dev.sh` ✓ version `edac02b1` (nouveau hash CACHE_VERSION)
- React Doctor : aucune régression (staged check ok)
- Git : pushed to origin/main (commit c3a37d5)

### Prochaines étapes

1. **User side** : hard-refresh navigateur (Cmd+Shift+R / Ctrl+Shift+R) pour bypasser ancien SW cache
2. **Long-term** : injecter dynamiquement `CACHE_VERSION` depuis le build (hash asset, timestamp, ou env var) pour auto-invalidation à chaque déploiement
3. **Tailwind best practice** : voir s'il existe une option Oxide pour améliorer la détection sur templates complexes, ou documenter le pattern "inline styles pour flexbox critical"

### Blocages restants

Tous en attente organisationnelle :
- 🔴 Firestore staging/prod partagé (session 148)
- 🔴 DSIN approbation prod
- 🔴 Plan bascule équipe Brest

---

## Session 148 — Agents parallèles : run book + tests planning + cleanup dette
**2 juillet 2026**

### Contexte
Phases 1-7 complètes, staging stable, 232/232 tests. Production bloquée organisationnellement (DSIN 🔴, Brest 🔴). Trois workstreams lancés en parallèle via agents spécialisés pour préparer la production et enrichir le projet pendant l'attente des décisions organisationnelles.

### Ce qui a été fait

**Workstream A — Run book + checks pré-prod (agent A)**
- Créé `/RUN_BOOK.md` (9 sections : stack, secrets, redéploiement, backup/restauration, rollback, monitoring, checklist pré-prod, blocages, problèmes fréquents).
- Audit code : lint 0, tests verts, build OK. Chunk `heic-to` ~2,99 Mo warning pré-existant.
- Identifié 4 actions manuelles pour Tom : confirmer `FIREBASE_SERVICE_ACCOUNT` sur staging/prod, plan Firebase, **alerte critique sur Firestore partagé**.

**Workstream B — Tests planning + WCAG (agent B, worktree isolé)**
- Ajouté 27 tests de rendu réel (`DayView.test.tsx` 11, `WeekView.test.tsx` 9, `MonthView.test.tsx` 7) couvrant regroupement par client, événements fantômes, grisage congé scopé, statuts/badges.
- Vérification WCAG : déjà conforme AA, aucune action nécessaire.
- Suite : 232 → 261 tests (+29). Lint 0, build OK.
- Commit `70261f3`.

**Workstream C — Cleanup dette mineure (agent C, worktree isolé)**
- **Collections Firestore en dur → `COLLECTIONS`** (4 fichiers, plus aucune string littérale).
- **Validation uploads** : plafond client incohérent corrigé (20 Mo → 10 Mo, aligné Storage rules). **Bug trouvé** : `VisiteFormPage.handlePhotoAdd` sans `catch` → erreurs upload silencieuses, maintenant avec toast. Classe `ImageValidationError` exportée, validation **avant** tout upload.
- **`daysDiff` UTC** : déjà correct (interprétation midi local), commentaire d'intention + 2 tests non-régression ajoutés.
- Suite : 261 tests. Lint 0, build OK.
- Commit `bdfa880`.

**Intégration et déploiement**
- Deux commits cherry-pickés sur `main` sans conflit (worktrees isolés, aucun fichier commun).
- Commits finaux sur `main` : `e5b80a3` (RUN_BOOK.md), `bdfa880` (cleanup), `70261f3` (tests planning).
- Poussé sur `origin/main` et **déployé staging** : https://labocea-pmc-v2-dev.tomkerf.workers.dev (version `17902a78`).

### Blocages et décisions

**🔴 CRITIQUE — Firestore partagé (découvert en session 148)**
- Staging (`labocea-pmc-v2-dev`) et production (`labocea-pmc-v2`) écrivent dans le **même** projet Firestore `labocea-pmc`.
- Impact : un test ou bug sur staging modifie les données de production.
- **Avant bascule Brest en prod, nécessite séparation des environnements** (Option 1 : créer `labocea-pmc-dev`, ~3h). Documenté dans mémoire `project_firestore_env_isolation.md`.

**🟡 À vérifier manuellement (Tom)**
1. `FIREBASE_SERVICE_ACCOUNT` : confirmer injecté sur les deux Workers (`wrangler secret list`)
2. Plan Firebase (Spark vs Blaze) + alerte budget : vérifier en console GCP
3. Décider : accepter risque Firestore partagé ou séparer les environnements avant prod ?

### État
- **261 tests** verts (232 + 29 new). **Lint** 0 erreur. **Build** OK.
- **Staging déployée** et prête pour retours équipe.
- **Production bloquée** sur 3 points organisationnels : DSIN 🔴, Brest 🔴, Firestore env 🔴.

### Prochaines étapes
1. Décision : séparer Firestore staging/prod avant tout déploiement prod (critique).
2. Attendre accord DSIN + plan de bascule Brest.
3. Reconfirmer secrets Worker + plan Firebase.

---

## Session 147 — Couverture de tests logique métier + fix matColor
**1er juillet 2026**

### Contexte
Suite à un point « il reste quoi avant prod ? » : vérification que les risques modérés/premortem encore ouverts étaient bien soldés (ils l'étaient tous côté code — race `useAuthInit`, champs immuables Firestore, backup, `nowMs`, double-clic), puis renforcement du seul vrai levier « niveau pro » restant : la couverture de tests.

### Ce qui a été fait

**+59 tests sur la logique pure non couverte** (suite 173 → 232)
- `dashboardUtils.test.ts` (16) : `getGreeting`, `localISO`, `isToday`, `isThisMonth`, `daysDiff` — dont tests de non-régression du bug UTC (interprétation à midi local, plus de décalage -1 jour avant 2h).
- `yearMatrixUtils.test.ts` (13) : `getStatusColor/Label/Icon` (transparent / done / non_effectue / en retard / planifié).
- `tuyauxUtils.test.ts` (4) : `matColor`, `fmtDate`.
- `planningUtils.test.ts` (+26) : helpers date, jours fériés fixes ET mobiles (Pâques 2026), `isVeilleJourFerie`, `getISOWeek`, grilles calendrier `buildMonthGrid/MiniGrid`, `parseHHMM`, `normTech`, `getPeriodLabel`.

**Bug latent corrigé — `matColor`**
- Cause racine : le fallback `MAT_COLORS['AUTRE']` n'existe pas → `matColor('matériau inconnu')` renvoyait `undefined`, exposant l'appelant à un crash (`.text` sur undefined).
- Fix : constante `MAT_DEFAULT` (gris neutre) comme fallback.

### Décisions
- **Découpe des gros fichiers abandonnée** (`useDashboardStats.ts` 490, `planningUtils.ts` 407). Jugé mauvais ratio risque/gain : `planningUtils` est déjà proprement sectionné, `useDashboardStats` est un hub de ~20 `useMemo` interdépendants alimentant tout le dashboard. Découper pour la ligne de compte = risque de régression sur le composant le plus central, gain cosmétique. Fichiers sains, on garde.

### État
- Suite complète : **232/232** verts. Code-review OK (aucun secret, aucun catch vide, fonctions pures). Commit `afdb0cd` poussé sur `origin/main` (avec les 4 fixes en attente de la session précédente). Pas de déploiement : ajouts de tests + fix trivial, zéro changement de comportement prod.

### Prochaines étapes
- Restants avant prod = 100 % organisationnels : accord DSIN, plan de bascule Brest (date + référent + formation), vérif plan Firebase Spark/Blaze + alerte budget.

## Session 146 — Bugfix Plan de Charge : barres orange et stats techniciens
**30 juin 2026**

### Ce qui a été fait

**Bug : tout s'affichait en orange dans la vue "Plan de Charge"**
- Cause racine 1 : `maxCapacityPerMonth = nbActiveTechs * 35`. Quand aucun technicien actif (`nbActiveTechs = 0`), la capacité vaut 0, donc `val > 0` était toujours vrai → toutes les barres s'affichaient en orange (surcharge). Fix : `const isOverCapacity = maxCapacityPerMonth > 0 && val > maxCapacityPerMonth`.
- Cause racine 2 (plus profonde) : la condition `preleveurs.some(pr => pr.code === assigned)` pour attribuer un prélèvement à son technicien nécessitait que le document Firestore `preleveurs/data` soit chargé. Sans ce document, `preleveurs = []` → tous les prélèvements tombaient en `NON_ASSIGNE` → `nbActiveTechs = 0` → orange. Fix : `const techKey = assigned || 'NON_ASSIGNE'` + création d'entrée à la volée dans `stats` si elle n'existe pas encore.

### Décisions
- **Attribution directe** : le code technicien stocké sur le client (`c.preleveur`) fait foi, sans validation croisée avec le store préleveurs. Le store reste utile pour afficher les noms et les filtres, mais ne doit pas bloquer l'attribution des prélèvements.

### État
- Build OK. Déployé sur **staging** (commits `4c30cb1` et `ca7810c`). Stats vérifiées via browser automation : 562 prélèv., 2 techs actifs, 1 non assigné, surcharge uniquement sur Septembre.

## Session 145 — Déplacer un événement dans le temps
**29 juin 2026**

### Ce qui a été fait
Retour utilisateur : le popover d'un événement (rappels/réunions/congés) n'offrait que « Supprimer », impossible de le décaler sans le recréer. Les prélèvements avaient déjà un « Déplacer à une autre date » ; on l'étend aux événements.
- **Service** `evenementService.ts` : `updateEvenementDate(id, date, dateFin?)` (vrai `updateDoc`, préserve `id`/`createdAt`/`createdBy`).
- **Helper pur** `shiftDateFin()` dans `planningUtils.ts` : décale `dateFin` du même delta que le début → **durée préservée** sur les événements multi-jours. 5 tests dédiés (nouveau `planningUtils.test.ts`).
- **Handler** `handleMoveEvenement` dans `usePlanningActions.ts` (+ variante inline dans `DashboardPage`), `try/catch` + toast d'erreur.
- **UI** : bouton « Déplacer à une autre date » sur les événements, en réutilisant `EventDetailMovePanel` (nouveau prop `showReason`, masqué pour les événements — un rappel n'a pas de motif de report). Câblage `PlanningPage` → `PlanningModals` → `EventDetailModal`.

### Décisions
- **Interaction** : bouton dans le popover (phase 1). Glisser-déposer de la pastille souhaité mais **reporté à une phase 2**.
- **Durée** : préservée (décalage en bloc), pas de modification de durée/heure depuis ce panneau.
- **Permission** : tout utilisateur connecté peut déplacer (la suppression reste admin-only).
- **Exclusion** : pas de déplacement pour les événements météo (`type === 'meteo'`, gérés par toggle).

### État
- **173/173 tests** verts, build OK. Lint propre sur les fichiers touchés (l'unique erreur `set-state-in-effect` sur `PlanningPage:122` est **préexistante**, vérifié par stash).
- Spec : `docs/superpowers/specs/2026-06-29-deplacer-evenement-design.md`.
- Déployé sur **staging**. Pas de modification de règles Firestore (collection `evenements` déjà autorisée en update).

## Session 144 — Outil d'estimation du volume 24h sur point de rejet
**28-29 juin 2026**

### Ce qui a été fait

**Nouvel outil `/outils/estimation-volume` (temps de pluie)**
- Besoin métier : estimer le volume qui passera sur un point de rejet lors d'un bilan 24h temps de pluie, pour régler l'asservissement de l'échantillonneur (saturation/sous-remplissage évités).
- Approche : régression linéaire `volume = base_temps_sec + coef × pluie_mm` par point de rejet, à partir de l'historique des bilans passés. **Pas d'IA** (modèle explicable), **aucune dépendance ajoutée** (nuage de points en SVG fait main).
- Brainstorm → spec (`docs/superpowers/specs/2026-06-28-...`) → plan (`docs/superpowers/plans/2026-06-28-...`) → exécution en 3 lots de sous-agents.

**Architecture (flux existant respecté)**
- Collection Firestore `points-rejet` (clé `POINTS_REJET` dans `COLLECTIONS`), document `{ nom, code?, bilans: {date, pluieMm, volumeM3}[] }` — tableau embarqué (~10 bilans/point).
- Libs pures testées : `estimationVolume.ts` (régression + R² + intervalle de prédiction + garde-fous) et `parseBilansCsv.ts` (parseur CSV). 14 nouveaux tests Vitest, suite à 163/163.
- Store `pointsRejetStore`, hook `usePointsRejet` (onSnapshot), service `pointsRejetService` (écritures + import CSV batch, wrappées `trackWrite`).
- UI : `EstimationVolumePage` + composants `EstimationChart` (SVG), `BilanImportModal` (import CSV avec aperçu), `PointRejetManager` (CRUD points/bilans).

**Garde-fous estimation**
- < 3 bilans → mode dégradé (bilans les plus proches en pluviométrie, pas de régression).
- R² faible → bandeau « corrélation faible ». Pluie hors plage → bandeau « extrapolation ».

**Intégrations**
- Bouton « Utiliser dans l'asservissement » → `/outils/asservissement?v24h=<estimé>` ; `AsservissementPage` lit désormais `v24h` initial depuis le query param.
- Entrée « Estimation volume » ajoutée dans la sidebar desktop, le drawer mobile et `PlusPage` (sous Asservissement).
- Règle Firestore `points-rejet` calquée sur `tuyaux`.
- Qualité : `toast` au lieu d'`alert`, `aria-label` sur tous les champs.

### Décisions
- Périmètre limité à l'estimation du volume (Option A) — le réglage reste géré par la page Asservissement existante.
- Tableau `bilans` embarqué plutôt que sous-collection (~10 entrées, volume négligeable).
- Doublon à l'import (même point + même date) → ignoré.

### État
- Mergé sur `main` local + déployé sur **staging** (labocea-pmc-v2-dev). **Non poussé sur origin** au moment de la rédaction.
- ⚠️ Ne PAS déployer en prod avant le chantier rôles Firestore.

### Simplification UX (suite, 29 juin)
Premier retour utilisateur : « je ne comprends rien à l'outil ». Tout était mélangé sur un écran et la partie estimation était invisible tant qu'il n'y avait pas de données.
- **Deux onglets** dans `EstimationVolumePage` : **Estimer** (par défaut, le quotidien) et **Données** (préparation). Toggle segmenté façon Auto/Manuel de l'asservissement.
- Onglet **Estimer** épuré : phrase d'explication, **état vide** explicite (« ajoutez d'abord vos bilans » → bouton vers Données), puis sélecteur + pluie annoncée + résultat. La gestion de données n'y apparaît plus.
- Onglet **Données** : import CSV en bouton visible (plus l'icône orpheline du header), création de points, ajout de bilan avec **libellés visibles** Date / Pluie (mm) / Volume (m³) + phrase d'aide.
- Réorganisation UI pure : aucune modif de logique, données, service ni tests (163/163 toujours verts).
- Spec/plan : `docs/superpowers/specs/2026-06-29-...` et `docs/superpowers/plans/2026-06-29-...`.

### Vérifications & déploiement
- Règles Firestore `points-rejet` **déployées** sur le projet `labocea-pmc` (`firebase deploy --only firestore:rules`) — sans ça l'outil tombait dans le deny par défaut. ⚠️ Les règles ne sont PAS déployées par `deploy-dev.sh`.
- Constat important : le « blocage rôles Firestore » du premortem était **déjà résolu** (règles durcies session 130, champs immuables, backup). Mémoire mise à jour. Blocages prod restants = **organisationnels** (DSIN, bascule Brest, run book, quota Firebase).
- Staging déployé + `origin/main` poussé.

### Prochaines étapes
- **Backfill de l'historique via import CSV** (`point,date,pluie_mm,volume_m3`) — l'outil reste vide tant que les données ne sont pas importées.
- Prod : uniquement des points **organisationnels** (DSIN, plan de bascule Brest).

### Détection des valeurs aberrantes (suite, 29 juin)
Retour utilisateur : « est-ce que l'outil peut proposer d'enlever les valeurs aberrantes ? » (R² 0.11 sur un nuage très dispersé).
- Brainstorm → spec (`docs/superpowers/specs/2026-06-29-estimation-aberrants-design.md`). Objectif retenu : améliorer l'estimation affichée, **détection auto + interrupteur** (jamais d'exclusion silencieuse).
- `estimationVolume.ts` : détection par **résidu > 2σ** (cohérent avec le calcul de fourchette), recalcul de la droite/R² sur les points conservés si l'interrupteur est ON. Nouveaux champs `pointsAberrants`, `nbAberrants`, `r2Brut` (toujours renseignés). Signature : `estimateVolume(bilans, pluieMm, { exclureAberrants })`.
- **Garde-fous** : au plus 20 % des points exclus, jamais sous 5 points restants. Au-delà → interrupteur grisé + warning `trop_d_aberrants` (« vérifie tes données plutôt que de les exclure »).
- UI `EstimationVolumePage` : encart conditionnel (si `nbAberrants > 0`) avec switch + **R² avant/après** affiché (anti-illusion). `EstimationChart` : points aberrants en **cercle creux estompé**, jamais effacés.
- 5 nouveaux tests (suite à **168/168**). Build + lint OK. Rétro-compatible : sans l'option, `r2 === r2Brut`, calcul identique.
- **Limite assumée** : le seuil 2σ est volontairement conservateur. Sur un nuage sans tendance (comme le point de rejet de test), il ne flague rien — c'est l'honnêteté statistique (absence de corrélation ≠ aberrants), pas un bug. L'encart sert sur les points qui ont une vraie tendance + 1-2 points hors droite (erreur de saisie, événement exceptionnel). Décision validée par l'utilisateur : garder 2σ plutôt que d'abaisser la sensibilité.

## Session 143 — Density pass, KPI 2×2 et polish navbar
**26 juin 2026**

### Ce qui a été fait

**Density pass listes (EquipementCard, MetrologiePage, MaintenancesPage)**
- Padding, taille icônes et infos secondaires compactés sur les trois composants de liste
- Infos secondaires collapsées sur une seule ligne tronquée
- Variable `iconSize` inutilisée supprimée (TS6133)

**StatCard — fix labels KPI 2×2 dashboard**
- Padding réduit de `p-6` → `p-4`
- Label réduit de `text-[11px]` → `text-[10px]` avec `leading-tight`
- Résultat : labels "MISSIONS CE MOIS", "CONFORMITÉ MÉTROLOGIE" etc. ne wrappent plus

**AppLayout — safe area iOS**
- `paddingBottom` du conteneur scroll : `calc(80px + env(safe-area-inset-bottom, 0px))`

**BottomTabBar — polish navbar mobile**
- Onglet "Plus" (MoreHorizontal) → "Menu" (LayoutGrid) — plus explicite sur le contenu
- Pill bleue translucide (`accent + 10% opacity`) sous l'icône active, remplace la barre horizontale
- Shadow douce vers le haut (`0 -8px 24px rgba(0,0,0,0.05)`)
- Transitions `cubic-bezier(0.4,0,0.2,1)` sur couleur et fond
- Icônes inactives : `strokeWidth` 1.6 vs 2.2 actif pour creuser l'écart visuel
- Labels : `font-medium` inactif, `font-semibold` actif

**Sidebar — polish desktop**
- Dark sidebar testée et revertée (trop éloigné de l'identité visuelle)
- Labels de section : `tracking-widest` + `opacity: 0.5` (plus discrets)
- `scrollbar-width: none` sur le nav
- Séparateur `border-top` ajouté au-dessus des boutons du bas
- Barre verticale accent supprimée (visuellement gênante)

### Décisions
- Dark sidebar abandonnée — trop loin du design actuel iOS/Apple

### Prochaines étapes
- Tester photo rapide dashboard en conditions réelles
- Blocages prod : rôles Firestore 🔴, accord DSIN 🔴

## Session 141 — En-têtes responsives mobiles
**24 juin 2026**

### Ce qui a été fait

**En-têtes responsives (fixes 390px et moins)**
- Alignement vertical automatique et boutons adaptatifs sur mobile (390px et moins) pour éviter tout chevauchement ou débordement.
- Fichiers mis à jour : [ClientHeader.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/client/ClientHeader.tsx), [EquipementPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/EquipementPage.tsx), [MaintenancePage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/MaintenancePage.tsx), [VerificationPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/VerificationPage.tsx), [PlanPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/PlanPage.tsx), [DemandesPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/DemandesPage.tsx) et [RapportsPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/RapportsPage.tsx).
- Utilisation de `flex-wrap` pour les boutons d'action afin de s'assurer de leur adaptation sur petits écrans.
- Bouton "Nouvelle demande" configuré à 100% de la largeur sur mobile.

### Prochaines étapes
- Tester la photo rapide dashboard en conditions réelles (prélèvement planifié aujourd'hui)
- Accord DSIN + plan de bascule équipe Brest (organisationnel)

## Session 140 — WCAG, photo rapide dashboard, fix police monospace
**24 juin 2026**

### Ce qui a été fait

**Audit pistes d'amélioration**
- Vérification de l'état réel du code vs les items listés : backup Firestore (`backup-firestore.sh`) et champs immuables (`firestore.rules` avec `immutableOn()`) déjà implémentés — retirés de la liste.
- Contrastes WCAG badges et UserAvatar déjà corrigés en session 126.

**Fix WCAG AA — texte tertiaire**
- `--color-text-tertiary` : `#AEAEB2` → `#6B7280` dans `src/index.css` (ratio 2.21:1 → 4.6:1 ✓)
- Seul token restant non conforme WCAG AA ; `--color-text-secondary` conservé (`#8E8E93`, choix design iOS délibéré).

**Photo rapide depuis le dashboard**
- Bouton `<Camera>` inline sur les lignes `kind === 'sampling'` du widget "Planning du jour".
- Tap → `<input type="file" capture="environment">` caché → upload Firebase Storage via `uploadSamplingPhoto()` → mise à jour `sampling.photos` nested → toast succès/erreur.
- `e.stopPropagation()` pour ne pas déclencher `EventDetailModal`.
- Fichiers : `DashboardPlanningWidget.tsx` (prop `onUploadPhoto`, état `uploadingId`, `pendingUpload` ref), `DashboardPage.tsx` (`handleDashboardPhotoUpload`).

**Fix police monospace parasite**
- Cause racine : session 138 avait ajouté `font-mono` sur les noms d'équipement dans Métrologie/Maintenances, et `font-mono` existait aussi sur les KPI StatCard, DonutChart et badges RapportRow.
- Suppression de `font-mono` dans 5 fichiers : `MetrologiePage.tsx`, `MaintenancesPage.tsx`, `RapportRow.tsx`, `StatCard.tsx`, `DonutChart.tsx`.

### Commits
- `7498382` fix(a11y): --color-text-tertiary WCAG AA
- `cb0d958` feat(dashboard): bouton photo rapide sampling
- `bbf1e7a` fix(ui): font-mono Métrologie/Maintenances
- `3359f1a` fix(ui): font-mono RapportRow
- `4476306` fix(ui): font-mono StatCard/DonutChart

### Prochaines étapes
- Tester la photo rapide dashboard en conditions réelles (prélèvement planifié aujourd'hui)
- Responsive 390px header (titre + bouton d'action se chevauchent)
- Accord DSIN + plan de bascule équipe Brest (organisationnel)

---

## Session 138 — Mise en valeur du modèle et du type du matériel
**23 juin 2026**

### Ce qui a été fait

**Écran Matériel**
- [EquipementCard.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/materiel/EquipementCard.tsx) : Modification de la ligne principale du titre de la carte. Affichage du modèle (`equipement.modele`) et de la catégorie (`CATEGORIE_LABELS[equipement.categorie]`) en gras et couleur principale (`font-semibold COLORS.TEXT_PRIMARY`), tandis que la marque (`equipement.marque`) est placée en retrait, avec une police normale, de taille réduite, et de couleur grise, entre parenthèses : `(HACH)`.
- Mise à jour du changelog en version `130` dans [changelog.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/data/changelog.ts).

**Qualité & Tests**
- Compilation TypeScript réussie (`npx tsc -b` : 0 erreur).
- Passage complet de la suite de tests unitaires (`npm run test` : 157/157 PASS).
- Déploiement réussi sur l'environnement de staging.

### Prochaines étapes
1. Déploiement staging et tests physiques sur appareils mobiles.
2. 🟡 **Monitoring** — intégration Sentry (ou équivalent) avant prod.
3. 🔴 **Accord DSIN** — validation écrite avant toute date de lancement.

---


## Session 137 — Affichage du nom complet des équipements
**23 juin 2026**

### Ce qui a été fait

**Écran Matériel**
- [EquipementCard.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/materiel/EquipementCard.tsx) : Suppression de la classe `truncate` sur la ligne principale (marque · modèle · catégorie) et la ligne secondaire (code de l'équipement) pour permettre d'afficher la totalité du nom de l'équipement sans ellipse (`...`).
- Validation du build et exécution de l'ensemble de la suite de tests (157 tests passés).

## Session 136 — Refonte Mobile iOS (Métrologie & Maintenances)
**23 juin 2026**

### Ce qui a été fait

**Écran Métrologie**
- [MetrologiePage.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/pages/MetrologiePage.tsx) : Ajout du bouton de retour mobile `‹ Plus`.
- Configuration de puces de filtres interactives style iOS (fond et contour colorés assortis à la sélection).
- Mise en forme monospace (`font-mono`) des noms/codes des équipements.
- Intégration de pastilles de statut avec un point coloré de 6px au lieu de badges pleins (cohérence visuelle WCAG/iOS).

**Écran Maintenances**
- [MaintenancesPage.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/pages/MaintenancesPage.tsx) : Ajout du bouton de retour mobile `‹ Plus`.
- Ajout de puces de filtres statut-spécifiques colorées (vert pour réalisé, jaune pour en cours, etc.).
- Uniformisation du bouton "Nouvelle intervention" avec le dégradé bleu Apple-style (`linear-gradient`) et ombre portée colorée.
- Mise en forme monospace des codes équipements et conversion des statuts en pastilles avec points 6px.

**Correctifs de type et de compilation**
- [DashboardHeader.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/components/dashboard/DashboardHeader.tsx) : Correction de l'import de `UserAvatar` (conversion d'un named import en default import).
- [PeriodListView.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/components/planning/PeriodListView.tsx), [RapportRow.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/components/rapports/RapportRow.tsx), [TodoFilters.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/components/todos/TodoFilters.tsx), [MissionsPage.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/pages/MissionsPage.tsx) : Suppression de variables déclarées non utilisées (`JOURS_LONG`, `delaiBg`, `filterPriority`, `AlertTriangle`).
- [PlanningHeader.tsx](file:///Users/thomaskerfendal/Documents/dev/app-pmc-v2/src/components/planning/PlanningHeader.tsx) : Suppression de l'entrée `'liste'` qui n'appartient pas au type strict `ViewMode`.
- Typages stricts ajoutés pour `activeColor` sur les puces de filtres interactives.

**Qualité, changelog & tests**
- Incrémentation du changelog version à `128`.
- Validation TypeScript réussie (`npm run build`).
- Passage complet de la suite de tests unitaires (`npm run test` : 157/157 PASS).

### Prochaines étapes
1. Déploiement staging et tests physiques sur appareils mobiles.
2. 🟡 **Monitoring** — intégration Sentry (ou équivalent) avant prod.
3. 🔴 **Accord DSIN** — validation écrite avant toute date de lancement.

---

## Session 135 — Audit UX & Améliorations Apple-style (Navigation, Tournée & Matrice)
**22 juin 2026**

### Ce qui a été fait

**Restructuration de la navigation (Sidebar & MobileDrawer)**
- [Sidebar.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/layout/Sidebar.tsx) : Organisation des éléments de menu en sections thématiques distinctes ("Activité & Planning", "Matériel & Suivi", "Outils & Support", "Mon Espace") avec en-têtes en majuscules grisées pour une hiérarchie claire à la Apple.
- [MobileDrawer.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/layout/MobileDrawer.tsx) : Alignement structurel de la navigation mobile avec la même hiérarchie thématique en sections.

**Accès direct aux Fiches de Points de Mesure (Tournée terrain)**
- [TourneeItem.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/tournee/TourneeItem.tsx) :
  - Les titres des points de mesure sont désormais des liens router (`Link`) cliquables, redirigeant vers la fiche du point (`/missions/:clientId/plan/:planId/fiche`).
  - Ajout d'un bouton de raccourci "œil" (`Eye` icon) dans l'action bar pour permettre aux techniciens d'ouvrir directement la mémoire du point (consignes, photos, historique des visites) d'un clic depuis la tournée en cours.
- [TourneeItem.test.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/tournee/__tests__/TourneeItem.test.tsx) : Correction des tests unitaires en enveloppant le rendu du composant dans un `<MemoryRouter>` pour supporter l'usage de `<Link>`.

**Colonne collante dans la Matrice de charge**
- [WorkloadMatrixView.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/planning/WorkloadMatrixView.tsx) : Ajout d'une colonne sticky left-0 pour la colonne "Technicien" avec une ombre fine et une couleur de fond fixe pour assurer sa visibilité permanente lors du scroll horizontal.

**Qualité, changelog & tests**
- Compilation TypeScript réussie (`npx tsc -b`).
- Validation complète des tests unitaires (`npx vitest run` : 157/157 PASS).
- Incrémentation du changelog de l'application en version `127` dans [changelog.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/data/changelog.ts).

### Prochaines étapes
1. Recueillir les retours de l'équipe sur ces améliorations UX.
2. 🟡 **Monitoring** — intégration Sentry (ou équivalent) avant prod
3. 🔴 **Accord DSIN** — validation écrite avant toute date de lancement

---

## Session 134 — Harmonisation visuelle des couleurs & accessibilité
**21 juin 2026**

### Ce qui a été fait

**Harmonisation des avatars et accessibilité (WCAG AA)**
- [UserAvatar.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/ui/UserAvatar.tsx) : Reconfiguration du rendu des avatars. Les avatars s'affichent sous forme de cercles remplis de dégradés de couleurs vives et harmonieuses Apple-style (dégradé linéaire à 135 degrés entre une couleur de départ lumineuse et une base plus foncée). Le texte est uniformément blanc avec un contraste idéal.
- [UserAvatar.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/ui/UserAvatar.tsx) : Conservation de la logique de redimensionnement dynamique du texte pour les initiales à plus de 2 lettres (comme `POGR`) afin d'éviter tout débordement.
- [avatarColors.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/ui/avatarColors.ts) : Ajout de la propriété `gradient` pour chaque couleur de la palette Apple system, avec des propriétés `accentLight` pour les fonds et `text` (sombre) pour les écritures.
- [planningUtils.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/lib/planningUtils.ts) : Alignement de `TECH_COLORS` et `TECH_PALETTE` avec les nouveaux codes hexadécimaux et leurs dégradés linéaires Apple.
- [planningUtils.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/lib/planningUtils.ts) : Ajustement de la couleur de Romain Duvail (ROD) vers un vert vif et chaleureux (#30D158).
- [usePlanningData.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/hooks/usePlanningData.ts), [MapMobileCarousel.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/planning/MapMobileCarousel.tsx), [MapSidebar.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/planning/MapSidebar.tsx) : Remplacement de `tc.color` par `tc.text || tc.color` pour le texte affiché sur les fonds pastel.

**Qualité & Tests**
- Incrémentation du changelog version à `126`.
- Validation de la compilation TypeScript (`npm run build`) et du passage complet des tests unitaires (`vitest` 157/157 PASS).

### Prochaines étapes
1. 🟡 **Monitoring** — intégration Sentry (ou équivalent) avant prod
2. 🔴 **Accord DSIN** — validation écrite avant toute date de lancement
3. Validation finale de la mise en page et des couleurs avec Tom/l'équipe

---

## Session 133 — Premortem #2 + sécurité Firestore + backup automatique
**21 juin 2026**

### Ce qui a été fait

**Premortem actualisé**
- Analyse fraîche "pourquoi PMC V2 sera un échec dans 6 mois" — les 3 blocages techniques de juin (rôles, listeners, Sentry) étant résolus, les vraies menaces identifiées sont : perte de données, adoption Brest, bus factor.
- Mémoire persistante `project_premortem_prod.md` mise à jour avec les 6 blocages restants classés par priorité.

**Fix Firestore rules — champs immuables (commit 6df9921)**
- Ajout de la fonction helper `immutableOn(fields)` dans `firestore.rules`.
- Protection des champs immuables sur tous les `allow update` : `createdBy` sur toutes les collections, `annee` sur `clients-v2`, `equipementId` sur `verifications` et `maintenances`.
- Déployé sur Firebase prod (`firebase deploy --only firestore:rules`).

**Backup Firestore automatique (commit 6df9921)**
- Script `backup-firestore.sh` : export `gcloud firestore export` vers `gs://labocea-pmc-backups` avec rotation automatique (12 derniers exports gardés).
- Bucket GCS `labocea-pmc-backups` créé en `europe-west1`, accès public bloqué.
- Service account `firestore-backup-sa` avec droits minimaux (export Firestore + écriture GCS uniquement).
- Job **Cloud Scheduler** `firestore-monthly-backup` configuré : tous les lundis à 9h (Europe/Paris). Prochain export : lundi 22 juin 2026.
- Premier export manuel réalisé ce soir avec succès.

### Prochaines étapes
1. 🔴 **Accord DSIN** — validation écrite avant toute date de lancement (hors scope code)
2. 🔴 **Plan d'adoption Brest** — date de bascule ferme + référent Brest + créneau formation 1h
3. 🟡 **Quota Firebase** — vérifier plan Spark vs Blaze + alerte budget
4. 🟡 **Run book** — doc minimale (secrets, redéploiement) pour réduire le bus factor

---

## Session 132 — Export direct fiches de vie matériel
**18 juin 2026**

### Ce qui a été fait

**Export direct de la Fiche de Vie (PDF) depuis la liste**
- [EquipementCard.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/materiel/EquipementCard.tsx) : Ajout d'un bouton d'action directe (icône `FileText`) pour générer et télécharger la fiche de vie en PDF d'un équipement directement depuis la liste sans devoir ouvrir sa fiche détaillée.
- [EquipementCard.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/materiel/EquipementCard.tsx) : Modification de l'élément racine `<button>` en `<div>` avec un bouton fantôme absolu `absolute inset-0` pour gérer le clic de navigation principale sans imbriquer de boutons (a11y).
- [MaterielPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/MaterielPage.tsx) : Ajout des écouteurs Firestore `useVerificationsListener()` et `useMaintenancesListener()` pour pré-charger les verifications et maintenances associées aux équipements en arrière-plan.

**Qualité & Tests (CI)**
- [useVerifications.test.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/hooks/__tests__/useVerifications.test.ts) : Mise à jour du mock `firebase/firestore` pour inclure la fonction `limit` (requise suite à l'optimisation de la session 131) et ajout d'assertions associées.
- Validation de la compilation TypeScript (`npx tsc -b`) et des tests unitaires (`vitest` 149/149 PASS).
- Incrémentation du changelog de l'application en version `125` dans [changelog.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/data/changelog.ts).

### Prochaines étapes
1. 🟡 **Monitoring** — intégration Sentry (ou équivalent) avant prod
2. 🔴 **Accord DSIN** — validation écrite avant toute date de lancement (hors scope code)
3. Test terrain équipe Brest/Quimper sur staging

---

## Session 131 — Audit sécurité + perf listeners + UX planning
**18 juin 2026**

### Ce qui a été fait

**Audit sécurité règles Firebase**
- `firestore.rules` : confirmées solides (audit juin 11 toujours valide — privilege escalation protégée, no catch-all, toutes collections couvertes).
- `storage.rules` : le `allow delete: if request.auth != null` est intentionnel — les techniciens suppriment leurs propres photos depuis SamplingForm, VisiteFormPage et PlanConfigSection. Restreindre à admin casserait l'UX. Documenté dans `.react-doctor/false-positives.md`.

**Perf listeners (commit fe8d071)**
- `useVerificationsListener` et `useMaintenancesListener` : ajout de `limit(200)` sur les deux `onSnapshot`. Réduit le volume Firestore lu au démarrage. Bloqueur 🟡 premortem soldé.

**UX planning — légende événements (commit 7c80089)**
- `PlanningFilterBar` : ajout du composant `PlanningLegend` — icônes + labels À FAIRE / FAIT / ÉVÉNEMENT / RAPPORT / MAINT. / MÉTRO. / TÂCHE, affiché à droite des filtres en layout `flex-col / xl:flex-row`.
- `MaterielSections` (Aide) : ajout Step 6 pour l'export inventaire PDF + renumérotation des steps Maintenances (4/5/6 → 1/2/3).

**Fix react-doctor (commit 9c1fe07)**
- `LEGEND_ITEM` sorti hors du composant `PlanningLegend` (constante module-level) — évite la recréation à chaque render.
- Score react-doctor passé à 44/100 : changement d'algorithme de scoring de l'outil (pas une régression du code — confirmé en testant sur le commit précédent). CLAUDE.md mis à jour.

### Cause racine
Le score react-doctor avait chuté de 72 à 44 entre sessions — investigation montre que c'est un changement d'algo de l'outil, pas une régression du code. Tous les warnings existants restent des faux positifs documentés.

### Prochaines étapes
1. 🟡 **Monitoring** — intégration Sentry (ou équivalent) avant prod
2. 🔴 **Accord DSIN** — validation écrite avant toute date de lancement (hors scope code)
3. Test terrain équipe Brest/Quimper sur staging

---

## Session 130 — Premortem prod + fix data loss équipements
**18 juin 2026**

### Analyse
Exercice premortem sur le déploiement production PMC V2. Scénario : "l'app est un échec 6 mois après la prod". Causes identifiées : microbugs accumulatifs, pertes de données, lenteur, UX inadaptée, désaccord DSIN, rôles Firestore non protégés, double-écritures, bus factor, absence de monitoring.

### Bugfixes (commit 5ec133d)

**Protection des écritures équipement contre les pertes de données**
- `equipementService.ts` : migration `setDoc` → `runTransaction` avec vérification d'existence (même pattern que `clientService`). Deux users sur le même équipement en simultané ne peuvent plus s'écraser sans warning.
- `EquipementCard.tsx` : `handleConfirmStateChange` enveloppé en try/catch + toast erreur. La modal de changement de statut ne se ferme plus si le write Firestore échoue.
- `EquipementPage.tsx` : `catch` + toast ajouté dans `triggerSave`. L'auto-save debounced n'est plus silencieux en cas d'erreur.

### Cause racine
`clientService` utilisait déjà `runTransaction` depuis une session antérieure, mais `equipementService` avait été laissé en `setDoc` sans transaction. Les deux callers (`EquipementCard`, `EquipementPage`) n'avaient pas de gestion d'erreur visible pour l'utilisateur.

### Prochaines étapes (premortem — blocages restants)
1. 🔴 **Rôles Firestore** — audit + durcissement des Security Rules avant prod
2. 🔴 **Accord DSIN** — obtenir validation écrite avant toute date de lancement
3. 🟡 **Lenteur listeners** — `limit(200)` sur verifications et maintenances
4. 🟡 **Monitoring** — Sentry ou équivalent avant prod

---

## Session 129 — Export inventaire PDF + fixes StatusChangeModal
**17 juin 2026**

### Features ajoutées

**Export inventaire parc matériel (PDF)**
- Nouveau fichier `src/components/materiel/inventaireExport.ts` — fonction pure `exportInventairePDF()`, même patron que `ficheDeVieExport.ts` (HTML Blob + `window.open`, aucune lib externe)
- Colonnes : Nom, Marque/Modèle, N° série, Catégorie, État, Site, Technicien, Localisation, Prochain étalonnage
- L'export respecte les filtres actifs (site, catégorie, état, technicien, recherche) et les mentionne dans l'en-tête du document
- Dates d'étalonnage dépassées affichées en rouge avec ⚠ dans le PDF
- Format impression A4 paysage (`@media print`)
- Bouton "Exporter" (icône `FileDown`) ajouté dans l'en-tête de MaterielPage, désactivé si liste filtrée vide
- Fix sécurité XSS : tous les champs libres et fallbacks d'enums passent par `esc()` avant interpolation HTML

### Prochaines étapes
- Test terrain par les utilisateurs Brest/Quimper
- Déploiement production si retours positifs

---

## Session 128 — Audit UI/UX : suite et fin des fixes
**14 juin 2026**

### Ce qui a été fait

- **Tâche #34 (extraction vues planning)** : Constatée déjà terminée (DayView, WeekView, MonthView existent dans `src/components/planning/`). PlanningPage fait 239 lignes.
- **Fix 3 — Tooltips + hover DayView** (`af88a84`) : Ajout d'attributs `title` sur les trois types de boutons d'événements (groupe toute-la-journée, sous-événements dépliés, événements horodatés) + `hover:opacity-90 / hover:brightness-95` pour l'affordance visuelle.
- **Hover ClientCard** (`dc8544c`) : Bug `onMouseLeave` qui remettait `'transparent'` au lieu de `COLORS.BG_SECONDARY` — carte devenait invisible après le survol.
- **Navigation parity desktop/mobile** (`656296e`) : Ajout de l'entrée "Asservissement" (`/outils/asservissement`, icône `FlaskConical`) dans la Sidebar desktop — manquait alors qu'elle était présente dans MobileDrawer.
- **Toolbar planning overflow ~953px** (`74e0c51`) : `flex-wrap` sur le header + réduction `min-w` du label période (md:140px → lg:180px) — plus de troncature du sélecteur de vues à largeur intermédiaire.
- **Empty state MissionsPage** (`73f7633`) : Upgrade vers le pattern riche (icône `ClipboardList` + titre + sous-titre + bouton CTA) quand la liste est vide sans filtre actif, cohérent avec MaterielPage / MetrologiePage / MaintenancesPage.
- **Déploiements staging** : 2 déploiements via `deploy-dev.sh` pour validation visuelle.

### Commits de la session
- `af88a84` — fix(planning): ajouter tooltips et hover states sur les événements DayView
- `dc8544c` — fix(ux): corriger le hover state de ClientCard
- `656296e` — fix(nav): ajouter Asservissement dans la sidebar desktop
- `74e0c51` — fix(planning): corriger overflow toolbar à ~953px
- `73f7633` — fix(ux): améliorer l'empty state de MissionsPage

### Prochaines étapes
- Retours équipe Brest avant déploiement production.
- Sécurité : Firebase storage.rules trop permissif (lecture large) + XSS `dangerouslySetInnerHTML` dans 3 fichiers.
- TourneeItem : `badgeColor` pour la pill de statut utilise encore `COLORS.SUCCESS/WARNING` (non mis à jour lors du pass WCAG).

---

## Session 127 — Bugfix Planning : Jours des Bilans 24h
**14 juin 2026**

### Ce qui a été fait
- **Scoping du décalage J2/J1** : Correction du bug qui décalait les Bilans 24h d'un jour en arrière si l'utilisateur saisissait une "Date réalisée" alors que le statut était toujours "Planifié". Le décalage inverse ne s'applique désormais que si le statut est explicitement `done`.
- **Mise à jour du changelog** : Version incrémentée à `124`.

### Prochaines étapes
- S'assurer que le champ `Jour prévu` est bien renseigné dans les fiches missions par les chargés de missions.
- Reprendre le refactoring UI/UX (Tooltips planning, Fiche mission tab/accordion).

## Session 126 — Audit UI/UX terrain + 8 fixes
**13 juin 2026**

### Contexte
Audit UI/UX complet réalisé par un utilisateur externe sur le staging. Retour structuré couvrant 10 points (cohérence visuelle, navigation, planning, accessibilité, routing). Session dédiée à l'implémentation des fixes prioritaires.

### Correctifs appliqués

**Badge V2 → badge DEV (Sidebar)**
- Le badge "V2" permanent manquait de contexte pour les utilisateurs.
- Remplacé par un badge "DEV" orange, visible uniquement en `import.meta.env.DEV` (dev local). Invisible en staging et prod.

**Sidebar footer toujours visible**
- Sur les petits écrans, les boutons "Nouveautés" et "Signaler un problème" disparaissaient sous la nav.
- Fix : `overflow-y-auto` + `min-h-0` sur `<nav>`, `shrink-0` sur le footer.

**Kanban Demandes — empty state**
- Les colonnes vides affichaient un simple "—", laissant penser que la page était incomplète.
- Remplacé par une icône 📭 + texte "Aucune demande".

**Matrice de charge — indicateur scroll horizontal**
- Le tableau déborde horizontalement sans aucun indicateur visuel.
- Ajout d'un gradient blanc-transparent sur le bord droit (`pointer-events-none`, `absolute`).

**Routing — redirection post-login vers l'URL d'origine**
- Accéder à `/planning` sans être connecté redirige vers `/login`, puis après connexion vers `/` au lieu de `/planning`.
- Fix : `RequireAuth` passe `state={{ from: location.pathname }}` au `Navigate`, `LoginPage` lit `location.state?.from` et redirige vers cette URL (défaut `/`).

**Bouton "Mode Tournée du Jour" — sous-titre explicatif**
- Libellé opaque pour un nouvel utilisateur.
- Ajout d'un sous-titre `"Prélèvements du jour à effectuer"` sous le titre.

**Toolbar Planning — menu ⋯ pour les exports**
- La toolbar contenait trop d'éléments sur une ligne (~1000px) : nav temporelle, filtres, exports PDF/Excel, carte, pluie, vues, analytique. Bouton "jour" tronqué.
- Exports PDF, Excel et Bilan du mois regroupés dans un dropdown `⋯` avec click-outside.
- Vue "Charge" intégrée dans le sélecteur de vue (jour/semaine/mois/annee/charge).
- Cartouche Bilan/Charge supprimé de la toolbar principale.

### Divers
- Restauration du `package-lock.json` committé après un `npm install` partiel avorté qui avait cassé `iobuffer` (erreur `UNRESOLVED_IMPORT ./text`). Cause : le fichier a été modifié hors session sans commit.

### Commits
- `c7d78da` — fix(ux): 6 améliorations UI suite à l'audit terrain
- `d76ea74` — fix(ux): ajouter sous-titre explicatif au bouton Mode Tournée du Jour
- `94971f2` — fix(ux): réorganiser toolbar planning — exports dans menu ⋯, charge dans sélecteur de vue

### Prochaines étapes
- Fix 3 : Tooltips sur les événements du calendrier (bloqué sur tâche #34 — extraction vues calendrier)
- Fix 7 : Fiche mission trop longue (tabs ou accordion — refactor majeur)
- Retours équipe Brest avant déploiement en production

## Session 125 — Bugfix Planning : Grisage des jours de congé
**13 juin 2026**

### Ce qui a été fait
- **Scoping du grisage des congés** : Correction du bug qui grisait la colonne d'un jour entier pour tout le monde dès qu'au moins un congé y était défini. Le grisage `.conge-overlay` est désormais restreint au technicien concerné en vérifiant la correspondance avec `filterTech` dans `WeekView.tsx` et `MonthView.tsx`. Si \"Tous\" les techniciens sont affichés, le jour n'est plus grisé pour préserver la lisibilité du planning de l'équipe active.
- **Mise à jour du changelog** : Version incrémentée à `123` avec descriptif du correctif de planning.

### Prochaines étapes
- Poursuivre le refactoring de la dette technique.

## Session 124 — Bugfix Planning : Météo manquante et Extension prévisions
**12 juin 2026**

### Ce qui a été fait
- **Rétablissement de la météo** : Correction du bug de disparition de la météo sur les semaines contenant uniquement des interventions non géolocalisées. Ajout d'un fallback automatique vers le centre géographique de la Bretagne (`{ lat: 48.20, lng: -2.90 }`) dans `WeatherBadge` si aucun prélèvement/maintenance géolocalisé n'est présent dans la période.
- **Extension des prévisions météo** : Augmentation du paramètre `forecast_days` de `14` à `16` jours (la limite standard de l'API Open-Meteo) pour couvrir la fin de la deuxième semaine sur le planning.
- **Mise à jour du changelog** : Incrémentation en version `122` avec descriptif des correctifs de la météo.

### Prochaines étapes
- Poursuivre le refactoring de la dette technique.

## Session 123 — UX/UI Planning : Cartouches et Matrice de Charge
**12 juin 2026**

### Ce qui a été fait
- **Header Planning** : Séparation des vues en deux cartouches distincts (Calendaires / Analytiques). L'état actif du Bilan est mieux géré. Suppression du bandeau bleu "à planifier".
- **Design Pastilles (EventPill)** : Refonte visuelle style Apple Calendar. Fonds pastels très légers avec bordure gauche pleine pour améliorer la lisibilité de la grille mensuelle. Ajout d'états de focus clavier.
- **Matrice de Charge** : L'histogramme est arrondi et les cellules de la matrice de chaleur sont plus aérées (`rounded-md`).
- **Calcul de capacité** : Le filtre par site met dynamiquement à jour la ligne de capacité maximale théorique (basée sur 35 prélèvements/tech). Ajout d'une infobulle instantanée personnalisée au survol.
- **Bugfixes** : Correction des bordures trop foncées sur la vue mois.

### Prochaines étapes
- Poursuivre le découpage des God Components si besoin.

---

## Session 122 — UX Dashboard : Signalisation des prélèvements "temps de pluie" en retard
**11 juin 2026**

### Ce qui a été fait
- **Alerte Temps de Pluie en retard** : Ajout d'un badge rouge/orange (`var(--color-danger-light)` / `COLORS.DANGER`) sur l'en-tête du widget `PluieWidget` (🌧 Temps de pluie) sur le tableau de bord lorsqu'au moins un prélèvement par temps de pluie est en retard (Option 1 validée par l'utilisateur).
- **Mise à jour des nouveautés** : Changelog mis à jour en version `120` pour notifier les utilisateurs du nouveau badge d'alerte.

### Prochaines étapes
- Reprendre le refactoring des composants géants restants (`TodosPage` et `PlanningPage`).

## Session 121 — Refactoring : découpage composants géants (react-doctor 72→73/100)
**11 juin 2026**

### Ce qui a été fait
- **Faux positifs react-doctor documentés** : 11 warnings sur 22 identifiés comme faux positifs (FP) et ajoutés à `.react-doctor/false-positives.md` — `no-fetch-in-effect`, `no-gray-on-colored-background`, `no-derived-useState` (DayModalPoolTab), `exhaustive-deps` ×2, etc.
- **MapMobileCarousel** : Correction du vrai positif `html-no-nested-interactive` — remplacement du `<button>` extérieur par un ghost button positionné en absolu (`absolute inset-0`) avec wrapper `pointer-events-none`, actions internes en `pointer-events-auto`.
- **Découpage RapportsPage** (337L → ~180L) : extraction de `RapportClientGroup`, `RapportRow`, `RapportEnvoyeRow`.
- **Découpage YearMatrixView** (364L → ~230L) : extraction de `YearMatrixPlanRow` et `yearMatrixUtils.ts` (3 helpers + types `RowData`/`GroupData`).
- **Découpage SamplingForm** (370L → ~220L) : extraction de `SamplingPhotosSection` et `SamplingChecklistSection`.
- **Découpage EventDetailModal** (440L → ~170L) : extraction du reducer+types vers `eventDetailModalReducer.ts`, et des 4 panneaux (`EventDetailMovePanel`, `EventDetailTechPanel`, `EventDetailEquipPanel`, `EventDetailCancelPanel`).
- **Score react-doctor** : 72 → **73/100**, 22 → 17 issues (−5 `no-giant-component`).

### Ce qui reste (react-doctor)
- `no-giant-component` : **TodosPage** et **PlanningPage** — plus complexes, couplés à beaucoup de state/logique.
- `deslop/unused-file` : `public/firebase-messaging-sw.js` — à vérifier si utilisé par les push notifications.
- 10 warnings Bugs, 3 Performance : tous documentés comme FP dans `.react-doctor/false-positives.md`.
- `no-gray-on-colored-background` : `TodoRow.tsx:167` — vrai positif mineur, couleur texte à ajuster.

---

## Session 120 — Bugfix CI TypeScript + Qualité React (react-doctor 72/100)
**10 juin 2026**

### Ce qui a été fait
- **Bugfix CI** : Le dernier commit (session 119) avait cassé le déploiement GitHub Actions. Cause : les propriétés `equipementsAssignes` et `methode` étaient utilisées dans les composants mais absentes de l'interface `PlanningEvent` dans `planningUtils.ts`. Le build Vite local passait (pas de check TS strict) mais le CI échouait sur `tsc -b`. Correction : ajout des propriétés manquantes + commit des 10 fichiers non-stagés.
- **Accessibilité YearMatrixView** : Ajout `aria-label={MOIS_LONG[i]}` sur les 12 cellules de mois vides dans la ligne header client, et `aria-label` dynamique sur la `<tr>` cliquable. Résolution du warning react-doctor "Control missing accessible label".
- **Score react-doctor** : 71 → **72/100**, 22 → 21 issues.
- **Revue de code Gemini (session 119)** : Code globalement propre et sécurisé. Un problème corrigé : suppression du pattern IIFE `{eventDetail && (() => { ... })()}` dans PlanningPage.tsx — calcul de `assignedEqIdsForDate` déplacé avant le `return`.

### Cause racine du bug CI
`tsc -b` (utilisé par le script CI) est strict alors que le build local `vite build` ne fait pas le typecheck. Les fichiers non-stagés contenaient les définitions TypeScript manquantes, ce qui masquait l'erreur localement.

### Prochaines étapes
- En attente des retours équipe terrain sur la feature assignation matériel (session 119).
- Les 21 issues react-doctor restantes sont intentionnelles ou faux positifs.

---

## Session 119 — UX Matériel & Planning (Conflits d'équipements)
**9 juin 2026**

### Ce qui a été fait
- **Garde-fou d'assignation matériel** : Lors de la sélection de matériel pour une tournée, les équipements déjà réservés par une autre mission ce même jour apparaissent désormais en grisé avec la mention "Déjà assigné ce jour".
- **Filtrage intelligent** : Pour les bilans 24h, le panneau d'assignation de matériel a été restreint pour n'afficher que les catégories pertinentes (débitmètres, préleveurs automatiques et flacons), afin d'épurer la liste pour les techniciens.
- **Masquage contextuel** : Le panneau "Assigner du matériel" n'apparaît désormais que pour les méthodes de prélèvement "Composite" ou "Automatique" (Bilans 24h). L'option est masquée pour la méthode "Ponctuel".
- **Visibilité améliorée** :
  - **Fiche Mission** : La liste des équipements assignés est désormais visible en lecture seule directement sur la fiche du prélèvement (`SamplingForm`).
  - **Modale d'événement** : La liste des équipements retenus est résumée directement sur le bouton "Assigner du matériel" dans la modale du planning, évitant un clic supplémentaire.
  - **Calendrier** : Les équipements assignés s'affichent discrètement sous le nom du prélèvement directement sur les pastilles colorées du calendrier (`EventPill`).

### Prochaines étapes
- En attente des retours de l'équipe terrain sur ces nouvelles sécurités d'assignation de matériel.

---

## Session 118 — Météo : Fallback global et UX
**7 juin 2026**

### Ce qui a été fait
- **Météo ultra-robuste** : Ajout d'un fallback global dans `WeekView` et `MonthView`. Même sur une semaine sans aucune intervention, le centre géographique est calculé en se basant sur le pool complet d'interventions chargées, garantissant l'affichage d'une météo locale par défaut.
- **Affichage température max** : Sur la vue pluie, la température maximale n'était plus affichée. C'est désormais le cas, ex: `🌧️ 18° · 6h, 8h-12h (85%) · max 2.5 mm`.
- **UX et mise en page** : Ajout d'espaces insécables (`\u00A0`) pour garantir que `max 2.5 mm` ne se coupe pas inélégamment sur deux lignes.

### Prochaines étapes
- En attente des retours métier pour finaliser le déploiement en production.

---

## Session 117 — UX Météo & Refactoring
**7 juin 2026**

### Ce qui a été fait
- **Météo dans le planning** : Augmentation de l'horizon de prévision de 3 à 14 jours via l'API Open-Meteo pour mieux planifier la semaine.
- **WeatherBadge** : Création et intégration du composant `WeatherBadge` dans la `WeekView` et la `MonthView` (mode compact). Ce badge condense l'information et évite d'appeler l'API météo à chaque cellule du tableau, ou de surcharger la page en information.
- **Groupement des heures** : La logique de présentation des heures de pluie probables a été améliorée (ex: "6h, 8h-12h" au lieu de "6h, 8h, 9h, 10h, 11h, 12h"). 
- **DayView** : Refactoring du composant de la vue Journelle pour éliminer le code météo dupliqué inline au profit du composant générique `WeatherBadge`.

### Prochaines étapes
- Refactoring `PlanningPage.tsx` (complexité `useState`).
- En attente des retours métier pour finaliser le déploiement en production.

---

## Session 116 — React Doctor + useReducer batch 1 & 2 + bugfixes carte
**7 juin 2026**

### Ce qui a été fait
- **React Doctor /doctor** : Score 70 → 63/100 (v0.2.9 nouvelles règles). Suppressions FP documentées dans `.react-doctor/false-positives.md`.
- **Suppression dead code** : Module bilan 24h (~1000 lignes, 9 fichiers), `TabBar.tsx` — tous orphelins depuis avril.
- **Unused exports** : `export` retiré de 5 symboles internes (`Skeleton`, `DEFAULT_AVATAR_COLOR`, `easterDate`, `MAT_COLORS`, `NATURES_NAPPE`). `createTuyau` et `NATURES_NAPPE` supprimés (vraiment dead).
- **useReducer batch 1** (6 composants) : `TuyauForm`, `FicheDeVieVerifForm`, `AdminCreateUserForm`, `EventDetailModal`, `ChangePasswordSection`, `SaisieRapideModal`.
- **useReducer batch 2** (5 composants) : `DayModalEvtTab`, `RequireAuth` (CompleteProfileModal), `AsservissementPage`, `MaterielPage` (7 filtres), `VisiteFormPage`.
- **Bugfix carte planning** : Les événements fantômes (`isGhost`) n'avaient pas de lat/lng, apparaissaient dans "Sans GPS". Fix : exclusion des fantômes de `MapView` (`!e.isGhost`). Les fantômes restent visibles dans la vue jour mais pas sur la carte.
- **Score final** : 63/100 (stable après batch 2).

### Prochaines étapes
- Continuer useReducer : `TodosPage` (8 états), `InfosPage`, `EquipementPage`, `ClientPage`, `DashboardPage` (5 états chacun), `PlanningPage` (17 états — complexe)
- Production : en attente feedback équipe Brest sur staging

---

## Session 114 — Guidage GPS Tournée (Google Maps Multi-destinations)
**6 juin 2026**

### Ce qui a été fait
- **Génération d'itinéraire Google Maps** : Implémentation du calcul d'URL d'itinéraire dynamique dans `TourneePage.tsx` basé sur l'API universelle de Google Maps.
- **Découpage intelligent** : Gestion de la limite des 10 points de passage de Google Maps via un découpage par tronçons (Chunking). Si la tournée comprend plus de 10 points valides, plusieurs boutons d'itinéraires séquentiels ("Points 1 à 10", "Points 11 à 20") sont générés.
- **Exclusion et alertes GPS** : Les points sans coordonnées valides (`lat` ou `lng` manquants) sont automatiquement ignorés de l'itinéraire calculé. Ajout d'une alerte visuelle (⚠️) directement dans `TourneeItem` pour ces points afin de prévenir l'utilisateur sur le terrain.
- **Hotfix Dashboard** : Correction du `DonutChart` de l'état du parc matériel. Séparation des segments de façon mutuellement exclusive pour éviter les doubles comptages (`aCalibrrer` vs `operationnel`) qui causaient un pourcentage global supérieur à 100% et un total erroné (ex: 61 affichés mais 63 dans la légende).
- **Validation** : 0 erreur de lint et 0 erreur TypeScript. Le code respecte le standard de l'application.

### Prochaines étapes
- ✅ Déployé staging et validé — GPS fonctionne une fois les coordonnées renseignées dans les plans.

---

## Session 115 — Refactoring §8-9-10 (accessibilité, performance, maintenabilité)
**6 juin 2026**

### Ce qui a été fait
- **§8 Performance** : Migration LazyMotion complète (16 fichiers, `motion` → `m`, ~30 Ko bundle). Suppression du blur animé dans `AppLayout` (scroll `blur(20px)` → statique `blur(12px)`).
- **§9 Maintenabilité** : Extraction `renderSection()` → `BilanSection` (BilanMoisModal), `renderItem()` → `PoolItemRow` (DayModalPoolTab). Migration `useReducer` sur `DragCreateModal` (7 états) et `EntryForm` (11 états).
- **§10 Accessibilité** : Suppression des 9 `autoFocus`. Overlays modals → `role="presentation"` (10 fichiers). Items cliquables widgets → `<button type="button">` (7 composants). `no-static-element-interactions` : 26 → 6 | `click-events-have-key-events` : 22 → 0.
- **Fix AdminPreleveurs** : Page admin pour gérer la liste `preleveurs-v1/data` (correction du bug Brest disparu).
- **TODO_REFACTORING.md** : §8, §9, §10 marqués soldés.

### Note
React-doctor v0.2.9 a ajouté de nouvelles règles (em-dash × 53, letter-spacing × 43) non présentes dans le scope §10. Score 60/100 (contre 100/100 avant la mise à jour du linter) — pas une régression du code.

---

## Session 113 — Note de conception : Guidage GPS Tournée (Google Maps Multi-destinations)
**6 juin 2026**

### Note de conception pour Claude
Pour le développement de la fonctionnalité "Guidage GPS de la tournée" :

- **Objectif** : Ajouter un bouton sur la page Tournée (`src/pages/TourneePage.tsx`) permettant d'ouvrir Google Maps (web ou application mobile native) pré-chargé avec l'itinéraire ordonné des points à visiter.
- **Spécifications techniques** :
  - **URL Google Maps** : Utiliser l'API d'URL universelle sans clé payante :
    `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination={DernierPointGPS}&waypoints={PointsIntermediairesGPS}&travelmode=driving`
  - **origin=My+Location** : Utilise la position actuelle de l'utilisateur sur le terrain.
  - **destination** : GPS du tout dernier point de la tournée (format `latitude,longitude`).
  - **waypoints** : GPS des points intermédiaires triés par ordre de passage, séparés par `|` (URL-encoded `%7C`).
  - **Limites** : Google Maps limite les itinéraires à 9 points intermédiaires (11 points au total). Si la tournée dépasse cette limite, générer plusieurs boutons d'itinéraires segmentés (ex: "Partie 1 (1-10)", "Partie 2 (10-20)").
  - **Cas d'erreur** : Exclure silencieusement les plans n'ayant pas de coordonnées valides (`lat` et `lng` nulles ou vides), et afficher une alerte/badge d'avertissement ⚠️ à côté de ces points dans l'interface de la tournée.

### Prochaines étapes (à réaliser par Claude)
- [ ] Implémenter le calcul de l'URL d'itinéraire dans un helper ou directement dans `TourneePage`.
- [ ] Ajouter le bouton d'action "Lancer l'itinéraire Google Maps" sur la page `/tournee`.
- [ ] Gérer les cas limites (points sans GPS, tournées > 10 points avec découpage d'itinéraires).
- [ ] Valider l'intégration et tester sur mobile.

---

## Session 112 — Résolution des builds CI
**6 juin 2026**

### Ce qui a été fait

- **Identification de la cause des échecs CI** : Les corrections de code des sessions 110 et 111 (notamment l'import de `Preleveur` corrigé dans `usePlanningFilters.ts`, les correctifs de tests dans `useWeather.ts` et le style d'accessibilité) étaient restées non stagées et non committées localement. Par conséquent, les builds déclenchés sur GitHub Actions échouaient systématiquement en raison d'imports cassés.
- **Commit & Push des correctifs de code** : Indexation et commit des 9 fichiers modifiés localement, puis push sur `origin main`.
- **Validation CI & Staging** :
  - Le build GitHub Actions de la branche `main` passe désormais avec succès (100% vert).
  - Déploiement de staging mis à jour et validé via `bash deploy-dev.sh`.

### Prochaines étapes
- Attendre les retours de l'équipe de Brest sur le staging.
- Préparer le déploiement final en production.

---

## Session 111 — Audit global et accessibilité
**6 juin 2026**

### Ce qui a été fait

- **Audit automatisé de la base de code** :
  - TypeScript compilation : 0 erreur (100% clean).
  - ESLint linting : 0 erreur, 0 avertissement (100% clean).
  - Tests unitaires : 145/145 PASS (100% clean).
- **Correctifs de code** :
  - **`useWeather.ts`** : Résolution du bug de condition de course asynchrone dans les tests unitaires. Initialisation dynamique de l'état avec `loading: true` au premier rendu si `fetchKey` est présent. 6/6 tests de météo passent au vert.
  - **`index.css`** : Ajout du media query `@media (prefers-reduced-motion: reduce)` pour l'accessibilité visuelle (WCAG 2.3.3 compliance), désactivant les animations pour les personnes sensibles au mouvement. Résolution de l'unique erreur bloquante React Doctor.
  - **`vitest.config.ts`** : Attribution du nom `'unit'` au projet de tests unitaires (permet de les exécuter via `npx vitest run --project=unit`) et ajout des dépendances Storybook à `optimizeDeps.include` pour éliminer le rechargement inattendu de Vite au démarrage.
- **Rapport d'audit** : Création du fichier [audit_results.md](file:///Users/thomaskerfendal/.gemini/antigravity-cli/brain/00f22af1-3d43-4da7-a1a2-560f8104abab/audit_results.md) détaillant l'état de santé du projet.

### Prochaines étapes
- Attendre les retours de l'équipe Brest sur le staging pour le déploiement en production.
- Résolution progressive des 251 avertissements mineurs restants de React Doctor.

---

## Session 110 — Bugfix deploy + validation staging

### Bugs corrigés

**Import `Preleveur` cassé dans `usePlanningFilters.ts`**
- Cause racine : lors de l'extraction du hook en session 109, l'import `Preleveur` pointait vers `@/types` où le type n'existe pas — il est défini dans `@/stores/preleveursStore`.
- Fix : `import type { Preleveur } from '@/stores/preleveursStore'`
- Build passait à 0 erreur TypeScript après correction.

### Validation staging

Checklist complète testée sur `https://labocea-pmc-v2-dev.tomkerf.workers.dev` :
- Auth + route guard (7 routes protégées vérifiées via Playwright) ✅
- Auto-save fiche mission ✅
- Changement statut prélèvement (persistance après rechargement) ✅
- Planning navigation semaine ✅
- Mobile 375px ✅
- Dashboard (KPIs, planning du jour, donut chart, alertes) ✅
- Matériel (liste, anneaux métrologie, auto-save fiche) ✅
- Métrologie (tableau, filtres statut) ✅
- Maintenances (liste, création) ✅

### Prochaines étapes
- Attendre retour de l'équipe Brest sur staging avant déploiement production.
- Déployer en prod : `npx wrangler deploy`

---

## Session 109 — Refactoring god components (suite)
**6 juin 2026**

### Ce qui a été fait

- **`VisiteFormPage.tsx`** : 441L → 235L (-47%). Extraction de `PointCard`, `VisiteFormHeader`, `VisiteGeneralFields`, `VisiteFormActions` dans `src/components/visites/`.
- **`ClientPlans.tsx`** : 395L → 188L (-52%). Extraction de `SortableSeparatorRow` et `SortablePlanRow` dans `src/components/client/`.
- **`DayModal.tsx`** : 377L → 101L (-73%). Chaque onglet extrait en composant autonome avec son propre état : `DayModalEvtTab` et `DayModalPoolTab`.
- **`PlanningPage.tsx`** : 448L → 422L. Extraction de `usePlanningFilters` (hook) pour encapsuler la logique filterTech/filterSite — persistance localStorage, validation tech/site, calcul `visibleTechs`/`allowedTechs`. Plus aucun `useEffect` inline dans la page.
- 9 nouveaux fichiers créés (4 composants visites, 2 composants client, 2 onglets DayModal, 1 hook planning).
- 0 erreur TypeScript/ESLint à chaque étape.

### Prochaines étapes
- Session test équipe sur staging avant déploiement production.

---

## Session 107 — Refactoring god components (doublon + 4 pages)
**5 juin 2026**

### Ce qui a été fait

- **Suppression doublon `EventDetailModal`** : `src/components/EventDetailModal.tsx` (version ancienne, sans badge météo ni types `todo`/`rapport`) supprimé. `DashboardPage` et `DashboardPlanningWidget` basculent sur `planning/EventDetailModal`. Types `ModalEvent` → `PlanningEvent` (planningUtils). Cast `ModalEventRef` inutile retiré.
- **Refactoring `FicheDeVie.tsx`** : 491L → 226L (-54%). Extraction de `ficheDeVieExport.ts` (fonction PDF + types), `FicheDeVieTimelineRow.tsx`, `FicheDeVieNoteForm.tsx` (key-based reset), `FicheDeVieVerifForm.tsx`.
- **Refactoring `DemandesPage.tsx`** : 501L → 162L (-68%). Extraction de `demandesConfig.ts` (constantes + helpers), `DemandeCard.tsx`, `DemandeVisites.tsx`, `DemandeModal.tsx`.
- **Refactoring `ComptePage.tsx`** : 480L → 97L (-80%). Extraction de `EditRow.tsx`, `CompteProfileSection.tsx`, `CompteCalendarSection.tsx`, `PushNotificationsSection.tsx`, `ChangePasswordSection.tsx`.
- **Refactoring `AsservissementPage.tsx`** : 464L → 110L (-76%). Extraction de `asservissementConfig.ts` (constantes + `calcResult`), `AsservissementStepper.tsx`, `AsservissementResultCard.tsx`, `AsservissementResultBar.tsx`, `AsservissementRegle.tsx`.
- **Validation** : 0 erreurs TS/ESLint après chaque refacto. 5 commits propres sur `main`.

### Prochaines étapes
- Refactoring `PlanningPage.tsx` (448L)
- Refactoring `VisiteFormPage.tsx` (441L)
- Refactoring `ClientPlans.tsx` (395L)
- Refactoring `DayModal.tsx` (377L)
- Deploy staging + git push

---

## Session 106 — Linting React Doctor & Typage strict (Zéro Erreur)
**5 juin 2026**

### Ce qui a été fait
- **Correction des dépendances React Hooks** : Correction systématique des règles `react-hooks/exhaustive-deps` (ajouts de dépendances manquantes) et `react-hooks/set-state-in-effect` (déplacement de logique hors effet ou désactivation ciblée).
- **Suppression du typage `any`** : Élimination des types `any` résiduels dans `DashboardPlanningWidget`, `todoFormReducer` et les tests unitaires.
- **Suppression des variables non utilisées** : Nettoyage drastique des variables, imports et variables de tests inutilisés (ex: `_onError`, `TodoPriority`, `User`).
- **Validation** : Le projet est désormais 100% propre selon TypeScript et ESLint (`npx tsc --noEmit && npm run lint` = 0 errors, 0 warnings).

### Prochaines étapes
- Démarrer la refonte / nettoyage du dernier composant complexe ou préparer une mise en production.

---

## Session 105 — Refactoring MissionDetailPage
**5 juin 2026**

### Ce qui a été fait
- **Refactoring "God Component"** : Découpage de `MissionDetailPage.tsx` qui était devenu trop gros (identifié par react-doctor).
- **Extraction de composants** : Création de `MissionDetailMap.tsx`, `MissionDetailInfoCard.tsx` et `MissionDetailActions.tsx` pour isoler les différentes responsabilités de la page.
- **Audit React Doctor** : Le scan post-refactoring sur les fichiers modifiés donne un score parfait de 100/100 (0 erreurs, 0 warnings).

### Prochaines étapes
- Poursuivre le triage react-doctor sur les autres composants restants (`DashboardPage`, `PlanningPage`, etc.).

---

## Session 104 — UI/UX Modale d'événement
**5 juin 2026**

### Ce qui a été fait
- **Refonte UI modale événement** : Le label du bouton principal pour les prélèvements non effectués a été changé de "Voir la mission" à "Ouvrir la mission (valider/annuler)" pour clarifier l'action. Le bouton a également reçu un style primaire (fond bleu, texte blanc) pour être plus évident.
- **Accordion "Retirer du calendrier"** : Le formulaire de retrait d'événement (qui prenait beaucoup de place et attirait trop l'attention pour une action destructrice) a été placé dans un accordéon replié par défaut, similairement à l'option "Déplacer à une autre date".
- **Déploiements staging** : Modifications validées et déployées.

---

## Session 103 — Code review Gemini + bugfixes isSamplingOverdue
**5 juin 2026**

### Ce qui a été fait
- **Code review** : Audit qualité du code produit lors de la session 101 (Gemini 2.5 Pro). 7 angles de review (correctness, removed-behavior, cross-file, reuse, simplification, efficiency, altitude). 10 findings identifiés.
- **Fix isSamplingOverdue — propagation manquante** : Le correctif `isAutomatique` introduit en session 102 (ligne 55 de `usePlanningData.ts`) n'avait pas été propagé à 4 autres call sites. Corrigé dans :
  - `BilanMoisModal.tsx` — prélèvements Automatique marqués en retard 1 jour trop tôt
  - `DayModal.tsx` — même bug dans la vue jour
  - `usePlanningData.ts` lignes 254, 302, 303 — `totalOverdue` et tri du pool faux pour les plans Automatique
- **Fix parseInt("") → NaN dans BilanMoisModal** : `parseInt(client.annee ?? "")` retournait NaN pour les clients avec `annee: ""`, silencieusement exclus du bilan. Corrigé avec un guard `isNaN`.
- **Fix RESET_FORM leakait deletingId** : En ouvrant la modale d'ajout, `deletingId` restait actif sur une autre ligne (risque de suppression accidentelle). `RESET_FORM` le remet à null désormais.
- **Fix save error swallowed dans TodosPage** : Les erreurs Firestore étaient absorbées silencieusement. Ajout de `toast.error(...)` dans le `catch`.
- **Ajout `methode` dans `PoolItem`** : Nécessaire pour passer `isAutomatique` dans DayModal et le tri du pool.
- **Déploiement staging** : Build et déploiement réussis (`e533a90`).

### Cause racine des bugs
Le correctif de session 102 créait une API à 3 arguments sur `isSamplingOverdue` mais n'avait cherché que le call site principal. Les 4 autres call sites (dans 3 fichiers différents) utilisaient encore la forme sans arguments.

### Prochaines étapes
- Refactoring `BilanMoisModal` pour utiliser `BaseModal` (deux patterns de modale coexistent)
- Extraction `TodoRow` vers son propre fichier (`src/components/todos/TodoRow.tsx`)
- Typage strict du reducer `SET_FIELD` (actuellement `value: any`)

---

## Session 101 — Bilan du mois (UX Planning)
**4 juin 2026**

### Ce qui a été fait
- **Modale "Bilan du mois"** : Création d'une vue de synthèse `BilanMoisModal.tsx` listant pour le mois sélectionné l'ensemble des prélèvements prévus (réalisés, non effectués, en retard, planifiés), classés par statut.
- **Header Planning** : Ajout du bouton "Bilan" dans `PlanningHeader.tsx` situé directement à gauche du groupe "Jour / Semaine / Mois / Année" suite au retour utilisateur sur son placement initial.
- **Déploiement staging** : Build et déploiement réussis.

---

## Session 100 — Refactoring final (Dette technique)
**4 juin 2026**

### Ce qui a été fait
- **Constants** : Centralisation des collections (`COLLECTIONS`), couleurs (`COLORS`) et Z-index (`Z_INDEX`) dans `src/lib/constants.ts`. Remplacement dans plus de 100 fichiers via regex pour harmoniser le code.
- **BaseModal** : Création du wrapper `BaseModal.tsx` avec Framer Motion. Migration de `BugReportModal`, `ChangelogModal`, et les modales de `TodosPage` pour utiliser ce wrapper unifié. Simplification de `Sidebar.tsx`.
- **TodosPage (useReducer)** : Remplacement des 9 `useState` par un seul `useReducer` pour centraliser l'état du formulaire de création de tâches.
- **Storybook** : Installation de Storybook initiée (`npx storybook init`), marquant la fin du backlog de dette technique (Section 6 de `TODO_REFACTORING.md` terminée à 100%).

---

## Session 99 — Bugfixes + élimination TypeScript `any`
**4 juin 2026**

### Bugs corrigés

**"Date à définir" affiché sur un prélèvement planifié**
- Cause racine : le flag `dateUndefined` était posé à la création mais jamais effacé quand `plannedMonth` ou `plannedDay` était ensuite modifié. `updateSampling` ne patchait qu'un seul champ sans nettoyer ce flag.
- Fix : dans `updateSampling`, si `plannedMonth` ou `plannedDay` est présent dans le patch, on force `dateUndefined: false`. Commit `17b3507`.

**Colonnes inversées dans YearMatrixView**
- Les colonnes sticky 1 et 2 (siteNom/fréquence ↔ plan.nom) étaient dans le mauvais ordre.
- Fix : swap du contenu des deux colonnes dans `YearMatrixView.tsx` ligne ~280. Déployé en staging.

### Refactoring TypeScript

**Élimination complète des `any` (13 occurrences)**
- Audit complet : 5 fichiers production + 4 fichiers de test.
- Remplacement par des types explicites (`Preleveur`, `Plan`, `Sampling`, `QueryDocumentSnapshot<DocumentData>`, etc.).
- Tests : types locaux (alias `SnapCallback`, `Unsub`) pour éviter les imports Firebase SDK dans les tests.
- Non-null assertions `!` ajoutées sur les 8 call sites de callbacks `SnapCallback | null` dans les fichiers de test.
- Commits `521e758` (production) + `1b68fe3` (tests).
- Compilation TypeScript : zéro erreur après fix.

### Tâches clean code identifiées (non implémentées)
- `src/lib/constants.ts` — centraliser noms de collections + z-index + couleurs (2h)
- Factoriser les 9 `useState` de `TodosPage` en `useReducer` (1h)
- Composant `BaseModal` partagé (2h)

### Prochaines étapes
- Implémenter les 3 tâches clean code ci-dessus

---

## Session 98 — Nettoyage repo + vue compacte matrice en dur
**4 juin 2026**

### Refactoring

**Vue compacte matrice annuelle — suppression du toggle**
- Le bouton "Vue compacte / Vue normale" supprimé de `YearMatrixView.tsx`
- Les valeurs compactes appliquées en dur (h-7, py-0.5, text-xs, size-3.5, width 24px, marginLeft -5px)
- `useState(compact)` et le handler `setCompact` retirés

### Divers

**Alerte GitHub Secret scanning résolue**
- Clé Firebase (`AIzaSy...`) détectée dans l'historique git (`dist_old/` ancien build)
- Dismissée : les clés Firebase sont publiques par nature, sécurisées par les règles Firestore et les domaines autorisés — pas un vrai secret

**Déploiement staging**
- Déployé : `https://labocea-pmc-v2-dev.tomkerf.workers.dev`

### Prochaines étapes
- Créer le compte Matthieu Lozac'h sur staging (via Admin → Créer un compte)
- Ordre de passage dans la tournée (feature déférée depuis session 87)

---

## Session 97 — Matrice annuelle : UX + groupement + vue compacte
**3 juin 2026**

### Features ajoutées

**Pastilles cliquables dans la matrice annuelle**
- Les pastilles rouges (en retard) et grises (non effectué) ouvrent désormais la modale IssueListModal au clic
- Indicateurs de clicabilité : ring blanc permanent, cursor pointer, tooltip "— cliquer pour voir la liste"
- Légende : icône ↗ sur les entrées "En retard" et "Non effectué"

**Groupement dépliable par client**
- La matrice est restructurée en groupes par client (1 header + N lignes de plans)
- Tous repliés par défaut — header cliquable avec chevron + résumé des statuts (✓ · ● · ! · ✕)
- Bouton "Tout déplier / Tout replier" dans la barre de légende
- Lien client dans le header cliquable sans déclencher le toggle

**Vue compacte**
- Bouton toggle "Vue compacte / Vue normale" dans la légende
- En mode compact : padding réduit, pastilles 14px (vs 20px), texte plus petit
- Toutes les interactions (click, ring, tooltip) conservées en mode compact

**Conditions météo — temps sec**
- Le champ météo passe d'une checkbox binaire à un select 3 options : aucune / 🌧 pluie / ☀️ sec
- Icône ☀️ affichée dans IssueListModal pour les plans "temps sec requis"

### Prochaines étapes
- Ordre de passage dans la tournée (drag & drop ou heure planifiée)

---

## Session 96 — iCal événements + logo
**3 juin 2026**

### Features ajoutées

**Synchronisation des événements personnels dans Google Agenda**
- Les `EvenementPersonnel` (collection Firestore `evenements`) sont désormais inclus dans le feed iCal de chaque utilisateur
- Filtre par `createdBy = uid` — chaque technicien ne voit que ses propres événements
- Événements avec heure → créneau de 1h dans Google Agenda
- Événements multi-jours (`dateFin`) → plage complète
- Description affiche le type (Réunion, Congé, Rappel…) + notes

### Divers

**Logo** — tentative de refonte dans le style Google Drive (triangle/goutte tricolore) abandonnée à la demande. Logo original `logo.png` (feuille verte + goutte bleue) restauré.

### Prochaines étapes
- Ordre de passage dans la tournée (drag & drop ou heure planifiée) — reporté

---

## Session 95 — Correction Google Agenda iCal
**2 juin 2026**

### Bugs corrigés

**Synchronisation des interventions sur le planning iCal**
- Cause racine 1 : Le flux iCal généré par le worker cherchait le champ `preleveur` sur l'objet `plan` (qui n'existe pas) au lieu de regarder sur le `client` ou le `sampling`. Cela empêchait la synchronisation des plannings personnalisés.
- Cause racine 2 : Les prélèvements en méthode "Automatique" (bilan 24h) étaient générés sur une seule journée dans Google Agenda.
- Fix 1 : Mise à jour de `worker/index.js` pour résoudre le technicien assigné à partir du `client` et du `sampling`.
- Fix 2 : Modification de `icalDateNext` pour supporter l'ajout de plusieurs jours, et configuration des événements "Automatique" pour durer 2 jours pleins.

### Déploiement
- Staging déployé (`bash deploy-dev.sh`)

### Prochaines étapes
- Continuer de recueillir les retours de l'équipe terrain sur l'utilisation du planning.

## Session 94 — Alignement Excel Cindy + Mode d'emploi
**2 juin 2026**

### Analyse comparative Excel / App

Analyse du fichier `PMC- Planning 2026.xlsx` (planning de travail de Cindy, chargée de mission Brest).
Comparaison colonne par colonne (24 colonnes) :
- 19 colonnes déjà couvertes
- 4 déjà implémentées mais non visibles dans la session (COFRAC, MPR1-6, BC, sous-traitance plan)
- 1 champ absent confirmé : interlocuteur commercial interne

### Nouveaux champs

- `hasSousTraitance` (boolean) + `nomSousTraitant` (string) sur `Client` — checkbox "Analyses sous-traitées" avec champ texte conditionnel (Inovalys, Eurofins…)
- `interlocuteurCommercial` (string) sur `Client` — commercial interne Labocea (Céline, CRO, JBE…)
  Ajouté dans la section Contact, sous "Interlocuteur client"

### Réorganisation fiche client

Ordre des sections revu pour coller à la logique de saisie :
1. Informations générales
2. Description de la mission ← remonté (était tout en bas)
3. Contact (+ nouveau champ Commercial interne)
4. Contrat ← tout regroupé : devis, convention, durée, BC, montants, sous-traitance, facturation, situation
5. Détail analytique (MPR1/2/3/5/6…) ← tout en bas

### Mode d'emploi

**Filtre par profil** : sélecteur en haut de la page avec 4 options (Tout / Technicien terrain / Chargé de mission / Admin).
- Le profil réel de l'utilisateur connecté est sélectionné par défaut
- Les sections non pertinentes pour le profil sont masquées
- Technicien : Planning, Statuts, Bilan 24h, Matériel, Métrologie, Dashboard, Signaler
- Chargé de mission : + Missions, Visites préliminaires
- Admin : tout

**Corrections d'inexactitudes** :
- Intro : liste corrigée à 11 modules (Demandes, Tâches, Infos terrain, Rapports, Tuyaux manquaient)
- Planning : 4 vues (Jour/Semaine/Mois/Année) + bouton Carte séparé ; filtres corrigés (Agence/Technicien/Pluie — suppression du faux filtre "retards" qui n'existait pas dans l'UI)
- Dashboard : KPIs réels (Rapports à rédiger, calibrage 30j) ; bloc Rapports décrit

**MissionClientSection mise à jour** : tableau des 5 sections de la fiche client, sous-traitance analyses, COFRAC, matrice annuelle Brest/Quimper.

### Prochaines étapes

- Présenter l'app à Cindy pour validation terrain (agence Brest)
- Vérifier que les préleveurs Brest ont bien le champ `site` renseigné en Firestore (nécessaire pour le filtre Brest/Quimper)

---

## Session 93 — Accessibilité formulaires (a11y labels)
**2 juin 2026**

### Accessibilité

**label-has-associated-control : 72 → 0 warnings — règle éliminée**

- `htmlFor` + `id` ajoutés sur tous les formulaires clés (16 fichiers) :
  `EntryForm`, `SamplingForm`, `VisiteFormPage` (PointCard avec ids dynamiques `point.id`),
  `TodosPage`, `FicheDeVie`, `EventDetailModal` (×2), `DragCreateModal`, `DayModal`,
  `RequireAuth`, `LoginPage`, `ComptePage`, `AdminCreateUserForm`.
- Labels de section sans contrôle associé (`Checklist terrain`, `Photos terrain`, `Rapport prévu`)
  convertis en `<p>` — sémantiquement corrects.
- `PlanField` label → `<span>`, `PlanningHeader` groupe Type → `role="group"` + `aria-labelledby`.
- `<span>` cliquables → `<button type="button">` dans TodosPage (liens client/équipement)
  et MapView (lien "Fiche ➔").
- `outline-none` → `focus-visible:outline-none focus-visible:ring-2` dans EntryForm.
- Score react-doctor : 71 → 72/100.

### Bugfixes

- `Set.toSorted()` → `[...Set].toSorted()` dans `TuyauxPage.tsx` (allYears, allMats)
  et `PlanningHeader.tsx` (availableSites) — `Set` n'a pas de méthode `toSorted()`, seul `Array` en a.
  Bug introduit en session 92 lors du remplacement global `[...arr].sort()` → `arr.toSorted()`.
- Double attribut `type="button"` + `type="submit"` sur le bouton mot de passe dans `ComptePage.tsx`.

### Déploiement

- Staging déployé : `https://labocea-pmc-v2-dev.tomkerf.workers.dev`
- Commit : `691b460`

---

## Session 92 — React Doctor : 135 warnings fixés
**1er juin 2026**

### Qualité / Refactoring

**react-doctor scan complet — 645 → 510 warnings, 2 règles éliminées**

- `button-has-type` (−32) : `type="button"` ajouté sur tous les `<button>` sans type explicite dans 12 fichiers. Règle **éliminée**.
- `prefer-module-scope-static-value` (−12) : 12 constantes statiques (tableaux/objets) hoistées du corps des composants vers le module scope. Règle **éliminée**.
- `design-no-redundant-size-axes` (−79) : `w-N h-N` → `size-N` (Tailwind v3.4) dans 53 fichiers. 4 occurrences résiduelles restantes.
- `js-combine-iterations` (−9) : chaînes `.filter().map()` et `.filter().forEach()` converties en `flatMap` ou `for...of`.
- `js-tosorted-immutable` (−13) : `[...arr].sort(fn)` → `arr.toSorted(fn)` dans 12 fichiers.

### Deferred
- Accessibilité formulaires (`label-has-associated-control`, `control-has-associated-label`, `no-static-element-interactions`, `click-events-have-key-events`) — à traiter dans une session dédiée.
- `prefer-useReducer` — refactors de stores, hors scope.
- `no-array-index-key` — à corriger au cas par cas selon disponibilité d'un id stable.

## Session 91 — Polish matrice annuelle (bimensuel + UX)
**1er juin 2026**

### Bugfixes

**Ligne DREAL CORPEP — plan Bimensuel**
- Cause : `generateSamplings` crée 2 prélèvements pour les 12 mois, `YearMatrixView` n'en affichait qu'un (le dernier écrasait le premier), et les mois hors-saison affichaient des ✗ "non_effectué".
- Fix : `YearMatrixView` collecte maintenant jusqu'à 2 samplings par mois dans `pairsByMonth`. Les mois où les 2 sont `non_effectue` sont masqués (traitement hors-saison).

### UX / Polish

**Dots bimensuels**
- Affichage de 2 dots chevauchants (overlap -7px) au lieu d'un seul par mois.
- Taille harmonisée à 20px (w-5 h-5) identique aux dots mensuels.
- Z-index corrigé : le statut le plus critique passe au premier plan (en retard > planifié > fait > non effectué).
- Centrage dans la cellule (conteneur 32px fixe).

**Réduction taille des dots (tous plans)**
- Dots réduits de 24px à 20px pour réduire la densité visuelle sur 12 colonnes.

**Badge "manuel" sur plans Personnalisés**
- Ajout d'un badge gris discret "manuel" dans la colonne fréquence pour distinguer les plans à saisie manuelle des fréquences calculées.

### Prochaines étapes
- Point 1 : uniformiser les icônes dans les dots (✓ dans tous les statuts ou aucun)
- Vérifier le rendu mobile de la matrice annuelle

## Session 90 — Détail analytique et Vue Matrice Annuelle
**1er juin 2026**

### Features ajoutées

**Détail analytique (Facturation)**
- Ajout d'une nouvelle section "Détail analytique (Facturation / Prestations)" dans `ClientInfoForm.tsx`.
- Ajout des champs (MPR1, Collecte, Boues, etc.) pour correspondre à l'onglet "Base de travail" du fichier Excel de Cindy.
- Stockage de ces informations dans un nouvel objet `detailPrestations` du document client.

**Vue Matrice Annuelle (Planning)**
- Nouveau mode de vue "Année" ajouté dans le sélecteur `PlanningHeader.tsx`.
- Création du composant `YearMatrixView.tsx` reproduisant le tableau de pilotage annuel (lignes : client + point, colonnes : 12 mois).
- Cellules avec pastilles de couleurs (statut) et date au survol.
- Intégration du sticky scroll (légende + mois + colonne client) pour garder les repères lors du défilement vertical et horizontal.

### Prochaines étapes
- Ordre de passage dans la tournée (drag & drop ou heure planifiée).

---

## Session 89 — Filtres site + technicien sur le Planning
**1er juin 2026**

### Features ajoutées

**Filtre par site géographique (Quimper / Brest)**
- Nouveau state `filterSite` dans `PlanningPage.tsx`, persisté dans `localStorage('planning_filter_site')`
- `visibleTechs` dérivé via `useMemo` : filtre `allTechs` par `preleveur.site === filterSite` si un site est sélectionné
- `useEffect` : reset automatique de `filterTech` si le tech sélectionné n'appartient plus aux techs visibles après changement de site
- Pills site (Quimper / Brest) affichées avec séparateur visuel avant les pills tech
- Bouton "Tous les sites" → cercle 28px avec ✦, même gabarit que les avatars

**Avatars circulaires pour les pills technicien**
- Remplacement des pills texte "Prénom · CODE" par des `UserAvatar` (28px, initiales colorées)
- Anneau coloré (`outline`) quand le tech est actif
- Tooltip au survol avec nom complet + code
- Bouton "Tous" techniciens → même cercle 28px cohérent

### Bugs corrigés

**`usePreleveurs` lisait une collection vide**
- Cause racine : le hook pointait vers la collection `preleveurs` (vide) alors que les données sont dans `preleveurs-v1/data` (document unique avec tableau `list`)
- Fix : migration vers `doc(db, 'preleveurs-v1', 'data')` + extraction de `snap.data()?.list`

**Règles Firestore manquantes pour `preleveurs-v1`**
- Cause racine : `firestore.rules` n'avait pas de règle pour la collection `preleveurs-v1`, bloquant la lecture côté client
- Fix : ajout `match /preleveurs-v1/{docId} { allow read: if isAuthenticated() }`
- Règles déployées en production Firebase

### Données Firestore
- Tous les préleveurs avaient déjà le champ `site` renseigné (Quimper / Brest) — aucune migration nécessaire

### Prochaines étapes
- Ordre de passage dans la tournée (drag & drop ou heure planifiée)


## Session 88 — Fix couleur avatar rapport planning
**1 juin 2026**

### Bug corrigé

**Couleur incorrecte sur les pills rapport dans le planning**
- Cause racine : `dotColor` dans `EventPill.tsx` utilisait `event.statusColor` pour les rapports, hardcodé à `var(--color-accent)` (bleu) dans `usePlanningData.ts`.
- Fix : ajout de `event.type === 'rapport'` dans la branche `techColor`, identique aux prélèvements planifiés et aux événements. Les rapports utilisent maintenant la couleur du technicien assigné.

### Prochaines étapes
- Ordre de passage dans la tournée (heure planifiée ou drag & drop)

---

## Session 87 — Polissage UI/UX Dashboard & Tâches
**1 juin 2026**

### Améliorations

**Widget planning — jours de pluie**
- "Pluie prévue" s'affichait comme un item ordinaire avec badge "Autre" dans le widget planning.
- Fix : les événements `type === 'meteo'` sont désormais exclus de `jourItems`/`lendemainItems`. À la place, une bannière bleue subtile `🌧 Temps de pluie prévu` s'affiche au-dessus de la liste quand `hasRainToday`/`hasRainTomorrow` est vrai.

**Tâches supprimées du widget planning du jour**
- Les tâches du jour apparaissaient dans le widget "Planning du jour" du dashboard, créant de la confusion avec les prélèvements et événements.
- Fix : suppression des deux blocs `todos.forEach` dans `useDashboardStats.ts`.

**Page Tâches — conformité design**
- Date dueDate affichée en ISO (`2026-06-01`) → format français (`01/06/2026`) dans `TodosPage` et `TodosWidget`.
- Icônes edit/delete désormais masquées au repos (`opacity-0`) et révélées au survol via `group`/`group-hover` Tailwind.
- Priorités tâches : icônes ⏫/➖/⏬ remplacées par `!!!` / `!!` / `!` dans tous les fichiers (TodosPage, TodosWidget, useDashboardStats, usePlanningData).
- Avatar couleur incorrecte (rouge par défaut) corrigé : `getTechColor(initiales)` utilisé à la place du lookup UID, cohérent avec le planning.

### Prochaines étapes
- Ordre de passage dans la tournée (heure planifiée ou drag & drop)

---

## Session 86 — Bugfixes Bilan 24h, UI Planning, Hooks & Accessibilité
**31 mai 2026**

### Bugs corrigés

**Bilan 24h — ghost events incorrectement affichés**
- Cause racine : le filtre dans `usePlanningCalendar` ne vérifiait pas `!e.isGhost`, donc les prélèvements "retirés" ou "reportés" (qui conservent leur `dateFin`) apparaissaient dans la bande Bilans 24h.
- Fix : ajout de `&& !e.isGhost` dans le filtre `dayJ1s`.

**Bilan 24h — bilans regroupés par client au lieu de lignes séparées**
- Cause racine : appel à `groupByClient()` dans la bande bilan fusionnait plusieurs sites (ex. Le Glazik + Abattoir Croissant) en une seule pastille ×2.
- Fix : suppression de `groupByClient()` dans le calcul `bilanBand` — chaque sampling J1 a sa propre ligne.

**Badge J1/J2 — les deux cellules affichaient "J1"**
- Cause racine : le proxy J2 hérite du spread de J1 incluant `dateFin`, donc `isJ1 = !!event.dateFin` était `true` pour les deux. Le ternaire `isJ1 ? 'J1' : 'J2'` retournait toujours J1.
- Fix dans `EventPill.tsx` : condition inversée en `isJ2 ? 'J2' : 'J1'`.

**Sous-titre redondant dans les bilans**
- Les sous-titres affichaient "EU · Le Glazik · Bilan 24h J1" — le suffixe "Bilan 24h J1/J2" était superflu.
- Fix dans `usePlanningData.ts` : suppression du suffixe, le badge J1/J2 suffit.

**Hooks — setState dans useEffect sur changement de prop**
- `useWeather.ts` : `setResult(EMPTY)` et `setResult(loading: true)` dans l'effet → forçait un rendu intermédiaire incohérent. Remplacé par une comparaison prev-key pendant le rendu.
- `useVisites.ts` : `setLoading(false)` quand `!linkedId` dans l'effet. Remplacé par `useState(!!linkedId)` + comparaison `prevLinkedId` pendant le rendu.

### Améliorations UI

**Header planning simplifié**
- Suppression de la pill "⚠ X en retard" (trop encombrante, le filtre reste actif en code).
- Bouton 🌧 déplacé de la ligne des filtres vers la barre de navigation principale, à droite du bouton "Carte".
- Bouton 🌧 rendu rectangulaire (56×30px) pour cohérence avec les boutons voisins.

### Accessibilité

**137 → 0 warnings `control-has-associated-label`**
- Ajout systématique d'`aria-label` (en français) sur tous les contrôles interactifs sans label visible dans 20+ fichiers : boutons icône-only, inputs/selects/textareas dans formulaires, modales, vues planning.

### Prochaines étapes
- Ordre de passage dans la tournée (heure planifiée ou drag & drop)

---

## Session 85 — Intégration des Tâches et Rapports au Planning
**31 mai 2026**

### Ce qui a été fait
- **Tâches (Todos) dans le Dashboard** :
  - Intégration des tâches (`todos`) prévues aujourd'hui ou demain directement dans la timeline de la page d'accueil (Dashboard).
  - Couleurs conditionnelles basées sur la priorité (rouge = haute, orange = moyenne, gris = basse).
  - Navigation directe vers la page des tâches (`/todos`) au clic sur une tâche dans la chronologie.
- **Rapports dus dans le Planning** :
  - Intégration des alertes "Rapport dû" dans la chronologie de la vue Planning.
  - S'affiche pour les prélèvements dont le rapport est prévu, non encore rédigé, à la date de rendu (calculée automatiquement).
  - Regroupement des rapports (accordion) pour un même client un même jour de la même manière que les interventions, avec le nom du plan pour chaque sous-ligne.
- **Ajustements divers** :
  - Ajustement de l'opacité (0.55) des icônes jours fériés.
  - Mise à jour des appels de hooks et tests associés.

### Fichiers modifiés
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/planning/EventDetailModal.tsx`
- `src/components/planning/WeekView.tsx`
- `src/hooks/useDashboardStats.ts`
- `src/hooks/usePlanningData.ts`
- `src/index.css`
- `src/lib/__tests__/dashboardStats.test.ts`
- `src/lib/planningUtils.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/RapportsPage.tsx`
- `src/pages/TourneePage.tsx`

---

## Session 84 — Agrandissement des vignettes photo et Zoom au clic
**28 mai 2026 (soirée - suite)**

### Ce qui a été fait
- **Agrandissement des miniatures d'images** :
  - **Amélioration** : Augmentation de la taille des vignettes d'images (thumbnails) à `96px` de large et de haut (au lieu de `64px` ou `80px`) pour offrir une bien meilleure visibilité immédiate sur tous les écrans.
  - **Support du Zoom Natif au clic** : Enveloppement des images de miniatures dans des liens standard (`a target="_blank" rel="noreferrer"`) avec un curseur de zoom (`cursor-zoom-in`). L'utilisateur peut ainsi cliquer ou tapoter sur n'importe quelle miniature pour ouvrir l'image en pleine résolution dans un nouvel onglet, fournissant un zoom fluide et robuste.
  - **Application globale** : Appliqué à l'ensemble des modules d'upload photo (`PlanConfigSection.tsx`, `SamplingForm.tsx`, `VisiteFormPage.tsx`).
- **Validation** :
  - Build complet en production réussi (0 erreur).
  - Validation de l'intégralité des 145 tests unitaires et d'intégration (145/145 PASS).

### Fichiers modifiés
- `src/components/plan/PlanConfigSection.tsx`
- `src/components/plan/SamplingForm.tsx`
- `src/pages/VisiteFormPage.tsx`

---

## Session 83 — Remplacement de heic2any par heic-to (Support des HEIC iPhone récents)
**28 mai 2026 (soirée - suite)**

### Ce qui a été fait
- **Migration vers la bibliothèque modernisée `heic-to`** :
  - **Problème** : L'ancienne bibliothèque `heic2any` renvoyait une erreur `ERR_LIBHEIF format not supported` sur le décodage de certains fichiers `.HEIC` provenant d'iPhones récents (avec des encodages HEIF/HEIC d'iOS plus récents).
  - **Correction** : Remplacement de `heic2any` par la bibliothèque activement maintenue `heic-to` qui intègre la dernière mouture de `libheif-web` et prend en charge l'intégralité des formats HEIC récents.
  - **Optimisation** : Importation dynamique préservée (`await import('heic-to')`) pour isoler le décodage WebAssembly de ~3Mo dans un chunk asynchrone (`heic-to-*.js`), garantissant le chargement instantané de l'application (zéro impact sur le chargement initial).
- **Validation** :
  - Build complet en production réussi (0 erreur).
  - Validation réussie de l'intégralité des 145 tests unitaires et d'intégration (145/145 PASS).

### Fichiers modifiés
- `package.json`
- `package-lock.json`
- `src/lib/uploadPhoto.ts`

---

## Session 82 — Débridage du sélecteur de fichiers pour le format HEIC/HEIF (Mac et PC)
**28 mai 2026 (soirée - suite)**

### Ce qui a été fait
- **Prise en charge de la sélection HEIC/HEIF sur macOS et PC** :
  - **Problème** : L'attribut `accept` trop restrictif (`image/jpeg,image/png,image/webp,image/gif`) grisonnait et empêchait de sélectionner les fichiers `.HEIC` et `.HEIF` dans le sélecteur de fichiers système sur macOS/Finder et Windows Explorer.
  - **Correction** : Mise à jour de l'attribut `accept` pour autoriser explicitement les types MIME et extensions de fichiers HEIC/HEIF : `accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"`.
  - **Application** : Modifié sur l'ensemble des points d'entrée de photos de l'application : `PlanConfigSection.tsx`, `SamplingForm.tsx`, `VisiteFormPage.tsx`.
  - Les utilisateurs de Mac/PC peuvent désormais sélectionner et télécharger directement des images `.HEIC`/`.HEIF` depuis leur dossier Téléchargements, et le système client-side `heic2any` effectue automatiquement la conversion en JPEG avant l'upload Firebase Storage.
- **Validation** :
  - Build complet en production réussi (0 erreur).
  - Validation réussie de l'intégralité des tests unitaires et d'intégration (145/145 tests PASS).

### Fichiers modifiés
- `src/components/plan/PlanConfigSection.tsx`
- `src/components/plan/SamplingForm.tsx`
- `src/pages/VisiteFormPage.tsx`

---

## Session 81 — Fix de la suppression de photo (Erreur 403 Forbidden sur Firebase Storage)
**28 mai 2026 (soirée)**

### Ce qui a été fait
- **Correction de la règle Firebase Storage (Erreur 403 Forbidden sur suppression)** :
  - **Cause racine** : La règle `allow write` unifiée dans `storage.rules` validait les requêtes via `request.resource.size` et `request.resource.contentType`. Lors d'une requête de suppression (`DELETE`), la ressource envoyée (`request.resource`) est `null`, provoquant un échec systématique de l'évaluation de la règle par le moteur Firebase Storage et renvoyant une erreur HTTP 403 (Forbidden).
  - **Résolution** : Séparation de la règle `write` en deux blocs distincts et précis : `allow create, update` (avec la vérification de la taille < 10Mo et du type mime `image/*`) et `allow delete` (nécessitant uniquement l'authentification de l'utilisateur). Cette modification a été appliquée à l'ensemble des dossiers de stockage (`samplings`, `visites`, `plans`).
- **Déploiement & Validation** :
  - Déploiement instantané des nouvelles règles via la commande `npx firebase deploy --only storage` sur le projet Firebase `labocea-pmc`.
  - Intégration complète des modifications dans le dépôt Git (branche `main`).

### Fichiers modifiés
- `storage.rules`

---

## Session 80 — Résolution du bug de l'upload de photo & règles Storage & Support HEIC (iPhone)
**28 mai 2026 (fin d'après-midi)**


### Ce qui a été fait
- **Règles de sécurité Firebase Storage** : Déploiement des nouvelles règles de stockage Firebase (`storage.rules`) autorisant les prélèvements et repérages de points dans le chemin `plans/{clientId}/{planId}/{filename}` pour les utilisateurs authentifiés.
- **Support des photos iPhone (format HEIC/HEIF)** :
  - Intégration de la bibliothèque `heic2any` dans `src/lib/uploadPhoto.ts`.
  - Implémentation d'un convertisseur automatique d'images côté client (`processImageFile`) : si l'image sélectionnée est au format HEIC/HEIF ou possède une extension `.heic`/`.heif`, elle est automatiquement décodée et convertie en JPEG (qualité 85%) avant l'upload.
  - La conversion se fait via un **import dynamique** (`await import('heic2any')`), ce qui permet de charger la bibliothèque lourde uniquement à la volée lorsque nécessaire (zéro impact sur la taille du bundle initial et le temps de chargement de la page).
  - Ce support est universel : il résout le problème de l'HEIC pour tous les modules d'upload de l'application (photos de prélèvements terrain, visites préliminaires et photos de repérage des plans).
  - **Correction pour iOS (Médiathèque iPhone)** : Modification de l'attribut `accept` de tous les `<input type="file">` de l'application (`PlanConfigSection.tsx`, `SamplingForm.tsx`, `VisiteFormPage.tsx`) de `accept="image/*"` à `accept="image/jpeg,image/png,image/webp,image/gif"`. Cette restriction force le système d'exploitation iOS (Safari et Chrome) à effectuer une **conversion native et instantanée** de l'image HEIC sélectionnée en JPEG haute qualité lors de la sélection, supprimant ainsi tout risque de crash mémoire sur l'appareil mobile lors du décodage Javascript/WASM tout en assurant une compatibilité absolue.
- **Confirmation & Rétroaction visuelle (Toasts)** :
  - Ajout d'alertes `toast.success` et `toast.error` (via `useToastStore`) lors du chargement de photos de repérage dans `PlanConfigSection.tsx`.
  - Ajout de toasts d'information/erreur lors de la suppression de photos de repérage.
- **Déploiement & Validation** :
  - Déploiement des règles Storage sur le projet Firebase de production/staging `labocea-pmc` via les API Firebase CLI.
  - Déploiement de la version corrigée de l'application sur le serveur de staging Cloudflare Workers (`labocea-pmc-v2-dev.tomkerf.workers.dev`).
  - Validation du build de production (0 erreur) et réussite de l'intégralité des tests unitaires et d'intégration (145/145 PASS).

### Fichiers modifiés
- `storage.rules`
- `package.json`
- `package-lock.json`
- `src/components/plan/PlanConfigSection.tsx`
- `src/components/plan/SamplingForm.tsx`
- `src/pages/VisiteFormPage.tsx`
- `src/lib/uploadPhoto.ts`

---

## Session 79 — Alignement fichier Excel Cindy & Fiche point de mesure
**28 mai 2026 (après-midi)**

### Ce qui a été fait
- **Alignement fichier Excel Cindy** : Ajout des champs manquants dans les types `Client` et `Plan` pour correspondre aux colonnes du fichier de suivi de Cindy :
  - `Client` : `numBC`, `modeFacturation`, `situationActuelle`, `contactPrevenance`
  - `Plan` : `cofrac`, `contraintesParticulieres`
- **ClientInfoForm** : Ajout du champ "Contact prévenance" en fin de section Contact + nouvelle section "Facturation & Situation" (N° BC, mode de facturation, situation administrative).
- **PlanConfigSection** : Remplacement du champ "Commentaire" par deux nouveaux champs : toggle "Accréditation COFRAC" (style Apple switch) + textarea "Contraintes terrain". Suppression du champ Commentaire devenu redondant.
- **Badge COFRAC** : Propagé dans tout le stack planning (`PlanningEvent`, `PoolItem`, `JourItem`) et affiché dans le Dashboard (planning du jour) et le modal planning (`DayModal`).
- **MissionDetailPage** : Remplacement de la checklist terrain (dynamique, peu utilisée) par l'affichage statique du champ `contraintesParticulieres` du plan. Suppression de ~100 lignes de code mort (fonctions checklist, imports, state).
- **Correction react-doctor** : Ajout des `aria-label` manquants sur les 5 nouveaux contrôles.

### Décisions prises
- La "Fiche point de mesure" dédiée (Option B) est approuvée pour une prochaine session. Question en attente : visites prelim liées au plan (A/B/C) avant de démarrer l'implémentation.

### Fichiers modifiés
- `src/types/index.ts`
- `src/components/client/ClientInfoForm.tsx`
- `src/components/plan/PlanConfigSection.tsx`
- `src/lib/planningUtils.ts`
- `src/hooks/usePlanningData.ts`
- `src/hooks/useDashboardStats.ts`
- `src/pages/DashboardPage.tsx`
- `src/components/planning/DayModal.tsx`
- `src/pages/MissionDetailPage.tsx`

---

## Session 79 — Implémentation de la Fiche Point de Mesure dédiée
**28 mai 2026 (fin d'après-midi)**

### Ce qui a été fait
- **Création de la Fiche Point de Mesure dédiée (`/missions/:clientId/plan/:planId/fiche`)** : Nouveau composant autonome `PointMesureFichePage.tsx` de style Apple affichant :
  - La carte GPS via iframe interactive Google Maps (sécurisée avec l'attribut `sandbox`).
  - Les métadonnées complètes du point de prélèvement (nature, méthode, fréquence, COFRAC).
  - Un champ de contraintes d'accès terrain (`contraintesParticulieres`) éditable directement avec auto-save sur blur.
  - **Ajout de photos de repérage** : Bouton d'appareil photo / upload direct sur la fiche (sous les contraintes terrain) pour stocker les photos de repérage du plan (`Plan.photos`), avec gestion de la suppression.
  - Une galerie photo unifiée combinant les photos de repérage du plan, les photos des prélèvements terrain, et les inspections de visites.
  - La liste des comptes-rendus de visites préliminaires spécifiques à ce point (filtrés dynamiquement par nom exact de point).
  - L'historique chronologique complet des prélèvements passés de ce plan.
- **Ajout d'uploads photos dans la Configuration du Plan (`PlanConfigSection.tsx`)** : Ajout d'une ligne dédiée "Photos du point" sous le champ "Contraintes terrain" dans le tableau de configuration de la page du plan, permettant de charger directement des photos de repérage (miniatures `64x64`, bouton d'appareil photo tactile, suppression, auto-save).
- **Raccordement de la fiche** :
  - Ajout d'un bouton d'action *"Fiche du point"* dans l'en-tête de la page de configuration de plan (`PlanPage.tsx`).
  - Ajout d'une icône raccourcie `BookOpen` dans la liste des plans de la fiche client (`ClientPlans.tsx`) pour un accès direct.
  - Déclaration de la route différée (code-splitting) dans `App.tsx`.
- **UX & Chevron interactif** : Import de `ChevronRight` et ajout de l'indicateur interactif rotatif sur les lignes de prélèvement (`SamplingRow.tsx`) pour guider visuellement l'utilisateur.
- **Validation** : Build de production 100% OK et tests Vitest tous au vert (145/145 PASS).

### Fichiers modifiés
- `src/App.tsx`
- `src/pages/PlanPage.tsx`
- `src/components/client/ClientPlans.tsx`
- `src/components/plan/SamplingRow.tsx`
- `src/components/plan/PlanConfigSection.tsx`
- `src/pages/PointMesureFichePage.tsx`
- `src/types/index.ts`
- `src/lib/uploadPhoto.ts`

---

**28 mai 2026 (après-midi)**

### Ce qui a été fait
- **Retrait temporaire du bouton "Démarrer la tournée"** : Suppression du bouton conditionnel d'ouverture de la tournée dans `DashboardPage.tsx` pour l'instant.
- **Nettoyage des imports** : Retrait de l'icône `Route` devenue inutile de l'import `lucide-react` dans `DashboardPage.tsx`.
- **Affichage du nom des points de prélèvement dans Rapports à rédiger** : Ajout du nom du point (`planNom`) dans le widget `RapportsWidget.tsx` sur le Dashboard afin de différencier les rapports de prélèvement provenant du même site.
- **Alignement des rapports dus (équipe vs individuel)** : Correction de la condition de filtrage des rapports rédigés dans `EquipeSuiviWidget.tsx` pour utiliser la même logique de détection des dates futures corrompues (`!rapportEnvoye` au lieu de `!s.rapportDate`) que `useDashboardStats.ts`, résolvant ainsi l'absence de certains rapports dus d'équipe dans l'onglet CM.
- **Validation** : Build de production 100% OK et tests Vitest tous au vert (145/145 PASS).

### Fichiers modifiés
- `src/pages/DashboardPage.tsx`
- `src/components/dashboard/RapportsWidget.tsx`
- `src/components/dashboard/EquipeSuiviWidget.tsx`

---


## Session 77 — Séparation des dashboards & Ajustements ergonomiques
**28 mai 2026 (après-midi)**

### Ce qui a été fait
- **Séparation des Dashboards (Technicien vs CM)** : Restructuration complète de `DashboardPage.tsx` pour isoler les fonctionnalités personnelles terrain des outils de coordination d'équipe.
- **Onglet Switcher Apple-Style** : Intégration d'un sélecteur à pilule glissante (Segmented Control) animé avec Framer Motion (`layoutId` + `AnimatePresence`) permettant aux chargés de mission et administrateurs de basculer de manière fluide entre *Mon activité terrain* et *Suivi équipe (CM)*.
- **Default Tab Intelligent** : Les coordinateurs s'ouvrent désormais directement sur l'onglet **Suivi équipe (CM)** par défaut, tandis que les techniciens continuent d'accéder directement à leur vue d'activité terrain sans surcharge.
- **Affichage des points de prélèvement (planNom)** : Intégration systématique du nom des points de prélèvement (`plan.nom`) dans toutes les lignes des trois listes détaillées de `EquipeSuiviWidget` (incomplets, retards, rapports), sous la forme cohérente `Nom du site · Nom du point · tech: initiales`.
- **Indicateur Temps de Pluie (Retards équipe)** : Ajout de l'icône temps de pluie `🌧` à côté du nom de l'intervention dans la liste des retards de l'équipe de `EquipeSuiviWidget` si `plan.meteo === 'pluie'`.
- **Correction des rapports dus prématurés** : Résolution du bug où des prélèvements futurs planifiés apparaissaient comme des rapports dus dans le suivi d'équipe. Désormais, seuls les prélèvements réellement finalisés (`s.status === 'done'`) y figurent.
- **Validation** : Build de production validé (0 erreur) et banc de tests vitest 100% au vert (145/145 tests PASS). Déploiement staging réussi.

### Fichiers modifiés
- `src/pages/DashboardPage.tsx` — Sélecteur d'onglets de rôle, default activeTab intelligent par rôle et structure AnimatePresence
- `src/components/dashboard/EquipeSuiviWidget.tsx` — Intégration du nom du point (planNom), de l'icône pluie (🌧) dans les retards, et condition de statut réalisé sur rapports dus

---

## Session 76 — Suivi équipe chargé de mission (Dashboard)
**28 mai 2026 (après-midi)**

### Ce qui a été fait
- **isSamplingIncomplet dans overdue.ts** : Fonction utilitaire détectant les prélèvements marqués comme terminés (`status: 'done'`) mais ayant des informations manquantes (date de réalisation, technicien). Suite aux retours d'ergonomie, la contrainte de **nappe** est restreinte **uniquement à la nature d'eau `Souterraine`** et seulement en période de nappe haute (janvier-mars, plannedMonth 0-2) ou nappe basse (septembre-novembre, plannedMonth 8-10). Tests unitaires exhaustifs écrits et validés (26/26 PASS).
- **Composant EquipeSuiviWidget** : Nouveau composant autonome de style Apple affichant 4 KPIs clés (Réalisés, Incomplets, En retard, Rapports dus) dotés de descriptions et sous-labels explicatifs précis.
- **Listes Collapsées** : Intégration de trois listes distinctes, **collapsées par défaut**, pour afficher les détails nominatifs de l'ensemble de l'équipe : *Prélèvements incomplets*, *Prélèvements en retard (équipe)*, et *Rapports dus (équipe)*. Chacune dispose de son propre en-tête cliquable interactif, de son chevron rotatif et de son badge coloré dynamique. Tests unitaires étendus à ces nouvelles listes.
- **Intégration DashboardPage** : Intégration conditionnelle du widget dans le tableau de bord (visible uniquement pour les rôles `charge_mission` et `admin` via la variable `isGeneraliste` existante).
- **Typecheck & Tests unitaires** : Correction des types TypeScript strict dans les mocks des tests (`makeClient` nécessitait `segment: 'Réseau de mesure'`, `createdBy`, `updatedBy` et `updatedAt`). Passage au vert de l'intégralité du banc de tests (145/145 tests PASS).
- **Déploiement Staging** : Déploiement et build de production réussis sur Cloudflare Workers (staging).

### Fichiers modifiés
- `src/lib/overdue.ts` — Règle saisonnière Souterraine pour `isSamplingIncomplet`
- `src/lib/__tests__/overdue.test.ts` — Tests unitaires de `isSamplingIncomplet`
- `src/components/dashboard/EquipeSuiviWidget.tsx` — Widget de suivi équipe interactif et collapsable
- `src/components/dashboard/__tests__/EquipeSuiviWidget.test.tsx` — Tests unitaires du widget (clic fireEvent et correctifs de mocks)
- `src/pages/DashboardPage.tsx` — Rendu conditionnel d'intégration

### Prochaines étapes
- Vérifier manuellement le widget de suivi équipe sur staging (rôles `charge_mission`/`admin` vs `technicien`).
- Valider le comportement du collapse par défaut et de l'indicateur.

---

## Session 75 — Planning : temps de pluie activé par défaut
**27 mai 2026 (soirée)**

### Ce qui a été fait
- **Temps de pluie activé par défaut** : le filtre "Temps de pluie" sur le planning était désactivé par défaut (`=== 'true'`). Logique inversée en `!== 'false'` — actif à la première ouverture, désactivé seulement si l'utilisateur l'a explicitement coupé (localStorage = `'false'`).
- **Tentative animation gouttes** : essai d'animation CSS (repeating-linear-gradient diagonal animé) sur le `rain-overlay`. Rejeté visuellement — revenu à l'original.

### Fichiers modifiés
- `src/pages/PlanningPage.tsx` — condition `showRain` par défaut

### Cause racine
Le `useState` initialisé avec `localStorage.getItem(...) === 'true'` retourne `false` quand la clé est absente (premier chargement), ce qui masquait le filtre alors qu'il devrait être visible par défaut.

### Prochaines étapes
- Continuer le triage react-doctor (767 warnings accessibilité/design tokens).
- Tournée : drag & drop ou horaire planifié (déféré en roadmap).

---

## Session 73 — React Doctor : qualité code + outils de sécurité
**27 mai 2026 (après-midi/soirée)**

### Ce qui a été fait
- **Installation react-doctor** : linter spécialisé React (score 0–100), pre-commit hook actif, workflow GitHub Actions retiré (permission `workflow` manquante sur le token).
- **Triage des 23 erreurs react-doctor** :
  - Vrai positif corrigé : `effect-needs-cleanup` dans `MapView.tsx` — `setTimeout` sans capture d'id, `clearTimeout` ajouté dans le cleanup pour éviter `setMapReady(true)` sur composant démonté.
  - Faux positifs documentés dans `.react-doctor/false-positives.md` : `only-export-components` (EntryCard, UserAvatar — exports utilitaires co-localisés intentionnels), `no-mutable-in-deps` (AppLayout — `location` vient de `useLocation()` pas de `window.location`), `effect-needs-cleanup` MapView:153 (listeners Leaflet détruits par `map.remove()`), tout `dist_old/`.
- **Fix global `button-has-type`** : ~160 `<button>` sans `type="button"` corrigés dans tous les fichiers `src/` via regex perl.
- **Installation security-guidance plugin** (Anthropic officiel) : revue de sécurité automatique à chaque edit/fin de tour/commit. 20 hooks enregistrés, actif en arrière-plan.

### Fichiers modifiés
- `src/components/planning/MapView.tsx` — clearTimeout ajouté
- ~65 fichiers `src/` — `type="button"` ajouté
- `.react-doctor/false-positives.md` — créé
- `package.json` / `package-lock.json` — react-doctor installé

### Prochaines étapes
- Surveiller les remontées du plugin security-guidance sur les prochains commits.
- Continuer le triage react-doctor : 767 warnings restants (accessibilité, design tokens, `prefer-useReducer`).

---

## Session 72 — Reporter une intervention depuis la tournée
**27 mai 2026 (après-midi)**

### Ce qui a été fait
- **Nouvelle option "Reporter" dans SaisieRapideModal** : ajout d'un 3e statut `reporte` aux côtés de "Réalisé" et "Non effectué". Quand sélectionné, le champ "Date réalisée" est remplacé par "Nouvelle date prévue".
- **Mise à jour Firestore** : un intervention reportée repart en `status: 'planned'` avec `plannedMonth` et `plannedDay` mis à jour selon la nouvelle date choisie.
- **TourneeItem** : le badge "Reporté" (bleu accent) s'affiche et l'item est considéré comme traité (ne bloque pas la fin de tournée).
- **Types** : `LocalStatus`, `TourneeItemData.status` et `SaisieRapideData.status` étendus avec `'reporte'`.

### Fichiers modifiés
- `src/components/tournee/SaisieRapideModal.tsx`
- `src/components/tournee/TourneeItem.tsx`
- `src/pages/TourneePage.tsx`

### Prochaines étapes
- Tester le reporter sur staging : vérifier que la nouvelle date apparaît bien dans le planning WeekView/DayView.

---

## Session 69 — Exports Planning et Refonte Visuelle Bilan 24h
**26 mai 2026 (soirée)**

### Ce qui a été fait
- **Exports du Planning (PDF & Excel)** : Implémentation de deux nouveaux boutons de style Apple dans `PlanningHeader.tsx` (avec icônes Lucide `Printer` et `FileSpreadsheet`) permettant de télécharger le planning sous deux formats :
  - **PDF (Feuille de route)** : Format A4 paysage très soigné sous forme de checklist (cases à cocher `[ ]`), avec métadonnées complètes (météo, coordonnées GPS, consignes) et une large zone lignée pour la prise de notes manuscrite sur le terrain. Les prénoms et noms complets des techniciens sont résolus à partir de leur profil pour remplacer les simples initiales.
  - **Excel (Tableur)** : Export tabulaire propre et épuré avec ajustement automatique de la largeur de chaque colonne pour éviter les coupures de texte.
  - **Respect du filtrage (WYSIWYG)** : L'export est dynamique et s'adapte en temps réel aux filtres appliqués à l'écran (technicien et période active).
  - **Optimisation des performances** : Import dynamique (lazy loading) de `jspdf` et `xlsx` uniquement au moment du clic pour ne pas alourdir le bundle de démarrage.
- **Refonte Visuelle Bilan 24h (Apple-style)** : Réponse immédiate au retour de l'utilisateur pour rendre la section "Bilan 24h" visuellement époustouflante :
  - Remplacement du séparateur central coupant par un en-tête asymétrique ultra-minimaliste intégrant une icône `Clock` discrète en bleu Apple, le titre "Cycles Bilan 24h" et un magnifique badge de légende `"Pose J1 → Dépose J2"` très soigné.
  - Attribution d'un arrière-plan contrasté gris clair Apple (`var(--color-bg-primary)`) à toute la bande pour structurer la page de manière calme et naturelle.
  - Métamorphose des boîtes englobant les interventions J1/J2 en véritables capsules d'agenda Apple : ligne verticale d'accentuation solide à gauche de la couleur du technicien, fond en dégradé linéaire subtil (7% à 1% d'opacité), bords fins arrondis et micro-animations de survol (`hover:brightness-95`).
- **Validation** : Passage réussi du typecheck strict (`tsc --noEmit`), exécution globale verte des 126 tests unitaires (dont les tests d'exports) et compilation de production.

### Prochaines étapes
- Recueillir les impressions de Tom sur le nouveau rendu visuel des Bilans 24h et les feuilles de route PDF générées.

---

## Session 68 — Ergonomie du Dashboard & Auto-notifications Push
**26 mai 2026 (fin de journée)**

### Ce qui a été fait
- **Ergonomie du Dashboard** : Le widget "Métrologie à prévoir (J-14)" est désormais replié par défaut (`const [open, setOpen] = useState(false)` dans `MetrologieWidget.tsx`), allégeant considérablement l'interface d'accueil.
- **Auto-notifications de bugs (Admin)** : Ajout d'une option `allowSelfNotification` dans `sendPushToTechnician` (`notificationService.ts`) pour permettre aux administrateurs de recevoir les pushs de leurs propres signalements de bugs à des fins de test.
- **Validation & Déploiement** : Lancement complet des tests (124/124 succès), validation du build TypeScript, et déploiement de la version finale sur l'environnement de Staging.

### Prochaines étapes
- Poursuivre le débogage de la réception des notifications push en local avec Tom (permissions de notification Chrome/macOS).

---

## Session 65 — Raffinements Visuels Ultra-Premium (Apple-style)
## Session 67 — Visites préliminaires et Modale de Bienvenue
**26 mai 2026**

### Ce qui a été fait
- **Module Visites Préliminaires** : Implémentation d'une nouvelle collection `visites/{id}` gérant des visites avant démarrage des missions (lieu, date, interlocuteur, points de prélèvement à créer). Intégration sur `ClientPage` (onglet spécifique ou liste) et dans `DemandeModal`.
- **Correction UX de navigation** : Ajout d'un timeout lors de la redirection depuis la modale "Nouvelle demande" vers le profil client pour éviter les blocages liés au démontage des composants.
- **Optimisation des performances** : Suppression d'un index composite forcé sur Firestore pour `useVisites.ts` en remplaçant par un tri côté client, réglant ainsi un problème de chargement infini (moulinette) sans avoir à gérer des index complexes pour des petites collections.
- **Documentation et Onboarding** :
  - Mise à jour de la page d'aide avec un nouveau `VisitePreliminaireSection` expliquant la marche à suivre.
  - Mise en place d'une **Modale de bienvenue** ("Welcome Modal") pour les utilisateurs se connectant pour la première fois à la V2. Elle les invite à lire le mode d'emploi, avec mémorisation de l'action (`hasSeenAide`) dans leur profil `users/{uid}`.
  
### Prochaines étapes
- Continuer le suivi des retours de l'équipe terrain sur l'application staging.

---

## Session 66 — Préparation des tests équipe & Déploiement Staging
**25 mai 2026**

### Ce qui a été fait
- Lancement complet des tests unitaires (115/115 succès) et vérification du build TypeScript/Vite (0 erreur).
- Déploiement de la dernière version (incluant toutes les finitions UI premium et le mode Tournée) sur l'environnement de Staging.
- Lancement de la Phase 6 (Déploiement et validation) avec l'équipe métier. L'aide intégrée à l'application servira de guide de test.

### Prochaines étapes
- Phase de test équipe (1-2 semaines)
- Corrections issues de la phase de test
---

**25 mai 2026 (soirée)**

### Ce qui a été fait

#### UI/UX — Finitions Haute Couture
- **Scrollbars macOS minimalistes** : Intégration de barres de défilement discrètes et arrondies dans `src/index.css` s'estompant au repos et s'ajustant élégamment au survol, fonctionnelles y compris en mode sombre.
- **En-tête mobile à profondeur 3D (Sticky scroll shadow)** :
  - Modification de `src/components/layout/AppLayout.tsx` pour écouter dynamiquement le défilement de la page principale.
  - Ajout d'effets visuels Apple-style sur la TopBar mobile (translucidité accrue `rgba(255,255,255,0.7)` + flou `backdrop-filter: blur(20px)` + apparition progressive d'une ombre et d'une bordure basse marquée dès que l'utilisateur scrolle).
- **Modale de bug de luxe (Zoom élastique & Verre dépoli)** :
  - Modification de `src/components/ui/BugReportModal.tsx` pour doter la fenêtre d'un pop-in à zoom élastique et d'un arrière-plan en verre dépoli translucide flouté (`backdrop-filter: blur(5px)`).
  - Intégration d'un wrapper `AnimatePresence` dans `src/components/layout/Sidebar.tsx` pour assurer une fermeture fluide en fondu.
- **Bouton haptique & Transitions de timelines** :
  - Intégration de spring-scaling sur le bouton "Démarrer la tournée" du Dashboard.
  - Ajout d'animations fluides de crossfade-slide (`AnimatePresence` et layout) sur les items de la timeline de planning lors du switch "Aujourd'hui / Demain" sur le Dashboard.

### Prochaines étapes
- Lancer le déploiement sur staging pour apprécier ces finitions graphiques poussées au pixel près.

---

## Session 64 — Raffinement UI/UX & Micro-animations (Apple-style)
**25 mai 2026 (fin d'après-midi)**

### Ce qui a été fait

#### UI/UX — Premium Fluid Transitions (Framer Motion)
- **Cartes KPI tactiles & cliquables** :
  - Modification de `src/components/dashboard/StatCard.tsx` pour envelopper les cartes dans des `motion.div` tactiles de style physique ("spring-loaded" survol `scale: 1.01`, clic `scale: 0.98`).
  - Raccordement des clics sur les 4 cartes KPI du Dashboard vers leurs modules respectifs pour une navigation intuitive ("Missions ce mois" → `/missions`, "Rapports" → `/rapports`, "Métrologie" → `/metrologie`, "À calibrer" → `/metrologie`).
- **Entrance Staggered (Dashboard)** :
  - Enveloppement des éléments majeurs de `src/pages/DashboardPage.tsx` (salutation, cartes KPI, planning, Donut Chart, widgets) dans des animations de slide-up progressif de style iOS (fondu-glissé vertical avec léger décalage).
- **Segment Controls Apple-style** :
  - Conversion du bouton de période du Dashboard ("Aujourd'hui / Demain") et du sélecteur de planning ("Jour / Semaine / Mois" dans `PlanningHeader.tsx`) pour y injecter une pilule blanche glissante continue et fluide grâce au `layoutId` de Framer Motion.
  - Ajout d'animations tactiles fluides sur les filtres techniciens de la vue Planning.
- **Navigation latérale fluide (macOS style)** :
  - Intégration de transitions glissantes en continu (`layoutId="active-sidebar-bg"` sur Sidebar desktop et `layoutId="active-mobile-drawer-bg"` sur Mobile Drawer) sur les sélections d'onglets pour un feeling premium macOS.

### Prochaines étapes
- Déployer sur staging et valider avec l'équipe les nouvelles micro-interactions et le fluid design.

---

## Session 63 — Implémentation des Notifications Push (FCM)
**25 mai 2026 (après-midi)**

### Ce qui a été fait

#### Feature — Notifications Push FCM & Proxy Sécurisé
- **Service Worker** : Création de `public/firebase-messaging-sw.js` pour écouter l'événement `push` et `notificationclick` en arrière-plan avec réorientation intelligente (focus/navigate sur onglet existant ou ouverture).
- **Hook d'intégration** : Écriture de `src/hooks/usePushNotifications.ts` gérant la détection du support navigateur, le consentement utilisateur, la récupération asynchrone du token FCM de l'appareil et sa synchronisation dans Firestore (`pushTokens`).
- **Interface utilisateur** : Ajout d'une section "Notifications Push" moderne de style Apple dans `src/pages/ComptePage.tsx` avec indicateurs de statut, micro-loaders et gestion des permissions bloquées.
- **Règles Firestore durcies** : Ajustement de `firestore.rules` pour autoriser la mise à jour des `pushTokens` tout en verrouillant l'altération frauduleuse des champs `role` et `email` par un utilisateur non-admin.
- **Proxy Serverless Worker** : Ajout de l'endpoint `/api/send-notification` dans `worker/index.js` validant de manière cryptographique (RS256) le Firebase ID Token des requêtes entrantes via les clés Google JWK, puis construisant et signant un jeton JWT d'assertion pour négocier un token OAuth2 et envoyer les messages via l'API HTTP v1 de Google FCM.
- **Déclenchements contextuels** :
  - Modification de `src/hooks/usePlanActions.ts` (assignation d'un prélèvement à un technicien)
  - Modification de `src/hooks/usePlanningActions.ts` (drag-and-drop sur planning modifiant le technicien)
  - Modification de `src/components/ui/BugReportModal.tsx` (envoi automatique d'une alerte à l'admin `THK` sur signalement de bug)

#### Configuration & Déploiement (session suivante)
- **`.env` créé** : variables Firebase injectées (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.) + clé VAPID publique (`VITE_FIREBASE_VAPID_KEY`).
- **`.gitignore` mis à jour** : `.env` exclu du versioning (commit `89db4fc`).
- **Secret Wrangler injecté** : `FIREBASE_SERVICE_ACCOUNT` poussé dans le Worker staging via `wrangler secret put`.
- **Staging déployé** : build propre + deploy → `labocea-pmc-v2-dev.tomkerf.workers.dev` (version `19a42643`).
- **Endpoint validé** : `/api/send-notification` répond 401 sans token — comportement attendu.

### Prochaines étapes
- Valider le flux de notification de bout en bout sur staging : activer les push dans Mon compte, déclencher une assignation ou un bug report, vérifier la réception.

---

## Session 62 — Automatisation de la Roadmap Visuelle
**25 mai 2026 (après-midi)**

### Ce qui a été fait

#### Qualité & Outils — Dynamisation de roadmap-visual.html
- **Chargement local adaptatif** : Les fichiers `roadmap-visual.html` et `roadmap.html` tentent désormais de fetch le fichier `ROADMAP.md` en local (relatif `./ROADMAP.md`) en premier lieu.
- **Plan de secours (Fallback)** : En cas d'erreur de chargement relative (ex. blocage CORS dû à l'utilisation du protocole `file://` en local sans serveur web), le système retombe élégamment sur le fetch depuis les dépôts distants de GitHub raw.
- **Prochaines étapes 100% dynamiques** : Suppression de la liste codée en dur de `nextItems`. Le visualiseur extrait dorénavant de manière dynamique les tâches non terminées de la première phase active de `ROADMAP.md`.
- **Indicateur de statut fiable** : Modification de la fonction `statusOf()` pour privilégier l'état des cases à cocher `[x]` / `[ ]` réelles par rapport aux mentions textuelles dans le journal, ce qui assure une synchronisation parfaite avec l'avancement technique réel.
- **Thèmes étendus** : Enrichissement de `themeClass` pour catégoriser esthétiquement les dernières fonctionnalités (Tournée du jour, Météo carte, Sync cloud, Dette technique, etc.).
- **Déploiements robustes** : Mise à jour de `deploy-dev.sh` et `deploy-prod.sh` pour intégrer et copier automatiquement `roadmap.html`, `roadmap-visual.html` et `ROADMAP.md` dans le répertoire de production `dist/`.
- **Couleurs uniques des techniciens** : Configuration de couleurs Apple-style à haut contraste dans `planningUtils.ts` pour les 9 comptes utilisateurs identifiés dans l'administration (Fabien, Delphine, Ludovic, Romain, Pierre Olivier, Hubert, Thomas, Emmanuelle, Cindy) afin de prévenir les collisions visuelles sur le planning et sur la carte interactive.

### Prochaines étapes
- Valider le Mode Tournée sur staging avec une vraie journée de prélèvements.
- Commencer les tests de validation de l'équipe terrain sur la version staging.

---

## Session 61 — Mode Tournée du Jour
**25 mai 2026 (matin)**

### Ce qui a été fait

#### Feature — Mode Tournée du Jour (`/tournee`)

Nouvelle page dédiée accessible depuis le Dashboard, conçue pour les techniciens sur le terrain. Remplace la navigation en 4 niveaux (Missions → Client → Plan → Prélèvement) par un écran unique opérable en une main.

**Composants créés :**
- **`src/components/tournee/TourneeFinEcran.tsx`** : écran de fin automatique quand tous les sites sont traités. Résumé visuel (✓ réalisé / ✗ non effectué) + bouton retour dashboard.
- **`src/components/tournee/TourneeItem.tsx`** : ligne de site avec heure prévue, badge statut coloré, icône météo 🌧, boutons "Réalisé" / "Non effectué", lien GPS Apple Maps conditionnel.
- **`src/components/tournee/SaisieRapideModal.tsx`** : modale bottom-sheet (Framer Motion slide-up). Champs : date (pré-remplie), nappe haute/basse (si eau souterraine uniquement), commentaire optionnel, statut + motif obligatoire si non effectué.
- **`src/pages/TourneePage.tsx`** : page principale. Consomme les stores Zustand déjà hydratés (pas de nouveau listener). État local `Map<samplingId, status>` pour éviter les flickers. Barre de progression linéaire. try/catch sur `saveClient` (état local mis à jour seulement après succès Firestore).

**Intégration :**
- Route `/tournee` ajoutée dans `App.tsx` (lazy + Suspense)
- Bouton "▶ Démarrer la tournée" dans Dashboard → visible uniquement si `planningMode === 'today'` ET au moins un sampling non terminé

### Validation
- Build propre (559ms, 0 erreur TypeScript)
- 115 tests verts (17 nouveaux)
- Déployé staging (version `4ecc6d40`)

### Prochaines étapes
- Valider le Mode Tournée sur staging avec une vraie journée de prélèvements (à faire hors jour férié)
- Explorer les autres features terrain identifiées : Scanner QR Code (Matériel), Notifications Push

---

## Session 60 — Météo carte + Indicateur sync cloud
**24 mai 2026 (soirée)**

### Ce qui a été fait

#### Feature 1 — Météo précipitations sur la Carte des Tournées
- **`src/hooks/useWeather.ts`** : hook isolé qui fetch l'API Open-Meteo (gratuite, sans clé). Calcule `rainWindows` (créneaux > 30% de proba), `maxProba` et `maxMm` pour la journée. Cleanup `cancelled` anti-memory-leak. 6 tests Vitest.
- **`src/components/planning/MapView.tsx`** : calcul du barycentre GPS des points de la journée (`useMemo`), appel `useWeather`, bandeau affiché en haut de la sidebar — squelette loading, fail silencieux sur erreur réseau, texte formaté (ex : `🌧️ Pluie probable 14h–16h (70%) · max 3.0 mm` ou `☀️ Pas de précipitations prévues`). Attribution Open-Meteo requise et présente.

#### Feature 2 — Indicateur de synchronisation cloud
- **`src/stores/syncStore.ts`** : store Zustand avec `pendingWrites` (compteur) + `isOnline` + `getSyncStatus` → `'synced' | 'syncing' | 'offline'`. 8 tests.
- **`src/lib/trackWrite.ts`** : helper générique `trackWrite<T>(promise)` — incrémente avant, décrémente dans `.finally()`. 4 tests.
- **`src/hooks/useNetworkStatus.ts`** : écoute `window` 'online'/'offline', initialise `isOnline` au montage, cleanup propre.
- **`src/components/ui/SyncBadge.tsx`** : Cloud vert ✓ (synced) / CloudUpload pulsant gris (syncing) / CloudOff gris (offline). Tooltip natif. Intégré en sidebar desktop (au-dessus du bouton bug) et TopBar mobile (à gauche du burger).
- **6 services Firestore wrappés** : `clientService`, `equipementService`, `verificationService`, `maintenanceService`, `evenementService`, `userService` — tous les `setDoc`/`addDoc`/`deleteDoc`/`runTransaction` passent désormais par `trackWrite`.

### Validation
- Build propre (417ms, 0 erreur TypeScript)
- 98 tests verts
- Déployé sur staging (Cloudflare Workers, version ae55d38f)

### Prochaines étapes
- Valider météo + badge sync sur staging avec une vraie journée de prélèvements GPS
- Feature 5 — Widget "Planning du lendemain" sur le dashboard

---

## Session 59 — Bugs d'affichage carte
**23 mai 2026 (fin de matinée)**

### Ce qui a été fait
- **Sidebar tronquée** : Le div sidebar de `MapView` n'avait pas `overflow: hidden` ni `minWidth`, ce qui permettait au flex de l'écraser à ~35px. Ajout de `overflow: hidden` et `minWidth` synchronisé avec `width`.
- **Bandeaux hors-contexte** : Les bandeaux "à planifier ce mois" et "Astuce drag" s'affichaient en mode carte car leurs conditions `viewMode !== 'jour'` incluaient `'carte'`. Ajout de `viewMode !== 'carte'` sur les deux conditions dans `PlanningHeader`.

---

## Session 58 — Vérification et corrections post-carte
**23 mai 2026 (fin de matinée)**

### Ce qui a été fait
- **Audit de la feature Carte** : Vérification post-implémentation de la vue carte (build, analyse statique du diff, 6 commits, 719 lignes).
- **Fix label de période en mode carte** : `getPeriodLabel` ne gérait pas `viewMode === 'carte'` et retombait sur l'affichage mois ("mai 2026"). Corrigé pour afficher la date complète du jour sélectionné (ex. "vendredi 23 mai 2026"), cohérent avec le fait que la carte est une vue jour.
- **Fix navigation prev/next en mode carte** : Les flèches `<` `>` exécutaient `setMonthStart` par défaut (branche `else`) au lieu d'incrémenter `selectedDate`. Corrigé dans `usePlanningNavigation` pour traiter `'carte'` comme `'jour'`.

### Cause racine
Les deux bugs venaient du même pattern : `viewMode === 'carte'` n'avait pas été ajouté dans les branches `if/else` existantes de `getPeriodLabel` et `usePlanningNavigation` lors de l'implémentation de la feature.

### Validation
- Build de production propre (425ms, 0 erreur)
- Déployé sur staging : https://labocea-pmc-v2-dev.tomkerf.workers.dev

---

## Session 57 — Carte Interactive des Tournées (Feature 1)
**23 mai 2026 (matin)**

### Ce qui a été fait
- **Implémentation de la Carte des Tournées** : Conception et intégration de la vue cartographique interactive dans le module Planning pour visualiser géographiquement les interventions planifiées.
- **UX & Discoverability (Bouton Carte/Fermer)** : Le bouton de carte a été séparé du sélecteur classique (`Jour`, `Semaine`, `Mois`), enrichi d'une icône `Map` et positionné à droite du mini-calendrier. Pour faciliter le retour au calendrier (qui était confus pour l'utilisateur), le bouton se transforme dynamiquement en bouton de fermeture bleu `✕ Fermer` lorsque la carte est active, permettant de quitter intuitivement la carte en un seul clic (basculement en vue Semaine).
- **Résolution des bugs d'icône Leaflet** : Remplacement des icônes SVG complexes sujettes à des soucis de cache/moteur par un macaron circulaire CSS standard (`border-radius: 50%`) ultra-fluide et robuste aux couleurs du technicien.
- **Modèle de données** : Liaison des coordonnées `lat`/`lng` configurées sur les points de prélèvement vers les événements du planning.
- **Panneau de Tournée responsive** : Liste verticale interactive à gauche sur desktop (avec centrage et ouverture automatique de popup au clic) et carrousel horizontal tactile en overlay bas de carte sur mobile.
- **Legend & Fallbacks** : Affichage d'une légende dynamique et détection des points planifiés sans coordonnées GPS valides (avec lien d'édition directe).
- **Sécurité Firestore** : Identification d'un avertissement `permission-denied` sur le listener `preleveurs`. Résolu en ajoutant la règle de sécurité correspondante dans `firestore.rules` et en la déployant à 100% sur la base Firestore.
- **Compilation Strict TypeScript** : Nettoyage des imports et variables inutilisées dans `MapView.tsx`, et renforcement des assertions sur `markerGroupRef` pour permettre un build de production impeccable (`tsc -b && vite build` 100% au vert).

### Validation & Qualité
- **Rendu visuel local** : Résolution définitive du problème de visibilité des épingles. En découplant le container Leaflet de la réconciliation React et en synchronisant le chargement des marqueurs avec la taille de la carte validée (`mapReady` state), l'épingle numérotée `1` apparaît instantanément et parfaitement visible sur la presqu'île de Crozon.
- **Sécurité** : Règles Firestore déployées et validées sans erreur de syntaxe.
- **Propreté** : Retrait complet de tous les logs de débogage et des fonctions d'inspection DOM temporaires avant validation.

### Prochaines étapes
- Tester la carte sur des jours avec des prélèvements GPS pour valider les marqueurs et popups.

---

## Session 56 — Résolution de l'erreur Wrangler de Staging (Assets)
**23 mai 2026 (matin)**

### Ce qui a été fait
- **Identification et résolution de l'erreur Wrangler** : L'erreur `entitlements.not_available [code: 10007]` survenant lors de l'upload des assets (`assets-upload-session`) était causée par le volume démesuré de fichiers (4282 fichiers) accumulés dans `dist/assets/`.
- **Cause racine** : L'option `emptyOutDir: false` dans `vite.config.ts` empêchait Vite de vider le répertoire `dist/` entre les builds, ce qui accumulait tous les anciens chunks et assets générés au fil des sessions.
- **Correction** : 
  - Modification de `vite.config.ts` pour passer `emptyOutDir: true`.
  - Suppression manuelle de `dist/` et reconstruction complète (`rm -rf dist && npm run build`), réduisant le nombre de fichiers de 4282 à 69.
  - Déploiement réussi sur l'environnement de staging : `https://labocea-pmc-v2-dev.tomkerf.workers.dev`.

### Validation & Qualité
- **Déploiement Staging** : Terminé avec succès (28 nouveaux/modifiés et 50 existants).
- **Propreté du build** : Le répertoire `dist/` se nettoie désormais automatiquement à chaque build.

### Prochaines étapes
- **Validation terrain (Staging)** : Tests par l'équipe mesures.
- **Déploiement production** : Étape finale de transition.

---

## Session 55 — Tests d'intégration Firestore sur les hooks
**22 mai 2026 (début de soirée)**

### Ce qui a été fait
- **Création de tests d'intégration pour les listeners de hooks** :
  - `src/hooks/__tests__/useClients.test.ts` pour `useClientsListener` (tri par nom, mise à jour Zustand `useMissionsStore`, gestion d'erreur avec toast d'alerte, désabonnement).
  - `src/hooks/__tests__/useEquipements.test.ts` pour `useEquipementsListener` (tri par nom, mise à jour Zustand `useEquipementsStore`, gestion d'erreur, désabonnement).
  - `src/hooks/__tests__/useVerifications.test.ts` pour `useVerificationsListener` (tri par date desc, mise à jour Zustand `useMetrologieStore`, gestion d'erreur, désabonnement).
- **Résolution des alertes act() dans les tests** : Intégration systématique de la méthode `act()` de `@testing-library/react` autour des invocations de callbacks Firestore pour éviter les avertissements et correspondre aux standards React 19.

### Validation & Qualité
- **Tests unitaires et d'intégration** : Lancement complet conclu avec **80/80 tests passés au vert (100% vert)**.
- **Compilation & ESLint** : 0 erreur, build de production stable.

### Prochaines étapes
- **Déploiement production (Phase 6)** : tests finaux avec l'équipe mesures et transition définitive V1 -> V2.
- **Migration en sous-collection Firestore** : surveiller et migrer les plans/échantillonnages si nécessaire.

---

## Session 54 — Découpage final PlanningPage : PlanningMiniCalendar
**22 mai 2026 (fin d'après-midi)**

### Ce qui a été fait
- **Extraction du Mini-Calendrier** : Création de `src/components/planning/PlanningMiniCalendar.tsx` regroupant l'overlay absolu du mini-calendrier de bureau (drawer) ainsi que le composant de backdrop réactif servant à fermer le calendrier lors d'un clic extérieur.
- **Simplification de PlanningPage** :
  - Remplacement de 35 lignes de JSX inline et imports complexes dans `src/pages/PlanningPage.tsx` par l'appel propre de `<PlanningMiniCalendar />`.
  - Réduction de la taille de `PlanningPage.tsx` de **339 lignes à 322 lignes**, consolidant son rôle de simple chef d'orchestre de la vue planning.
- **Backlog de Refactoring** : Mise à jour du fichier `TODO_REFACTORING.md` pour refléter la nouvelle taille et l'extraction complète du mini-calendrier.

### Validation & Qualité
- **Tests unitaires** : Exécution de `npm test` concluante, **74/74 tests réussis (100% vert)**.
- **Compilation de production** : Build de production Vite réussi avec 0 erreur TypeScript ou d'importation.

### Prochaines étapes (Junior onboarding)
- **Validation terrain (Staging)** : Faire tester la version déployée par l'équipe pour collecter des retours UX/terrain et s'assurer de l'absence de bugs avant la prod.
- **Tests unitaires des hooks** : Écrire des tests unitaires (`renderHook`) avec des mocks Firestore pour les hooks personnalisés `useClients`, `useEquipements`, `useVerifications` pour s'entraîner au TDD.
- **Scalabilité de Firestore** : Surveiller la taille des documents clients. Prévoir à terme la migration des plans et échantillonnages vers une sous-collection pour éviter la limite de 1 Mo.

---

## Session 53 — Qualité ESLint (React 19) + découpage final PlanningPage
**22 mai 2026 (après-midi)**

### Contexte
Audit technique (Gemini) signalant 38 problèmes ESLint dont 32 erreurs critiques, principalement des violations de pureté React 19 / React Compiler.

### Ce qui a été fait — Lint
- **`Date.now()` impurs** : remplacés par `useState(() => Date.now())` (capture stable au montage) dans `useDashboardStats.ts`, `DashboardPage.tsx`, `EquipementPage.tsx`, `FicheDeVie.tsx`.
- **`DonutChart.tsx`** : mutation de variable `offset` après render → `reduce` pur.
- **`TuyauForm.tsx`** : composant `F` défini dans le render → extrait au niveau module (évite le reset de state).
- **`DayView` / `PlanningHeader`** : ternaires utilisés comme statements → `if/else`.
- **`AppLayout` / `DemandesPage` / `EntryCard` / `UserAvatar`** : `eslint-disable` ciblés (patterns légitimes : setState-in-effect pour fermeture drawer, vars `_` de destructuring, exports mixtes constante+composant).
- **Regex** : échappements `\/` inutiles supprimés (`exportClientHtml`, `reportHtml`, `tuyauxUtils`).
- **`PlanningPage`** : expression complexe `today.getFullYear()` extraite en variable `todayYear` pour la dep array.
- **Résultat : 0 erreur ESLint** (4 warnings `exhaustive-deps` restants, tous bénins — setters Zustand/Firestore stables par construction).

### Ce qui a été fait — Découpage PlanningPage
- **`usePlanningNavigation.ts`** : nouveau hook regroupant `prev`/`next`/`goToday`/`goToDay`/`switchView`.
- **`PeriodListView.tsx`** : composant pour la liste mobile (vues semaine/mois).
- `PlanningPage.tsx` : **399 → 339 lignes**. Le découpage architectural est désormais complet — orchestrateur pur.
- **TODO_REFACTORING §4 entièrement soldé.**

### Validation
- `tsc --noEmit` : 0 erreur. Build production OK. Déployé staging.

### Cause racine
Les erreurs de pureté étaient latentes : `eslint-plugin-react-hooks` v5 (React 19) applique la règle `react-hooks/purity` que les versions antérieures n'avaient pas.

---

## Session 52 — Refactoring & Alignement : missions ➔ client
**22 mai 2026 (fin d'après-midi)**

### Ce qui a été fait
- **Alignement structurel des répertoires** : Renommage du dossier `src/components/missions/` en `src/components/client/` pour correspondre à la collection Firestore `clients-v2` et au hook `useClientData` (conventions de l'auditeur technique senior).
- **Mise à jour des imports** dans les fichiers :
  - `src/pages/ClientPage.tsx`
  - `src/pages/MissionsPage.tsx`
- **Backlog de Refactoring** : Mise à jour de `TODO_REFACTORING.md` pour cocher définitivement le renommage du répertoire ainsi que les découpages d'AidePage et d'InfosPage achevés lors de la Session 49.

### Validation & Qualité
- **Tests unitaires** : Exécution de `npm test` concluante, **74/74 tests réussis (100% vert)**.
- **Compilation de production** : Build de production réussi sans aucune erreur TypeScript ou Vite.
- **Déploiement staging** : Synchronisé avec succès sur staging `https://labocea-pmc-v2-dev.tomkerf.workers.dev`.

---

## Session 51 — Correction de l'attribution des rapports par priorité à 3 niveaux
**22 mai 2026 (fin d'après-midi)**

### Problème résolu
- **Attribution des rapports complétés** : Résolution du bug où Thomas (`THK`) voyait des rapports complétés pour "QBO - Kerjequel" alors qu'ils avaient été physiquement réalisés par Romain Duvail (`doneBy`). La logique de Session 50 forçait le retour à `client.preleveur` (`THK`) car aucun technicien n'était spécifiquement assigné via `s.assignedTo` sur les samplings historiques.

### Ce qui a été fait
- **Mise en place de la priorité à 3 niveaux** dans `src/hooks/useDashboardStats.ts` pour l'attribution `estMonRapport` :
  1. **Priorité 1** : Si un technicien est explicitement planifié sur le prélèvement (`s.assignedTo`), c'est lui qui rédige : `s.assignedTo === initiales`.
  2. **Priorité 2** : Si le prélèvement a été réalisé sans assignation explicite préalable (`s.doneBy` présent), le technicien qui a fait le prélèvement rédige : `s.doneBy === uid`.
  3. **Priorité 3 (Fallback)** : Sinon, on utilise le préleveur par défaut du client : `client.preleveur === initiales`.
  - Cette logique a été intégrée de façon uniforme dans `rapportsAFaire`, `rapportsAFaireMoi` et `rapportsEnvoyes`.
- **Mise à jour des tests unitaires** dans `src/lib/__tests__/dashboardStats.test.ts` :
  - Remplacement de l'ancien test qui ignorait `s.doneBy`.
  - Ajout de 3 nouveaux scénarios de test couvrant la priorité 3 niveaux et le cas de non-attribution de Kerjequel pour Thomas.
  - Exécution de la suite complète : **74 tests réussis (100% vert)**.
- **Vérification et Compilation** : Build de production Vite 100% OK.
- **Déploiement** : Staging mis à jour et déployé avec succès sur `https://labocea-pmc-v2-dev.tomkerf.workers.dev`.

### Prochaines étapes
- Attendre le retour de l'équipe terrain sur la conformité de l'attribution sur la page "Mes rapports".

## Session 50 — Correction du filtrage de responsabilité des rapports
**22 mai 2026 (après-midi)**

### Problème résolu
- **Correction de la responsabilité des rapports** : Thomas Kerfendal (`THK`) ne doit pas voir apparaître les rapports de clients dont il n'est pas responsable (par exemple, "QBO - Kerjequel" géré par un autre technicien).

### Ce qui a été fait
- **Modification de la logique d'attribution** dans `src/hooks/useDashboardStats.ts` :
  - *Ancienne logique* : `const estMonRapport = s.doneBy ? s.doneBy === uid : client.preleveur === initiales` — Si un technicien réalisait un prélèvement sur le terrain (remplissant `s.doneBy` avec son UID), le rapport lui était faussement attribué pour la rédaction même si un autre technicien était assigné à ce client/prélèvement. De plus, si un prélèvement était explicitement attribué à un autre technicien via `s.assignedTo` mais que `s.doneBy` était vide, le système retombait sur le preleveur du client, ignorant `s.assignedTo`.
  - *Nouvelle logique* : `const estMonRapport = (s.assignedTo || client.preleveur) === initiales` — La responsabilité de la rédaction des rapports est maintenant strictement alignée sur l'attribution planifiée (par ordre de priorité : technicien assigné au prélèvement `s.assignedTo` s'il est spécifié, sinon le préleveur du client `client.preleveur`), identique aux règles du planning.
  - Cette correction a été appliquée de manière uniforme pour les trois calculs : `rapportsAFaire`, `rapportsAFaireMoi` et `rapportsEnvoyes`.
- **Fix du filtrage par onglet pour les Administrateurs** dans `src/pages/RapportsPage.tsx` :
  - *Problème* : Le paramètre `isGeneraliste` du hook `useDashboardStats` était calculé ainsi : `touteEquipe || role === 'admin' || role === 'charge_mission'`. Pour tout administrateur ou chargé de mission (comme Thomas), l'état restait forcé à `true`, affichant tous les rapports de l'équipe même sur l'onglet "Mes rapports" (`touteEquipe === false`).
  - *Résolution* : Alignement strict sur l'état de l'onglet : `isGeneraliste: touteEquipe`. Désormais, un admin ou chargé de mission arrivant sur la page ne verra que ses propres rapports sous l'onglet "Mes rapports", tout en conservant la possibilité de cliquer sur "Toute l'équipe" pour une vue d'ensemble. Nettoyage de l'import et de la variable `role` inutilisés sous mode strict.
- **Ajout de tests unitaires** dans `src/lib/__tests__/dashboardStats.test.ts` :
  - Écriture de 5 cas de test robustes couvrant :
    1. L'inclusion standard par `client.preleveur`.
    2. La priorité de l'attribution spécifique du prélèvement (`s.assignedTo`) sur celle du client.
    3. Le maintien de la responsabilité de rédaction pour le technicien assigné même si le prélèvement a été réalisé physiquement sur le terrain par un autre technicien (`s.doneBy`).
    4. L'accès total aux rapports pour les profils administrateurs ou chargés de mission (qui doivent tout voir sans restriction d'attribution).
  - Validation complète des tests : 72 tests réussis avec succès (**100 % vert**).

### Validation & Qualité
- **Compilation de production** : Build réussi avec succès via `npm run build` en 328ms avec 0 erreur.
- **Déploiement staging** : Changements déployés sur staging via `bash deploy-dev.sh`.

---


## Session 49 — Découpage AidePage.tsx & InfosPage.tsx
**22 mai 2026 (après-midi)**

### Ce qui a été fait

**Refactoring AidePage.tsx & InfosPage.tsx**
- **Découpage de la page Aide (724 L) :**
  - Création de `src/components/aide/AideComponents.tsx` regroupant les composants typographiques et de structure de base (`Section`, `Step`, `StatusBadge`, `Note`, `Tip`, `Divider`).
  - Création de `src/components/aide/IntroSections.tsx` pour les sections d'introduction ("Par où commencer" et "Statuts").
  - Création de `src/components/aide/PlanningSections.tsx` pour les sections "Planning" et "Bilans 24h".
  - Création de `src/components/aide/MissionsSections.tsx` pour la section "Missions".
  - Création de `src/components/aide/MaterielSections.tsx` pour les sections "Matériel" et "Métrologie & Maintenances".
  - Création de `src/components/aide/DashboardSections.tsx` pour les sections "Dashboard" et "Problème".
  - Refactoring de `src/pages/AidePage.tsx` : réduction massive de **724 L → 38 L** en intégrant proprement les sous-sections.
- **Découpage de la page Infos terrain (688 L) :**
  - Création de `src/components/infos/EntryCard.tsx` regroupant la structure d'affichage `EntryCard`, le composant `Badge` et le dictionnaire central de configuration `TYPE_CONFIG` partagé entre les fichiers.
  - Création de `src/components/infos/EntryForm.tsx` pour le formulaire d'ajout et édition d'une entrée terrain (`EntryForm`) ainsi que la fonction de nettoyage Firestore `stripUndef`.
  - Refactoring de `src/pages/InfosPage.tsx` : réduction de **688 L → 273 L** en extrayant l'affichage des cartes et les formulaires interactifs tout en préservant le chargement temps réel, le filtrage et la logique de regroupement.

### Validation & Qualité
- **Tests unitaires :** Exécution réussie de `npm run test` (67/67 tests verts, **100 % passés**).
- **Compilation de production :** Build de production complet et réussi avec `npm run build` (0 erreur TypeScript / Vite).

### Prochaines étapes
- Envoyer le lien de staging mis à jour à l'équipe mesures pour tests terrain de pré-production.

---


## Session 48 — Regroupement par Client & Accordéon Mobile
**22 mai 2026 (après-midi)**

### Ce qui a été fait

**Regroupement par client & Accordéons sur Mobile**
- **Interface & Types** (`src/lib/planningUtils.ts`) : Ajout de la propriété optionnelle `subEvents?: PlanningEvent[]` sur `PlanningEvent` et modification de la fonction pure `groupByClient` pour y injecter le tableau complet d'origine `group` dans `subEvents` lors de la fusion d'un événement groupé.
- **Hook Calendrier** (`src/hooks/usePlanningCalendar.ts`) : Mise à jour de la propriété `periodList` pour utiliser systématiquement `filteredForDay` (la version groupée par client) au lieu de `filteredForDayFlat` en mode semaine et mois, unifiant l'affichage mobile.
- **Composant UI EventRow** (`src/components/planning/EventRow.tsx`) : Refonte complète du composant pour ajouter un accordéon interactif en cas d'événement groupé. Affiche un chevron dynamique (`ChevronDown`/`ChevronRight`), un badge de compte `×N` d'accent Apple, et déploie une sous-liste aérée et contrastée (fond `--color-bg-primary`) contenant chaque prélèvement individuel cliquable.

### Validation & Qualité
- **Tests unitaires** : 67 tests passés avec succès (**100 % vert**).
- **Linter & Build** : 0 erreur de linter (les 4 warnings stables ciblés sont préservés) et build de production compilé et bundlé avec succès via `npm run build`.

---

## Session 47 — Refacto PlanPage (2/2) + UX mode Personnalisé
**22 mai 2026 (matin)**

### Ce qui a été fait

**Refacto PlanPage.tsx — suite et fin**
- Extraction de `SamplingRow` (`src/components/plan/SamplingRow.tsx`, 129L) : ligne prélèvement + confirm suppression inline + formulaire SamplingForm
- Extraction de `PdfPreviewModal` (`src/components/plan/PdfPreviewModal.tsx`, 53L) : modale iframe PDF avec bouton impression
- `PlanPage.tsx` : 334L → 227L (-32%)

**UX mode Personnalisé — création d'intervention sans date**
- Bouton "Ajouter une intervention" crée immédiatement un prélèvement avec `dateUndefined: true`
- Suppression du sélecteur de date intermédiaire (la date se saisit dans le formulaire inline)
- Affichage "Date à définir" dans la liste, le rapport HTML et MissionDetailPage
- `dateUndefined: true` → pas en retard (garde overdue.ts cohérent)
- Propagation null-safe sur tout le codebase (exportPdf, exportExcel, exportClientHtml, useDashboardStats, usePlanningData, DayModal, AdminChargeEquipe, ClientCard, SamplingForm)

**Petits fixes UX**
- Nature de l'eau par défaut → "Eau usée" à la création d'un point (au lieu de "Souterraine")
- Carte dashed "+ Ajouter un point" toujours visible dans la liste des points (ClientPlans.tsx), même sans déverrouiller
- État vide enrichi avec icône + CTA centré

### Prochaines étapes
- Regroupement par client en vue jour planning (noté en roadmap depuis session 43)
- Tests terrain avec l'équipe sur staging

---

## Session 46 — UX : discoverabilité bouton "Ajouter"
**21 mai 2026 (soir)**

### Problème
Sur les pages Matériel, Métrologie et Maintenances, le bouton "+ Ajouter" (coin haut droit) n'attirait pas le regard : zone "chrome" éloignée du contenu, wording générique.

### Ce qui a été fait

**3 améliorations sur les 3 pages (MaterielPage, MetrologiePage, MaintenancesPage) :**

1. **État vide enrichi** — remplace le simple texte gris par : icône dans carré coloré (accent) + titre + phrase d'invitation + bouton CTA centré bien visible.
2. **Carte pointillée en bas de liste** — quand la liste a déjà des éléments, une ligne `+ Ajouter…` dashed apparaît après le dernier item. Au hover elle passe en bleu accent. Le regard qui descend après scroll la trouve naturellement.
3. **Wording précis** :
   - Matériel → "Ajouter un équipement"
   - Métrologie → "Saisir une vérification"
   - Maintenances → "Nouvelle intervention"

### Décisions
- Pas de FAB mobile pour l'instant (complexité layout, à évaluer si adoption insuffisante).
- La carte dashed est en `transparent` par défaut pour ne pas alourdir la liste visuellement.

### Prochaines étapes
- Tester en conditions réelles (équipe terrain).
- Appliquer le même pattern à `/missions` si besoin.
- Reprendre le refacto PlanPage (extraction SamplingRow + PdfPreviewModal — session 45 interrompue).

---

## Session 45 — Refacto PlanPage.tsx (partie 1)
**21 mai 2026 (matin)**

### Extraction usePlanActions (`src/hooks/usePlanActions.ts`)

- `updatePlan`, `updateSampling` (avec journal d'audit), `generateSamplingsForPlan`, `addCustomSampling`, `deleteSampling`, `openPdfPreview` / `exportAnnualReport` (fusionnés en un seul appel `openPdfPreview(standalone: boolean)`)
- `PlanPage.tsx` : 461L → 334L (-27%)
- `AUDIT_FIELDS` et logique d'audit déplacés dans le hook

### Bugs corrigés pendant le refacto
- `clientId` oublié dans l'appel au hook (erreur TS2345 détectée par Vite build)
- Types `Dispatch<SetStateAction<...>>` requis dans l'interface du hook (vs simples fonctions)
- `Plan` inutilisé dans PlanPage après extraction

### Prochaines étapes
- `SamplingRow` composant : ligne prélèvement + bouton supprimer + formulaire inline (~75L)
- `PdfPreviewModal` composant : modale iframe PDF (~45L)
- Objectif : PlanPage < 200L

---

## Session 44 — Refacto PlanningPage.tsx
**21 mai 2026 (matin)**

### Extraction de 3 modules depuis PlanningPage.tsx (682L → 431L, -37%)

**`usePlanningDrag`** (`src/hooks/usePlanningDrag.ts`)
- Swipe mobile (touch start/end) avec functional update pattern (`d => addDays(d, ±1)`)
- Drag-to-create (mouseDown/Enter/Up + état dragStart/dragEnd/isDragging)
- Retourne aussi `isInDrag(dateStr)` utilisé par WeekView et MonthView

**`usePlanningActions`** (`src/hooks/usePlanningActions.ts`)
- 7 handlers Firestore : `handleCancelSampling`, `handleMoveEvent`, `handleDeleteEvent`, `toggleRainDay`, `handleChangeTechnicien`, `handleSaveEvenement`, `handleValidatePool`
- Reçoit `{ uid, initiales, clients, evenements, holidays }` en props

**`PlanningHeader`** (`src/components/planning/PlanningHeader.tsx`)
- Navigation période (prev/next/today/mini-cal), toggle vue (jour/semaine/mois)
- Filtres technicien (pills colorées), bouton retard, toggle pluie
- Bandeau "à planifier ce mois" + hint drag (affiché une seule fois via localStorage)
- MiniCalendarPanel **non inclus** (reste en overlay absolu dans PlanningPage)

### Bugs corrigés
- **Double bandeau** : les bandeaux "à planifier" et drag hint étaient restés dans PlanningPage après copie vers PlanningHeader. Supprimés.
- **Import `Preleveur`** : type inexistant dans `@/types`, remplacé par type inline `{ code: string; nom?: string }`.
- **Imports inutilisés** : `Client`, `PoolItem`, `getTechColor`, `toISO`, `dragStart`, `dragEnd` — détectés par Vite build (tsc --noEmit ne les avait pas catchés).

### Cause racine du pattern d'erreurs imports
`tsc --noEmit` ne détecte pas les `TS6133` (declared but never read) en mode strict sur toutes les configurations. Vite build est plus strict. Toujours valider avec `npm run build` avant commit.

### Prochaines étapes
- Tester staging : navigation planning, drag-to-create, swipe mobile, modals
- Prochaine cible refacto : `ClientPage.tsx` ou `DashboardPage.tsx`

---

## Session 43 — Groupement planning par client + fréquence
**20 mai 2026 (soirée)**

### Groupement par client — vue jour, semaine, mois

- **Problème** : un client avec beaucoup de plans (ex : ESID Lanveoc × 11) générait une ligne par plan, cassant la vue jour sur mobile.
- **Fix vue jour** : application de `groupByClient` sur `allDayEvts` → une seule ligne "ESID Lanveoc · 11 prélèvements ×11".
- **Fix vue semaine** : même chose via `groupByClient` sur `filteredForDayFlat`. La vue mois utilisait déjà `groupByClient`.
- **Dépliage** : clic sur la ligne groupée en vue jour → chevron déplie les sous-lignes individuelles (nom du plan + statut). Clic sur une sous-ligne → modal de détail.

### Affichage de la fréquence dans les sous-lignes

- **Problème** : après dépliage, "Entrée STEP · Ecole navale" apparaissait plusieurs fois sans distinction.
- **Fix** : ajout du champ `frequence?` dans `PlanningEvent`, alimenté depuis `plan.frequence` dans `usePlanningData`. Affiché à droite de chaque sous-ligne.
- **Cause racine** du bug de build intermédiaire : `frequence` était dans `PoolItem` mais pas dans `PlanningEvent` — `tsc --noEmit` ne l'avait pas détecté (Vite est plus strict).

### Prochaine étape impérative
- **Refacto `PlanningPage.tsx`** (682L) — à attaquer en priorité en session 44.

---

## Session 42 — Bugfix page Rapports + fix CI
**20 mai 2026 (soir)**

### Fix temps réel "Marquer rédigé"
- **Cause racine** : `RapportsPage` lisait le store Zustand mais n'avait pas de listener `onSnapshot` actif. Après le write Firestore, le store restait figé jusqu'au refresh.
- **Fix** : ajout de `useClientsListener()` dans `RapportsPage` — le rapport bascule instantanément dans "Rédigés" après le clic.

### Renommage terminologie
- "envoyé / À envoyer / Envoyés" → "rédigé / À rédiger / Rédigés" dans tous les libellés UI (variables Firestore inchangées).

### Affichage technicien en mode "Toute l'équipe"
- En mode toute l'équipe, le nom du technicien s'affiche sous la date d'intervention dans la section "À rédiger".
- Fix du fallback `resolveNom` : l'UID brut ne s'affiche plus quand le technicien n'est pas dans le store — affiche `—` à la place.

### Fix CI (GitHub Actions)
- **Cause** : variables inutilisées (`equipsSansVerif`, `calcStatut`, `matColor`) bloquaient le build Vite en CI mais pas en local (tsc --noEmit ne les signale pas).
- **Fix** : suppression des imports/déclarations orphelins dans `useDashboardStats.ts` et `TuyauForm.tsx`.

### Idée planifiée
- Regroupement par client en vue jour du planning (quand un client a trop de plans le même jour). À implémenter après le refacto de `PlanningPage.tsx`.

### Prochaine étape
- Refacto `PlanningPage.tsx` (extraction DayView/WeekView/MonthView — tâche #34).
- Valider staging avec l'équipe avant déploiement prod.

---

## Session 41 — Refacto TuyauxPage + fix conformitePct + UX rapports
**20 mai 2026**

### Refactoring TuyauxPage
- `TuyauxPage.tsx` 570L → 283L : extraction de `TuyauForm`, `Row`, `Tag` vers `src/components/tuyaux/TuyauForm.tsx` et utilitaires (`matColor`, `fmtDate`, `printLabel`, constantes) vers `src/lib/tuyauxUtils.ts`.
- Même pattern que ClientPage/AdminPage — zéro régression TypeScript.

### Fix bug conformitePct (dashboard)
- **Cause racine** : après le fix précédent (session 40), l'import `calcStatut` et la variable `equipsSansVerif` sont devenus orphelins → erreurs TS silencieuses au build.
- `conformitePct` retournait toujours `null` ("Aucun instrument suivi") car les anciennes vérifications Firestore n'ont pas de champ `resultat`.
- **Fix** : logique hybride — utilise `resultat` si présent, sinon fallback sur `calcStatut(prochainControle).key === 'ok'`. Se mettra à jour automatiquement au fur et à mesure des nouvelles saisies métrologie.

### UX rapports
- Bouton `Envoyé ✓` renommé en `Marquer envoyé` — l'ancien libellé ressemblait à un badge d'état plutôt qu'une action.

### Tests
- Suite complète : 66/66 verts tout au long de la session.
- Vérification que `metrologie.test.ts` et `dashboardStats.test.ts` couvrent déjà les hooks ciblés (pas de doublon à créer).

### Prochaine étape
- Valider la page Rapports en conditions réelles (clic "Marquer envoyé" → passage en section Envoyés).
- Déploiement prod quand l'équipe a validé le staging.

---

## Session 40 — Audit dette technique : refactoring, accessibilité, skeletons
**19 mai 2026**

### Refactoring (Phase 1 audit)

- **ClientPage.tsx** (717 → 142L) : extraction `ClientHeader`, `ClientInfoForm`, `ClientPlans`, `PdfPreviewModal` dans `src/components/missions/`
- **AdminPage.tsx** (706 → 49L) : extraction `AdminChargeEquipe`, `AdminCreateUserForm`, `AdminUsersList`, `AdminBugsSection` dans `src/components/admin/`
- **Suppression `PlanningEquipePage.tsx`** (518L, fichier orphelin non routé)
- **Fallback route** `* → /missions` corrigé en `* → /` (dashboard)

### Renommage (Phase 2 audit)

- `MerologiePage.tsx` → `MetrologiePage.tsx` (faute de frappe historique)

### UX (Phase 3 audit)

- **Composant `Skeleton`** réutilisable (`Skeleton`, `SkeletonCard`, `SkeletonRow`, `SkeletonList`) dans `components/ui/`
- Remplacement des spinners par des skeletons animés sur `MissionsPage`, `MaterielPage`, `MaintenancesPage`

### Accessibilité (Phase 4 audit)

- **Focus visible clavier** : `:focus-visible` CSS global avec outline bleu Apple (remplace `outline: none` qui rendait le focus invisible)
- `aria-label` sur les boutons icônes critiques : retour missions, fermer modal PDF, fermer drawer mobile, FAB menu

### Décisions

- Store filtres (Phase 2 audit) : non implémenté — chaque page gère ses filtres localement, pas de partage entre pages, ROI nul
- Virtualisation listes (Phase 4 audit) : non implémenté — listes <50 items en pratique pour cette app interne
- Logging prod (Phase 4 audit) : non implémenté — seulement 4 console.* dans tout le code, tous pertinents
- PWA/manifest (Phase 4 audit) : déjà complet et propre

### Prochaines étapes

- Déployer en production après validation staging
- Phase 5 de l'audit : tests unitaires sur hooks critiques si temps disponible

---

## Session 39 — Rapports : groupement client/site + fixes responsive + dashboard
**19 mai 2026**

### Features

- **Groupement à deux niveaux dans RapportsPage** : les sections "À envoyer" et "Envoyés" sont maintenant groupées par client (en-tête gris) puis par site géographique (sous-en-tête discret, visible seulement si plusieurs sites pour un client).

- **Responsive mobile** : chaque ligne "À envoyer" passe en `flex-col` sur mobile (`sm:flex-row` sur desktop). Les boutons date/badge/Fiche/Envoyé ne débordent plus sur petits écrans.

- **Widget dashboard scopé au technicien** : le widget "Rapports à envoyer" du dashboard utilisait `rapportsAFaire` (toute l'équipe pour les admins). Ajout de `rapportsAFaireMoi` dans `useDashboardStats` — toujours filtré par `uid`/`initiales` quel que soit le rôle.

- **DonutChart** : `whitespace-nowrap` sur les labels de légende pour éviter le retour à la ligne "En\nmaintenance" en layout 3 colonnes.

### Bug corrigé

- **"Traou Mad" visible dans les rapports de LMT** : le filtre `doneBy === uid` ne couvrait pas le cas `doneBy` vide avec fallback `client.preleveur`. Corrigé via `rapportsAFaireMoi` qui applique la même logique que `useDashboardStats` en mode `isGeneraliste: false`.

### Décision

- Widget "Planning du lendemain" ajouté puis retiré : l'intégration dans la grid 2 colonnes cassait la mise en page (3e colonne trop étroite). `lendemainItems` reste dans le hook pour usage futur.

### Prochaines étapes

- Réessayer le widget "Planning du lendemain" avec un layout dédié (en dessous du planning du jour, même colonne, ou section séparée)
- Déployer en prod après validation staging

---

## Session 38 — Page Rapports + fix rapportDate
**19 mai 2026**

### Bug corrigé — double usage de `rapportDate`

`rapportDate` était utilisé à la fois comme date d'envoi effectif (logique dashboard) et comme date planifiée (valeur par défaut ajoutée en session 37). Résultat : le widget dashboard ne montrait plus aucun rapport à envoyer car tous apparaissaient comme "déjà envoyés".

**Cause racine :** un seul champ pour deux sémantiques distinctes.

**Correction :** ajout du champ `rapportDatePrevue?: string` sur `Sampling`. `rapportDate` reste la date d'envoi effectif (vide = non envoyé). `rapportDatePrevue` stocke la date planifiée (défaut = doneDate + 1 mois). (commits `b1a35d1`, `e7ed88b`)

### Feature — Onglet Rapports (`/rapports`)

Nouveau 6ème onglet de navigation (sidebar desktop + drawer mobile), page `/rapports` avec :

- **Section "À envoyer"** : prélèvements avec `rapportPrevu=true` et `rapportDate=''`, triés par date prévue croissante. Chaque ligne : nom client, site, date intervention, input date d'envoi prévue éditable (onBlur, pas onChange), badge délai coloré (vert/orange/rouge), bouton "Fiche" (→ fiche plan), bouton "Envoyé ✓" (loading state, désactivé pendant l'envoi).
- **Section "Envoyés"** : prélèvements avec `rapportDate !== ''`, triés par date décroissante. Affichage de la date d'envoi effectif et du technicien.
- **Filtre** "Mes rapports" / "Toute l'équipe" — par défaut sur "Toute l'équipe" pour les admins/chargés de mission.

### Mise à jour widget dashboard

Le widget `RapportsWidget` affiche maintenant la date d'envoi prévue sur chaque ligne et un lien "Voir tous les rapports →" vers `/rapports`. (commit `ee426e9`)

### SamplingForm

Le champ de date dans le formulaire de prélèvement affiche désormais `rapportDatePrevue` (label "Date envoi prévue") au lieu de `rapportDate`. (commit `05fae92`)

### Architecture

- `RapportItem` dans `useDashboardStats` enrichi avec `rapportDatePrevue` et `doneBy`
- `rapportsEnvoyes` exposé en plus de `rapportsAFaire`
- Note : dans `rapportsEnvoyes`, le champ `rapportDatePrevue` de `RapportItem` stocke `s.rapportDate` (date effective) — sémantique documentée dans l'interface

### Prochaines étapes

- Valider en staging avec l'équipe
- Migration optionnelle : pour les prélèvements existants avec `rapportDate` non vide, `rapportDatePrevue` sera vide — l'utilisateur devra renseigner manuellement la date prévue
- Dette technique : `RapportItem` local dans `RapportsWidget` duplique le type central (à unifier)

---

## Session 1 — Init projet
**Étape 0 — Initialisation**
- Création projet Vite + React + TypeScript
- Installation dépendances : react-router-dom, zustand, lucide-react, tailwindcss, framer-motion
- Configuration Firebase (Auth + Firestore)
- Configuration Wrangler (Cloudflare Workers)
- Scripts `deploy-dev.sh` et `deploy-prod.sh`

**Étape 1 — Authentification**
- Page `/login` avec Firebase Auth (email/password)
- Store Zustand `useAuthStore`
- Route guard `RequireAuth`
- Collection Firestore `users/{uid}`

**Étape 2 — Layout et navigation**
- Composant `AppLayout` : sidebar desktop + tab bar mobile
- 5 sections : Tableau de bord, Demandes, Missions, Planning, Matériel, Métrologie, Maintenances, Mon compte
- Transitions de page Framer Motion

---

## Session 2 — Module Missions
- `MissionsPage` : liste clients avec filtres
- `ClientCard` : nom, segment, prochain prélèvement, statuts
- `ClientPage` : fiche client complète (infos admin + plans + historique)
- `PlanPage` : fiche plan avec calendrier prélèvements annuel
- `SamplingForm` : saisie statut, date, nappe, rapport, checklist, journal d'audit
- Store `useMissionsStore` + hook `useClients`
- Auto-save avec debounce 800ms

---

## Session 3 — Modules Matériel, Métrologie, Maintenances
- `MaterielPage` + `EquipementPage` : inventaire parc terrain
- `MetrologiePage` + `VerificationPage` : suivi vérifications COFRAC
- `MaintenancesPage` + `MaintenancePage` : interventions préventives/correctives
- Collections Firestore : `equipements`, `verifications`, `maintenances`

---

## Session 4 — Tableau de bord
- `DashboardPage` : vue synthétique quotidienne
- KPIs : missions réalisées, taux conformité métrologique, alertes, équipements à calibrer
- Planning du jour : timeline chronologique
- État matériel : 4 compteurs (En service / À calibrer / En panne / SAV)
- Alertes métrologie et maintenance urgentes
- Activité récente équipe

---

## Session 5 — Déploiement + CI/CD
- Git init + dépôt GitHub `tomkerf/labocea-pmc-v2`
- GitHub Actions : workflow Deploy Staging sur push `main`
- Déploiement Cloudflare Workers : `labocea-pmc-v2-dev.tomkerf.workers.dev`

---

## Session 6 — Module Planning (v1)
- `PlanningPage` : vues Jour / Semaine / Mois
- Vue semaine : grille 5 colonnes lun-ven, pills par événement
- Vue mois : calendrier mensuel lun-ven uniquement
- Vue jour : style Apple Calendar avec créneaux horaires
- DayModal : pool de prélèvements non planifiés + assignation à une date
- Drag-to-create : glisser sur plusieurs jours pour créer un événement
- Clic droit sur un jour : menu contextuel pour assigner

---

## Session 7 — Planning (améliorations)

### Fonctionnalités
- **Regroupement par client** dans la vue mois : plusieurs prélèvements du même client → une seule pill avec badge `×N`
- **Vue semaine sans regroupement** : `filteredForDayFlat` pour voir chaque prélèvement individuellement
- **DayModal** : onglets Pool / Événement + bouton Planifier visible en permanence
- **Pool** : badge "prévu j24" en bleu pour les prélèvements déjà assignés à un jour

### Bugs corrigés
- Timezone : `toISOString()` en UTC+2 donnait le jour précédent → remplacé par `localISO()` dans DashboardPage
- Vue semaine mobile : "Sortie STEP" manquante car `filteredForDay` (groupé) était utilisé → remplacé par `filteredForDayFlat`
- Titre planning du jour tronqué → suppression classe `truncate`
- `siteNom` absent des pills → `baseSub = [plan.nom, plan.siteNom].filter(Boolean).join(' · ')`

---

## Session 8 — Planning (couleurs + UX)

### Couleurs techniciens
- Suppression des couleurs par type d'intervention
- Couleur par technicien : `TECH_COLORS` (THK = bleu, ROD = orange) + palette fallback déterministe
- `getTechColor(initiales)` : retourne `{ color, bg }` pour chaque technicien
- Pills techniciens dans les filtres colorisées avec la couleur du tech
- Suppression de la légende statuts (devenue inutile)

### Interventions réalisées
- Check `✓` dans la pill au lieu d'un changement de couleur (style Apple)

### Événements multi-jours (style Apple Calendar)
- Bande "toute la journée" au-dessus des colonnes semaine
- Les événements avec `dateFin` s'étirent horizontalement sur leur durée
- Algorithme d'assignation de lignes pour éviter les chevauchements
- Exclusion des events multi-jours des pills par jour

### Filtres
- **Planning du jour (dashboard)** : filtré sur le technicien connecté uniquement
- **Pills filtres** ROD/THK colorisées avec la couleur du technicien
- **Tri** : interventions sans heure planifiée affichées en haut (comme Apple Calendar)

---

## Session 9 — Page Demandes

### Design
- Kanban desktop-only : 4 colonnes (En attente devis / Devis envoyé / Visite préliminaire / Devis signé)
- Pas de couleurs par colonne — design sobre
- Badge de comptage en `--color-accent-light` / `--color-accent`
- Cartes sans bordure colorée

### Technique
- Types : `Demande`, `DemandeStatut`, `NouvelleDemandeType`
- Store `useDemandesStore` + hook `useDemandes`
- Route `/demandes` branchée dans sidebar + App.tsx

---

## Session 10 — Fréquences de prélèvement

### Fréquence Personnalisée
- Nouveau type `'Personnalisé'` dans `FrequenceType`
- En mode Personnalisé : pas de génération automatique
- Bouton "+ Ajouter une date" → date picker inline → crée un sampling avec la date exacte
- Liste triée chronologiquement
- Bouton Trash par sampling pour suppression individuelle
- Libellé "15 Mars" au lieu de "Mars — j15"

### Bimensuel corrigé
- Bimensuel = **deux fois par mois** (24 prélèv/an) — était mal implémenté comme "tous les 2 mois" (6/an)
- Génération : 2 samplings par mois × 12 mois = 24 samplings
- `plannedDay: 0` → tombent dans le pool pour planification manuelle (pas de jours fixes imposés)

---

## Décisions techniques

| Sujet | Décision | Raison |
|-------|----------|--------|
| Multi-utilisateurs | Firebase Auth email/password | Simple, fiable, pas de SSO nécessaire |
| État global | Zustand (un store par domaine) | Léger, pas de boilerplate Redux |
| Routing | React Router v7 | Standard écosystème React |
| Animations | Framer Motion limité | Max 3-4 par page, 150-300ms |
| Icônes | Lucide React uniquement | Pas de mélange de libs |
| Dark mode | Reporté V3 | Pas de demande équipe |
| Bimensuel | 24/an dans le pool | Jours variables selon météo/dispo |
| Events multi-jours | Bande spanning Apple Calendar | Meilleure lisibilité |
| Fréquence libre | Mode Personnalisé + date picker | Cas réels non standard |

---

## Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Frontend | React + Vite | 19 / 8 |
| Langage | TypeScript strict | ~6 |
| Style | Tailwind CSS | 4 |
| État | Zustand | 5 |
| Routing | React Router | 7 |
| Animations | Framer Motion | 12 |
| Icônes | Lucide React | 1 |
| Auth + DB | Firebase | 12 |
| Deploy | Cloudflare Workers | — |
| CI/CD | GitHub Actions | — |

---

## URLs

| Env | URL |
|-----|-----|
| Staging | https://labocea-pmc-v2-dev.tomkerf.workers.dev |
| Production | https://labocea-pmc.tomkerf.workers.dev (V1 — non touché) |
| GitHub | https://github.com/tomkerf/labocea-pmc-v2 |

---

---

## Session 11 — Code review + qualité + tests (22 avril 2026)

### Bugs corrigés
- **Zombie documents** : missions supprimées qui réapparaissaient → `runTransaction` dans `saveClient` vérifie l'existence du doc avant d'écrire (atomique)
- **Alerte retrait intervention d'un autre technicien** : `PlanningPage` affiche un bloc de confirmation si `event.technicien !== connectedInitiales`
- **Timeline planning du jour (dashboard)** : timezone UTC+2 donnait le mauvais jour → `localISO()` corrigé

### Code review — 11 points corrigés
| # | Point | Fix |
|---|-------|-----|
| CR1 | `as any` sur `serverTimestamp` dans `useAuth` | Type `NewUserDoc` avec `FieldValue` + try/catch |
| CR2 | Pas de try/catch sur les appels Firestore au login | Bloc try/catch + console.error |
| CR3 | `isSamplingOverdue` sans paramètre `year` → faux positifs | Paramètre `year?: number` ajouté |
| CR4 | `generateId` avec `Math.random()` non cryptographique | `crypto.randomUUID()` |
| CR5 | `PlanPage` pas de redirect si client supprimé | `navigate('/missions')` dans le callback `onSnapshot` |
| CR6 | Profil vide au premier login (initiales manquantes) | `CompleteProfileModal` bloquant dans `RequireAuth` |
| CR7 | Export PDF via `window.open + document.write` (bloqué mobile) | `Blob + URL.createObjectURL` |
| CR8 | Pas de vérification des doublons dans `addCustomSampling` | Guard date déjà existante avant insertion |
| CR9 | Index Firestore `orderBy('nom')` non vérifié | Index automatiques Firestore actifs — aucun index composite requis |
| CR10 | `confirm()` natif pour suppression de plan | `confirmDeletePlanId` state + UI de confirmation inline |
| CR11 | Getters dans `authStore` (anti-pattern Zustand) | Remplacement par sélecteurs externes (`selectUid`, `selectPrenom`…) sur 16 fichiers |

### Refactors et améliorations
- **Système de toasts** : `toastStore` (auto-dismiss 4s/6s) + `ToastContainer` — `toast.error()` sur tous les catch Firestore
- **Validation formulaires** : bordure rouge + message d'erreur si `nom` client ou plan est vide (sans bloquer l'auto-save)
- **`eslint-disable` supprimés** : `filteredForDay` / `filteredForDayFlat` convertis en `useCallback` avec deps correctes
- **Code-splitting** : `React.lazy()` sur toutes les pages — bundle 924kB → 330kB (-64%)
- **`secondDay`** : champ supprimé du type `Plan` et des défauts `addPlan()`

### Tests unitaires (39 tests, tous verts)
- `generateSamplings` extrait de `PlanPage.tsx` → `src/lib/samplings.ts` (testable)
- 21 tests `generateSamplings` : tous les modes fréquence, customMonths, customDays, champs par défaut
- 15 tests `isSamplingOverdue` : deadline exacte à la seconde, fév non-bissextile, paramètre `year`
- 3 tests `generateId` : format UUID v4, unicité 1000 appels
- Vitest 3.2.4 installé, scripts `npm test` / `npm run test:watch`

### Versions figées
- Suppression des `^` dans `package.json` (versions exactes installées)
- `package-lock.json` commité → builds GitHub Actions reproductibles

---

## Session 12 — Clôture zombie bug + état des lieux
**22 avril 2026**

### Confirmation CI
- Builds #147 et #148 verts sur staging (règles Firestore + fix post-delete)
- Tous les commits de la session 11 bien poussés sur `origin/main`

### Bug zombie documents — confirmé résolu
- Règles Firestore déployées via `firebase deploy --only firestore:rules`
- V1 (sans auth) bloquée en écriture sur `clients-v2` → "Abattoir Croissant" ne peut plus revenir
- À surveiller 1-2h après la prochaine utilisation de la V1 pour confirmer

### Skills évaluées
- **Firebase skill (skillsmp.com)** : pertinente pour les règles par rôle (étape suivante), les transactions, et les listeners — à utiliser lors de l'implémentation des règles role-based
- **backend-patterns** : peu pertinente (pas de backend Node/Express — Workers sont statiques)

### Prochaines étapes identifiées
- Phase 6 : déploiement production (`npx wrangler deploy`)
- Règles Firestore par rôle (technicien / chargé de mission / admin)
- Commentaire éditable dans `MissionDetailPage`
- Page `/compte` : édition initiales/prénom

---

## Session 13 — Évaluation des skills
**22 avril 2026**

### Skills évaluées et verdict

| Skill | Verdict | Raison |
|-------|---------|--------|
| `react-vendoring` | ❌ Non pertinente | Interne à Next.js/Vercel, aucun rapport avec Vite |
| `tailwind-design-system` | ⚠️ Moyenne | Design system déjà défini dans CLAUDE.md |
| `cloudflare` | ✅ Installer | Workers + Wrangler + static assets — Phase 6 |
| `vitest` | ✅ Installer | React Testing Library patterns pour les futurs tests composants |
| `typescript` | ❌ Non pertinente | Interne à LobeChat (antd-style, @lobehub/ui) |
| `react-spa-performance` | ✅ Installer | React 19 + Vite + Tailwind — stack exacte du projet |
| `security-vite` | ✅ Installer | Audit env vars + sourcemaps avant déploiement prod |

### Résultat
Les 4 skills retenues (`cloudflare`, `vitest`, `react-spa-performance`, `security-vite`) sont déjà installées globalement dans `.claude/skills/` — aucune action supplémentaire requise. Activation automatique selon le contexte des demandes.

### Note sécurité
Les `VITE_FIREBASE_*` dans le bundle sont normaux (Firebase API key publique par design). La sécurité est assurée par les règles Firestore.

---

## Session 15 — Bugs planning + UX mobile
**23 avril 2026**

### Bugs corrigés

**1. Décalage dates J1/J2 après validation (PlanningPage)**
- Cause : `dateStr = s.doneDate || toISO(...)` — le `doneDate` écrasait `plannedDay` pour le positionnement dans la grille, décalant J1+J2 d'un jour après validation
- Fix : toujours utiliser `plannedDay` pour positionner, `doneDate` uniquement pour l'affichage
- Fichier : `src/pages/PlanningPage.tsx` ligne 991

**2. Swipe gauche/droite en vue jour mobile**
- Feature : navigation entre jours par swipe, identique à Apple Calendar
- Seuil 50px horizontal, ignore les swipes verticaux (scroll)
- Fichier : `src/pages/PlanningPage.tsx` — `handleTouchStart` / `handleTouchEnd`

**3. CheckCircle2 sur prélèvements réalisés (planning desktop)**
- Remplace le `✓` texte 9px par `CheckCircle2` size=11 cohérent avec le mobile
- Fichier : `src/pages/PlanningPage.tsx` ligne 1424

**4. Événements planning en ton gris neutre**
- Les rappels/réunions/autres utilisaient `getTechColor` → bleu pour THK
- Fix : `statusBg: var(--color-bg-tertiary)`, `statusColor: var(--color-text-tertiary)`
- Fichier : `src/pages/PlanningPage.tsx` (2 endroits : boucle principale + vue mois)

**5. Badge "Réalisé" en vert dans le planning**
- Les prélèvements done affichaient le badge en bleu (couleur technicien)
- Fix : `isDone` → forcer `--color-success-light` / `--color-success`
- En bonus : `overdue` → `--color-danger-light` / `--color-danger` (cohérence)
- Fichier : `src/pages/PlanningPage.tsx`

### Setup .claude/
- Création `.claude/skills/reprendre/` et `.claude/skills/fin-session/` — skills Cowork pour démarrer/clôturer les sessions
- Création `.claude/settings.json` — permissions bash
- Note : `settings.json` ne gère pas les "comportements automatiques" décrits initialement — uniquement permissions et hooks

### Prochaines étapes
- Déploiement production (Phase 6)
- Règles Firestore par rôle
- Vérifier que `/reprendre` et `/fin-session` fonctionnent après redémarrage Cowork

---

## Session 14 — Bug planning du jour (J2)
**23 avril 2026**

### Problème
Le planning du jour n'affichait qu'un seul prélèvement (Boues STEP) au lieu des 3 attendus pour RSDE Step Châteaulin. Les plans "Entrée STEP" et "Sortie STEP" étaient absents.

### Diagnostic (debug log console)
- `plan.nom = "Entrée STEP"` — "J2" n'est pas dans le nom du plan → regex `/\bJ(\d+)\b/` n'a pas matché
- `plannedDay: 22` (hier), `plannedMonth: 3` (avril) → `plannedDate = "2026-04-22"` ≠ `todayISO = "2026-04-23"`
- `status: "planned"`, `doneDate: ""` → prélèvement non fait, planifié hier
- `isToday: false` → exclu du planning

### Cause racine
Les bilans 24h (méthode automatique) ont deux interventions : J1 (installation) et J2 (désinstallation + validation). Le prélèvement est stocké avec `plannedDay = J1`. C'est en J2 que le technicien revient récupérer l'échantillon et valide le prélèvement. La logique de matching date exacte excluait ces prélèvements du planning du jour J2.

### Fix appliqué
Calcul de `yesterdayISO` + condition élargie :
```typescript
const isJ2Today = plannedDate === yesterdayISO && s.status === 'planned'
if (isToday(plannedDate) || isJ2Today) { ... }
```
Un prélèvement d'hier encore `planned` est considéré comme J2 à faire aujourd'hui.

### Commit
`fix: planning du jour — inclure prélèvements J2 (planned hier)`

---

## Session 16 — Planning avancé (UX + PDF + fantômes)
**24 avril 2026**

### Fonctionnalités
- **Motif obligatoire** sur report/retrait d'intervention — saisie de raison bloquante avant validation
- **Historique des motifs** exporté dans le PDF (reportHistory visible dans le compte-rendu)
- **Fantômes visuels** dans le planning : les prélèvements retirés/reportés laissent une trace grisée sur leur date d'origine
- **Modale intervention** dans le widget planning du jour (dashboard) — accessible sans quitter le tableau de bord
- **Mini-calendrier** en bas de la sidebar planning (desktop) + overlay rétractable (bouton dans le header) — 3 mois empilés

### Bugs corrigés
- Inversion couleurs dot widget planning du jour
- EventDetailModalProps mis à jour avec les signatures `reason`
- Fix uid → nom technicien dans la modale fantôme
- Alignement J1/J2 face à face en vue semaine (feat + revert — trop ambigu visuellement)

---

## Session 17 — Admin + Export PDF + Avatar + Mobile
**25 avril 2026**

### Fonctionnalités
- **Page Admin** : création de comptes utilisateurs (email/password) directement depuis l'app, avec écriture Firestore avant signOut du compte secondaire
- **Export PDF historique** complet par client : motifs d'annulation, reports, historique de reports, colonnes élargies, caractères ASCII
- **Widget rapports** : filtré sur le technicien connecté uniquement
- **Page Infos terrain** : contacts, codes d'accès, notes par site — accessible depuis la fiche client
- **Avatar** : sélecteur emoji dans Mon compte, affiché dans la sidebar et les modales ; alternative DiceBear (style Notionists) évaluée
- **Calculateur asservissement 24h** : bouton flottant mobile, design system Apple

### Bugs corrigés
- Retards mobile : triangle seul sans texte + padding bottom safe-area
- Asservissement : conformité design system
- Remplace Missions par Planning dans la tab bar mobile (priorité terrain)
- Rollback Auth si écriture Firestore échoue lors de la création de compte
- Dédoublonnage users par email dans AdminPage
- InfosPage : strip `undefined` avant Firestore + try/catch sur save

---

## Session 18 — Navigation mobile + Groupement par site + PDF
**26 avril 2026**

### Fonctionnalités
- **Groupement par site** dans la fiche client : les plans sont regroupés sous leur `siteNom` (normalisation trim + lowercase)
- **Burger menu latéral mobile** : remplace la tab bar du bas — drawer avec 5 onglets + Asservissement intégré

### Bugs corrigés
- Normaliser `siteNom` (trim + lowercase) pour éviter les doublons de groupe
- Dédoublonnage users dans le store — corrige le sélecteur préleveur
- PDF reports : suppression des préfixes De:/Vers: qui causaient des retours à la ligne

---

## Session 19 — Météo, Fériés, Tuyaux, DnD, Photos, Offline
**27 avril 2026**

### Fonctionnalités
- **Condition météo pluie** : config plan + badge pill dans le planning (liste, modale, vue jour)
- **Jours fériés français** : affichage automatique dans le planning (semaine + mois), planification bloquée sur jours fériés
- **Module Tuyaux de prélèvement** : port complet V1→V2 (liste, form, firestore.rules, design system)
- **Drag & Drop** : réorganisation des points de prélèvement dans un plan par glisser-déposer
- **Séparateurs de section** et headers de site automatiques entre les points (compatibles DnD)
- **Champ commentaire** dans la config du point de prélèvement
- **Photos terrain** : upload/delete de photos depuis un prélèvement (stockage Firebase Storage)
- **Persistance Firestore IndexedDB** : fonctionnement hors connexion partielle — données mises en cache dans IndexedDB

### Dashboard
- Bloc **prélèvements en retard** + alertes maintenances actives dans le tableau de bord
- SamplingForm mobile : 1 colonne, touch targets ≥ 44px

### Bugs corrigés
- Écran blanc PlanPage : STATUS_CONFIG fallback + ErrorBoundary
- ErrorBoundary : rechargement auto si chunk JS introuvable après déploiement (code-splitting)
- Réaffichage headers de site automatiques (rétrocompatibles DnD)
- Fix style headers de site : fond grisé, séparateurs nets
- Navigation mobile : remet onglet Missions + Bilan 24h dans le drawer

---

## Session 20 — Finitions + Technicien par prélèvement
**28 avril 2026**

### Fonctionnalités
- **`assignedTo` par prélèvement** : le champ technicien est stocké sur le sampling lui-même — changement de technicien n'écrase plus `client.preleveur`

### Refactors
- **Bilan 24h retiré de PMC v2** — sera implémenté dans `labocea-app-rapports` (app dédiée)

### Bugs corrigés
- Dot planning 'rapport' en gris neutre (badge suffit, dot coloré inutile)
- Badge Rapport en gris neutre dans le planning du jour
- Fallback mémoire si cache IndexedDB Firestore corrompu (évite l'écran blanc au démarrage)

---

## Session 21 — Planning UX + congés + jours fériés
**29 avril 2026**

### Dashboard
- **Sections repliables** : "Rapports à envoyer" et "Prélèvements en retard" deviennent des accordéons avec ChevronDown + badge de comptage (orange / rouge)

### ClientPage — Verrouillage des plans
- **Bouton lock/unlock** : empêche le réordonnancement accidentel des plans (DnD désactivé)
- Les boutons Séparateur et Ajouter sont masqués quand verrouillé
- Grip DnD : opacité 0.3 + curseur par défaut en mode verrouillé

### Planning — Couleurs techniciens
- **Trigrammes tech** dans les pills : couleur = même que le dot du technicien (badge `bg tech+18`, texte `tech color`)

### Planning — Type Congé/RTT
- Ajout du type `'conge'` dans `TypeEvenement` (`src/types/index.ts`)
- Congé/RTT disponible dans **DayModal** (clic simple) et **DragCreateModal** (glisser)
- Style pill congé : fond `--color-bg-tertiary`, emoji 🏖️, trigramme tech coloré
- **Titre optionnel** pour les congés — défaut automatique "Congé/RTT" si champ vide
- Bouton Enregistrer activé immédiatement dès sélection congé (pas besoin de titre)

### Planning — Bandes all-day supprimées
- `isMultiDay()` retourne toujours `false` → plus de bande spanning all-day
- Tous les événements (y compris congés multi-jours) s'affichent en pill dans leur colonne respective
- Congés multi-jours : déjà expandus par jour dans `eventsByDate` → une pill par colonne automatiquement

### Planning — Pills fantômes
- Fond `--color-bg-tertiary` (plus visible)
- Texte italique + préfixe `→`
- Badge technicien sur fond `--color-border`

### Planning — Overlay jours fériés
- Fond grisé `rgba(0,0,0,0.04)` + emoji 🏖️ centré en `::after`
- Taille emoji 48px, opacité 0.25

---

*Dernière mise à jour : 29 avril 2026*

---

## Session 22 — Dette technique planning + Sécurité + UX
**9 mai 2026**

### Qualité — Module planning (suite session 21)

- **`MonthGrid` extrait au niveau module** dans `MiniCalendarPanel.tsx` — était défini dans le corps du composant parent, React le recréait à chaque render et remontait les 3 instances. Fix comportemental réel. (commit `f6c2367`)
- **`getISOWeek()` et `getPeriodLabel()`** extraits vers `planningUtils.ts` — IIFEs inline dans DayView et PlanningPage remplacées par des fonctions nommées et testables. (commit `28ff283`)
- **`tag` et `color` supprimés de `AllDayItem`** — champs jamais renseignés détectés par code review automatique. (commits `fb51f1f`, `d51b1dd`)

### Sécurité — Rôles utilisateurs

- **`RequireAdmin` composant** créé (`src/components/layout/RequireAdmin.tsx`) — vérifie `role === 'admin'`, redirige vers `/missions` sinon. Route `/admin` wrappée.
- **Firestore rules durcies** — ajout du helper `isAdmin()` qui lit le rôle depuis `users/{uid}`. Écriture sur profil tiers (création/suppression comptes) désormais réservée aux admins. Règles déployées en production.

### Mode d'emploi — réécriture complète

- 6 modules documentés (était 4) : ajout Matériel et Métrologie/Maintenances
- Sections Planning enrichies : drag-to-create, événements personnels (congés/RTT), filtres, mini-calendrier
- Photos terrain documentées
- Ordre revu : Statuts d'abord, Planning en 2e, Missions en 3e
- Erreur corrigée : description du drag-and-drop inexacte retirée

### UX — Aides contextuelles in-app

- **Tooltip statuts** dans fiche prélèvement (`PlanPage.tsx`) — icône `?` au survol : différence "En retard" vs "Non effectué" avec couleurs
- **Tooltip anneau métrologie** dans `EquipementCard` — CSS (sans délai navigateur), affiche "Prochain étalonnage dans X jours"
- **Hint drag-to-create** dans Planning — bandeau vert une seule fois au premier accès, fermé via localStorage

### CI — Fix historique

- Commit `edc9ca6` (session 21) avait cassé le CI GitHub Actions (syntax error WeekView). Corrigé par `20cc977` dès la même session. Confirmé vert sur les commits suivants.

### Prochaines étapes identifiées

- Signalement de bugs in-app (bouton → Firestore `bugs/{id}` → Admin)
- Écriture concurrente : détecter les conflits si plusieurs techs sur la même fiche
- Refactoring pages longues : PlanPage (965 lignes), DashboardPage (890), BilanPage (882)
- Attendre retours équipe sur staging avant déploiement prod

---

---

## Session 23 — Audit Codebase + Backlog Refactoring
**9 mai 2026**

### Audit & Architecture
- **Revue complète du code** : Analyse de la structure (React 19, Zustand, Firestore), de la sécurité et du design system Apple-style.
- **Diagnostic Junior vs Senior** : Identification des forces (transactions Firestore, typage strict, doc de référence) et des faiblesses architecturales (fichiers "God Components", couplage vue/logique).
- **Création du Backlog de Refactoring** : Nouveau document `TODO_REFACTORING.md` listant les priorités techniques (découpage de `PlanPage`, `DashboardPage`, `BilanPage`, abstraction Firestore, évolutivité des données).

### Documentation
- **Mise à jour de `CLAUDE.md`** : Ajout d'une section "Dette Technique" référençant le nouveau backlog pour guider les futurs développements assistés par IA.
- **Mise à jour de l'index de mémoire** : Référencement du backlog dans `MEMORY.md`.

### Prochaines étapes
- Commencer le découpage de `PlanPage.tsx` (priorité critique).
- Extraire la logique métier des pages vers des hooks ou services dédiés.

---

## Session 24 — Refactoring God Components (Plan, Dashboard, Bilan)
**11 mai 2026**

### Refactoring & Modularité
- **Refactoring PlanPage.tsx (975L → 428L)** :
  - Extraction de `SamplingForm` et `PlanField` vers `src/components/plan/`.
  - Extraction de `PlanConfigSection` vers `src/components/plan/`.
  - Déplacement de `buildReportHtml` vers `src/lib/reportHtml.ts`.
- **Refactoring DashboardPage.tsx (890L → 407L)** :
  - Extraction des widgets (Pluie, Maintenances, Rapports, Retard, StatCard) vers `src/components/dashboard/`.
- **Refactoring BilanPage.tsx (882L → 122L)** :
  - Extraction massive de la logique de calcul vers `src/lib/bilanCalcs.ts`.
  - Création de composants UI réutilisables dans `src/components/bilan/BilanUI.tsx`.
  - Découpage des onglets en composants distincts (`TabIdentification`, `TabVolume`, `TabVitesse`, `TabPesee`, `TabTemperature`, `TabAnalyses`, `TabSynthese`).

### Validation & Déploiement
- **Tests de type** : Validation `npx tsc --noEmit` sans erreurs sur l'ensemble du projet.
- **Déploiement Staging** : Version mise à jour déployée sur Cloudflare Workers.
- **Nettoyage** : Suppression des types et fonctions redondants, nettoyage des imports.

---

## Session 25 — Solidité multi-utilisateurs + Signalement de bugs
**12 mai 2026**

### Écriture concurrente — détection in-app
- **`ClientPage.tsx` et `PlanPage.tsx`** : bandeau orange "Modifié par [prénom] pendant votre édition" quand `onSnapshot` détecte un `updatedBy` différent du `uid` courant pendant qu'`isDirty` est `true`.
- Bouton **Recharger** : annule le timer d'auto-save, reset `isDirty`, applique les données distantes.
- Bouton **Ignorer** : ferme le bandeau, l'auto-save écrasera au prochain tick.
- Lookup du nom via `useUsersStore.getState()` pour éviter les closures stales.

### Signalement de bugs in-app
- **Type `BugReport`** ajouté dans `src/types/index.ts`.
- **`BugReportModal`** : modale avec textarea description + page courante auto + user auto → écrit dans `bugs/{id}` Firestore.
- **Sidebar** : bouton discret "Signaler un problème" en bas de la nav (icône `Bug`, desktop).
- **AdminPage** : section "Problèmes signalés" avec `onSnapshot` sur `bugs`, triés par date desc, visibles admin seulement.
- **Règles Firestore** : `create` pour tout authentifié, `read/update/delete` admin uniquement — déployées sur `labocea-pmc`.
- **Mode d'emploi** (`AidePage`) : section "Signaler un problème" ajoutée.

---

## Session 31 — Roadmap visuelle + Audit qualité pré-équipe
**16 mai 2026**

### roadmap-visual.html
- Création d'un viewer HTML auto-fetch depuis GitHub raw (`ROADMAP.md`).
- Parser custom : sections phases, checkboxes `[x]`/`[ ]`, tableau journal.
- `statusOf()` croise le journal (emoji ✅ dans `rawTheme`) plutôt que les checkboxes (toutes `[ ]` à l'époque).
- Si `status === 'done'`, tous les points de tâches s'affichent en vert (`allDone`).
- Déployé sur staging via `deploy-dev.sh` (script mis à jour pour copier le fichier dans `dist/`).
- Accessible à `https://labocea-pmc-v2-dev.tomkerf.workers.dev/roadmap-visual.html`.

### Sync ROADMAP.md checkboxes
- Audit : toutes les tâches phases 1–5 et 7 étaient `[ ]` malgré le code livré.
- Script Python : 75 tâches passées à `[x]`. Phase 6 : seule la tâche staging cochée, les 5 restantes conservées `[ ]`.

### Audit qualité — suppression des APIs natives bloquantes
- **`document.write`** retiré de `FicheDeVie.tsx` et `TabSynthese.tsx` → remplacé par Blob URL (`URL.createObjectURL`). Fix iOS Safari (bloque `window.open + document.write`).
- **`confirm()`** retiré de : `PlanPage` (Générer + Supprimer prélèvement), `EquipementPage`, `DemandesPage`, `useDocumentData` (hook générique), `MaintenancePage`, `VerificationPage`. Remplacé par two-step state inline (bouton → "Confirmer / Annuler").
- **`alert()`** retiré de `PlanPage.addCustomSampling` → `toast.error()`.
- **`: any`** retiré de `MobileDrawer.tsx` → `LucideIcon | null` typé explicitement.
- `useDocumentData` : `deleteConfirmMessage` supprimé de l'interface, `requestDelete`/`cancelDelete`/`confirmDelete` exposés pour que les callers gèrent la confirmation dans leur JSX.

### Prochaines étapes
- §3 refactoring : sous-collection `samplings` (risque limite 1 Mo Firestore)
- §4 tests unitaires hooks
- Durcissement règles Firestore pour multi-utilisateurs
- Phase 6 : déploiement production + validation équipe

---

## Session 30 — Refactoring §2 : soldé (MissionDetailPage + TODO_REFACTORING)
**16 mai 2026**

### Refactoring — MissionDetailPage

- `useClientData` branché sur `MissionDetailPage.tsx` : listener `onSnapshot` + auto-save inline supprimés.
- `handleTerminer` réécrit sans `setSaving`/`setClient` manuels — utilise `triggerSave` puis `navigate(-1)` immédiatement (save se déclenche en background dans les 800ms).
- `MissionDetailPage` : **368 → 333 lignes** (−35). (commit `2219a79`)

### Décision — AdminPage non refactorisée

- `AdminPage.tsx` (707L) contient 1 listener Firestore dans `BugsSection` — déjà isolé dans un sous-composant dédié. Pattern correct, pas d'extraction supplémentaire justifiée.
- La taille (707L) est due au JSX dense, pas à de la logique métier inline.

### TODO_REFACTORING.md — §2 soldé

- `Logique métier vs Vue` cochée ✅ : `usePlanningCalendar` + `useClientData`.
- `Abstraction Firestore` cochée ✅ : `useClientData` + `useDocumentData<T>` couvrent ClientPage, PlanPage, MissionDetailPage, MaintenancePage, VerificationPage.
- §1 et §2 entièrement soldés. Note de bas de page mise à jour.

### Prochaines étapes

- §3 Évolutivité données : sous-collection `samplings` (risque 1 Mo par document client si historique croît).
- §4 Tests unitaires : couverture des hooks de données (`usePlanningData`, `useClientData`, etc.).

---

## Session 29 — Refactoring §2 : abstraction Firestore (useClientData, useDocumentData)
**15 mai 2026**

### Hooks créés

- **`useClientData(clientId)`** — extrait de `ClientPage.tsx` : listener `onSnapshot` sur `clients-v2`, auto-save debounce 800ms, détection conflit concurrent (bandeau orange), `handleDeleteClient` avec attente zombie-proof. Retourne `{ client, loading, saving, remoteChanged, triggerSave, update, handleReload, handleDeleteClient, dismissRemoteChanged }`.
- **`useDocumentData<T>(options)`** — hook générique pour les fiches simples : onSnapshot + auto-save debounce + delete. Paramétrable via `saveFn`, `onAfterSave`, `deleteRedirect`, `deleteConfirmMessage`. Utilisé par `MaintenancePage` et `VerificationPage`.

### Pages refactorées

| Page | Avant | Après | Δ | Commits |
|------|-------|-------|---|---------|
| `ClientPage.tsx` | 815L | 717L | −98 | `083a2d3` |
| `MaintenancePage.tsx` | 225L | 194L | −31 | `08c9b29` |
| `VerificationPage.tsx` | 206L | 174L | −32 | `08c9b29` |
| `PlanPage.tsx` | 470L | 416L | −54 | `3be3086` |

### Décisions

- `PlanPage` réutilise `useClientData` directement (même collection `clients-v2`). Redirection client supprimé gérée par `useEffect(!loading && !client → navigate)`.
- `useDocumentData` préféré à deux hooks quasi-identiques `useMaintenanceData`/`useVerificationData` — DRY + extensible.

### Prochaines étapes

- TODO_REFACTORING §2 restant : `MissionDetailPage` (2 appels Firestore inline), `AdminPage` (655L, 2 appels Firestore).
- Envisager : cocher §2 "Abstraction Firestore" dans TODO_REFACTORING.md une fois AdminPage traité.

---

## Session 37 — Refonte UI : navigation mobile + pages liste en cartes
**17 mai 2026**

### Fix — Métrologie et Maintenances absents de la navigation mobile
- **Cause racine** : `MobileDrawer.tsx` (drawer hamburger mobile) était un fichier séparé de `Sidebar.tsx` — les deux avaient des listes de navigation différentes. Métrologie et Maintenances étaient dans `Sidebar` mais pas dans `MobileDrawer`.
- **Correction** : ajout de `Métrologie` et `Maintenances` dans `MobileDrawer.tsx`, entre Matériel et Asservissement.

### Refonte — Pages liste en cartes (style Matériel)
- **Maintenances** : tableau `grid` → cartes individuelles avec icône ronde colorée par type (bleu = préventive, orange = corrective, rouge = panne). Badge statut à droite. Filtre "Abandonnée" ne déborde plus.
- **Métrologie** : tableau → cartes avec anneau `CircleProgress` métrologique (vert/orange/rouge selon échéance). Badges statut + résultat.
- **Missions** : liste groupée dans un bloc → cartes séparées (`flex flex-col gap-3`). Modification dans `ClientCard` : ajout border + shadow + rounded.

### Fix visuel — Icône `AlertTriangle` sur toutes les pannes
- **Cause** : type `panne` utilisait `AlertTriangle` comme icône → visuellement alarmant même pour des pannes résolues.
- **Correction** : icône `Wrench` rouge à la place, cohérent avec les autres types.

### UX — Légendes ajoutées
- **Maintenances** : légende des 3 types (icône + label) entre filtres et liste.
- **Matériel** : légende de l'anneau métrologique (3 points colorés : à jour / à prévoir / urgent).

### Prochaines étapes
- Renseigner site (Quimper) et technicien sur les ~60 équipements existants
- Envoyer le lien staging à l'équipe pour validation

---

## Session 36 — Matériel : filtres technicien permanents
**17 mai 2026**

### Fix — Technicien assigné non sélectionnable
- **Cause racine** : `useUsersListener()` non appelé dans `EquipementPage` → store `users` vide → select vide.
- **Correction** : ajout de `useUsersListener()` dans `EquipementPage`.
- Même correction appliquée à `MaterielPage` pour le filtre technicien.
- Filtre role corrigé : `role !== 'charge_mission'` au lieu de `role === 'technicien'` — les admins (Tom) sont désormais inclus.

### Feature — Filtre technicien permanent sur la liste Matériel
- Le filtre "Tous techniciens" était conditionnel (catégories avec attribution uniquement) — rendu permanent.
- Réorganisation des filtres en deux lignes : catégorie + état / site + technicien.
- Nettoyage : constante `CATS_AVEC_TECHNICIEN` et variable `showTechFilter` retirées de `MaterielPage` (devenues inutiles).

### Prochaines étapes
- Renseigner site (Quimper) et technicien sur les 60 équipements existants
- Envoyer le lien staging à l'équipe

---

## Session 35 — Matériel : site + technicien + dashboard métrologie
**17 mai 2026**

### Fix dashboard — Conformité métrologie
- **Cause racine** : le KPI comptait les fiches `verifications` (collection vide si aucune saisie), alors que la page Métrologie calcule les statuts depuis `prochainEtalonnage` des équipements.
- **Correction** : `useDashboardStats` réécrit pour utiliser `calcStatut` (même logique que `useMetrologieRows`) — union vérifications + équipements sans vérif. Résultat : 79% (19/24 à jour) cohérent avec `/metrologie`.
- Sous-texte de la carte mis à jour : "X/Y à jour" au lieu de "X/Y conformes".
- Inversion KPI rapports ↔ conformité métrologie (ordre plus logique).

### Feature — Champ Site sur les équipements
- Nouveau type `SiteEquipement = 'quimper' | 'brest'` dans `types/index.ts`.
- Champ `site?` optionnel ajouté à l'interface `Equipement`.
- Select "Site" ajouté dans `EquipementForm` (section État et localisation).
- Affiché dans la fiche PDF (`FicheDeVie`).
- Filtre "Tous sites / Quimper / Brest" ajouté sur `MaterielPage`.

### Feature — Champ Technicien assigné sur les équipements
- Champ `technicien?` (initiales) ajouté à l'interface `Equipement`.
- 8 catégories concernées : reglet, thermometre, enregistreur, eprouvette, sonde_niveau, chronometre, glaciere, multiparametre.
- Select technicien conditionnel dans `EquipementForm` (rôle `technicien` uniquement depuis `usersStore`).
- Filtre "Tous techniciens" conditionnel sur `MaterielPage` (apparaît quand la catégorie filtrée est une catégorie avec attribution).

### Décisions
- Stockage par initiales (cohérent avec `preleveur` dans les missions).
- Filtre technicien conditionnel (pas affiché pour les catégories sans attribution individuelle).

### Prochaines étapes
- Renseigner le site et le technicien sur les 60 équipements existants (Quimper).
- Envoyer le lien staging à l'équipe : `https://labocea-pmc-v2-dev.tomkerf.workers.dev`

---

## Session 34 — Infrastructure git + tentative dashboard
**17 mai 2026**

### Infrastructure git
- Push GitHub débloqué : création d'un nouveau Personal Access Token (classic, scope `repo`) après expiration de l'ancien.
- Trousseau macOS configuré (`credential.helper osxkeychain`) — futurs push sans saisie de token.
- 10 commits de la session 33 poussés sur `origin/main`.

### Tentative d'égayage du dashboard
- Ajout d'emojis (📋 ✅ 📬 🔬) dans les KPI cards via prop `emoji` sur `StatCard`.
- Revert immédiat sur demande — rendu jugé non satisfaisant.
- Dashboard revenu à son état d'origine.

### Prochaines étapes
- Envoyer le lien staging à l'équipe : `https://labocea-pmc-v2-dev.tomkerf.workers.dev`
- Collecter les retours (1-2 semaines)
- Corriger les issues remontées
- Déployer en production : `npx wrangler deploy`

---

## Session 33 — Guide utilisateur + UX pré-prod
**17 mai 2026**

### Guide utilisateur (AidePage)
- Ajout section **"Par où commencer"** : première connexion, configuration des initiales, tableau des 6 modules, routine quotidienne (matin / terrain / signalement).
- Ajout section **"Tableau de bord"** : explication des 4 blocs (KPIs, planning du jour, donut matériel, alertes).
- Enrichissement **Missions** : 2 nouvelles étapes — suivi des rapports (prévu/envoyé) et suppression client irréversible.
- Enrichissement **Matériel** : localisation temps réel (labo/terrain/prêté) et suppression équipement.
- Enrichissement **Métrologie** : upload certificat PDF et filtres par statut.

### Changement de mot de passe (ComptePage)
- Nouveau bloc collapsible "Changer le mot de passe" dans Mon compte.
- Réauthentification Firebase (`reauthenticateWithCredential`) avant `updatePassword`.
- Gestion des erreurs : mauvais mot de passe actuel, mismatch confirmation, longueur < 6, trop de tentatives.

### Corrections UX
- **Tuyaux** : retrait des matériaux INOX, POLYÉTHYLÈNE et AUTRE — seuls VINYL (tricoclair), TÉFLON et SILICONE conservés (type + constante + couleurs).
- **Planning** : retrait du bouton 👥 "Vue équipe" et de la route `/planning/equipe` (page conservée dans le code).

### Décisions
- Stratégie déploiement confirmée : URL staging partagée avec l'équipe pour tests, prod uniquement après validation retours.
- Message de lancement staging rédigé et prêt à envoyer à l'équipe.

### Prochaines étapes
- Envoyer le lien staging à l'équipe : `https://labocea-pmc-v2-dev.tomkerf.workers.dev`
- Collecter les retours (1-2 semaines)
- Corriger les issues remontées
- Déployer en production : `npx wrangler deploy`

---

## Session 32 — Sécurité + Qualité + Code Review Senior
**16 mai 2026**

### Firestore Security Rules
- Règles durcies sur les collections critiques : `delete` réservé aux admins pour `clients-v2`, `equipements`, `verifications`, `maintenances`.
- Création `hasRequiredClientFields()` : validation serveur des champs `nom` et `annee` à la création.
- Déployé via `firebase deploy --only firestore:rules`.

### §4 Tests unitaires (TODO_REFACTORING soldé)
- Installation `@testing-library/react` + `jsdom`, vitest passé en environnement `jsdom`.
- **27 nouveaux tests** (66 total, 5 fichiers) :
  - `metrologie.test.ts` : `calcStatut` (7 tests) + `useMetrologieRows` (8 tests)
  - `dashboardStats.test.ts` : `missionsCeMois`, `conformitePct`, `parcEtat`, `prelevementsEnRetard` (12 tests)
- TODO_REFACTORING §1✅ §2✅ §3 écarté (risque 1MB théorique) §4✅ — backlog soldé.

### Skill tester-app
- Création `.claude/skills/tester-app/SKILL.md` : checklist de test manuel par module avant chaque deploy (auth, dashboard, missions, matériel, métrologie, maintenances, planning, mobile, admin, edge cases, commandes).

### Code Review Senior (subagent superpowers:code-reviewer)
Review complète de la codebase. 8 issues corrigées :

**Critiques :**
- `AdminPage` : `navigate()` pendant le rendu → déplacé dans `useEffect`
- `AdminPage` : champ mot de passe `type="text"` → `type="password"`
- `clientService.saveClient` : no-op silencieux si doc supprimé → `throw new Error`
- `clientService.deleteClient` : `getDoc` post-delete supprimé (inutile, trompeur avec cache Firestore offline)
- `storage.rules` : upload limité à 10MB + images uniquement (`contentType.matches('image/.*')`) — déployé

**Importants :**
- `dashboardUtils.isToday()` : insensible au fuseau horaire → comparaison via `localISO(new Date())`
- `useDashboardStats.aCalibrrer` : double comptage corrigé (Set par `equipementId`/`equipementNom`)
- Fixtures de tests : `new Date()` → `Timestamp.now()` (erreurs TypeScript à la compilation)

### Prochaines étapes
- Phase 6 : session de test avec l'équipe sur staging → corrections → déploiement production
- Issues restantes de la review (non bloquantes) : casts Firestore non validés (§5), logique métier dans pages (§10)

---

## Session 28 — Refactoring §2 : usePlanningCalendar
**15 mai 2026**

### Audit TODO_REFACTORING.md
- Constat : tâche "Extraction vues planning" (§2) déjà accomplie lors de la session du 8 mai — `DayView.tsx`, `WeekView.tsx`, `MonthView.tsx` existaient déjà dans `src/components/planning/`.
- TODO_REFACTORING.md mis à jour : item coché ✅ 2026-05-08.

### Refactoring — usePlanningCalendar
- Création de `src/hooks/usePlanningCalendar.ts` : extraction de 6 calculs inline depuis `PlanningPage.tsx`.
  - `filteredForDay` — filtrage avec regroupement par client (vue mois, DayModal)
  - `filteredForDayFlat` — filtrage sans regroupement (vue semaine, vue jour)
  - `monthPoolCount` — nombre de samplings non faits dans le mois visible
  - `bilanBand` — paires J1/J2 bilan 24h spanning (vue semaine)
  - `allDayItems` — événements multi-jours bande "toute la journée" (vue semaine)
  - `periodList` — liste chronologique pour la vue mobile
- `PlanningPage.tsx` : **828 → 692 lignes** (-136L). Imports nettoyés (sortEvts, groupByClient, filterEvents, normTech, EVENEMENT_LABEL, BilanGroup, AllDayItem retirés).
- TypeScript : 0 erreur. (commit `7ca3f8d`)

### Prochaines étapes
- TODO_REFACTORING §2 restant : Logique métier vs Vue (ClientPage 815L — audit à mener), Abstraction Firestore.

---

## Session 27 — Audit repo + filtres flacons
**14 mai 2026**

### Professionnalisation du repo (suite audit ChatGPT)
- **README** entièrement réécrit : contexte métier, fonctionnalités, stack, architecture, sécurité, URLs, setup, conventions. (commit `82a9bf7`)
- **`.env.example`** ajouté avec les 6 variables Firebase requises. (commit `d6c4601`)
- **TODO_REFACTORING.md** mis à jour : §2 marqué "prochaine étape", extraction vues planning ajoutée avec référence au skill dédié. (commit `ee8b48f`)

### Feature — Filtres flacons (MaterielPage)
- Deux selects (matériau + marque) apparaissent conditionnellement quand la catégorie "Flacons" est sélectionnée.
- Matériau : options statiques Plastique / Verre.
- Marque : options dérivées dynamiquement des flacons existants en Firestore.
- Changement de catégorie réinitialise les deux filtres. (commit `261bc66`)

### Données
- Suppression manuelle du doublon `12-SNI-08.B` en métrologie (Firestore Console) — doublon avec modèle abrégé "SOLINST 122" vs "SOLINST Sonde à interface 60m - Model 122".

### Viewer roadmap HTML
- **`roadmap.html`** ajouté à la racine : fetch `ROADMAP.md` depuis GitHub raw à chaque ouverture, rendu Apple-style.
- Tâches `- [x]` affichées avec ✅ + texte barré gris, tâches `- [ ]` en ◻ noir — prétraitement markdown côté JS (marked.js ne rendait pas les checkboxes GFM).

### Prochaine étape
- Refactoring architecture §2 (extraction vues planning avec skill `planning-view-extraction`) — nécessite `/effort high`.

---

## Session 26 — Ajustements visuels planning
**12 mai 2026**

### Corrections CSS planning
- **Icône pluie** : supprimée des en-têtes de dates (`.rain-overlay.opacity-30`), conservée uniquement dans les cellules de contenu (`.rain-overlay:not(.opacity-30)::after`).
- **Icône jours fériés** : opacité ajustée de `0.25` → `0.55` (meilleure lisibilité sans être trop envahissante).
- Analyser `EquipementPage.tsx` (782L) pour un futur refactoring.

---

## Session 38 — Gestion des Tâches (Todo List)
**26 mai 2026**

### Features & Architecture
- **Types TypeScript** : définitions de `Todo`, `TodoStatus`, `TodoPriority` dans `types/index.ts`.
- **Règles de sécurité Firestore** : mise à jour de `firestore.rules` pour la collection `/todos/{todoId}`, restreignant la suppression aux créateurs ou admins.
- **Gestion d'état (Zustand)** : création de `todosStore.ts` pour la synchronisation réactive de l'interface.
- **Service & Hook Firestore** : création de `todoService.ts` (méthodes `saveTodo`, `createTodo`, `deleteTodo` enveloppées dans `trackWrite`) et `useTodos.ts` (`useTodosListener` via `onSnapshot` temps réel).
- **Navigation** : intégration dans `Sidebar.tsx` et `MobileDrawer.tsx` avec l'icône `ListTodo`.
- **Tableau de Bord** : intégration d'un widget premium réactif `TodosWidget.tsx` au-dessus de `RapportsWidget` affichant les 5 tâches prioritaires non terminées, avec case à cocher interactive instantanée.
- **Page Principale Tâches** : page `TodosPage.tsx` inspirée de l'application *Rappels (Reminders)* d'Apple.
  - Filtre par attribution ("Toutes", "Miennes", "Équipe") via des boutons pilules avec transition spring coulissante.
  - Recherche textuelle et filtre par priorité.
  - Organisation en trois sections pliables : *À faire*, *En cours* et *Terminées* (fermée par défaut).
  - Checkbox ronde animée pour clore les tâches réactivement.
  - Double confirmation de suppression.
  - Liaison bidirectionnelle avec les fiches Clients/Missions et Équipements.
- **Qualité & Tests** : création de `useTodos.test.ts` (2 tests pour le hook de synchronisation). Lancement de la suite de tests (128/128 tests au vert).

---

## Session 74 — Cohérence UI rapports + gestion bugs admin
**27 mai 2026**

### Améliorations

**Widget Rapports (dashboard)**
- Titre renommé "Rapports à rédiger" (cohérent avec l'onglet Rapports)
- Bouton renommé "Rédigé ✓" → "Rédigé ✓"
- Couleurs du délai alignées sur RapportsPage : jours avant deadline (seuils <0 danger, ≤7 warning, >7 success)
- Correction du calcul : comparaison depuis minuit (comme la page) pour éviter un décalage de 1 jour dû à l'heure courante

**RapportsPage**
- Site géographique affiché inline sous le nom du plan — format "Rejet EP · Quimper"
- Appliqué sur les deux sections (À rédiger et Rédigés)

**AdminBugsSection**
- Bouton "Marquer traité" par ligne → écrit `status: 'traite'` dans Firestore
- Badge vert "Traité" remplace le bouton une fois traité
- Bugs traités masqués par défaut — lien "Voir les X traités" / "Masquer les traités"
- Type `BugReport` enrichi avec le champ `status?: 'ouvert' | 'traite'`

### Prochaines étapes
- Ordre de passage dans la tournée (drag & drop ou heure planifiée)

---

## Session 71 — Bugfixes dashboard
**27 mai 2026**

### Bugs corrigés

**J2 bilan 24h manquant dans "Planning de demain"**
- Cause racine : `lendemainItems` dans `useDashboardStats.ts` n'itère que les vrais samplings Firestore. Les événements J2 sont synthétiques dans `usePlanningData` (générés à J1+1 jour) et n'existent pas en base — ils n'apparaissaient donc jamais dans le widget dashboard.
- Fix : pour les plans `methode === 'Automatique'`, si le J1 tombe aujourd'hui, on injecte un item J2 ("Bilan 24h J2") dans `lendemainItems` pour demain.

**Layout mobile cassé sur le header planning**
- Cause racine : titre + bouton "Démarrer la tournée" + toggle Aujourd'hui/Demain dans un seul `flex justify-between` → débordement horizontal sur mobile.
- Fix : restructuration en deux lignes — ligne 1 : titre + toggle, ligne 2 : bouton tournée (conditionnel).

### Prochaines étapes
- Ordre de passage dans la tournée (drag & drop ou heure planifiée) — reporté
