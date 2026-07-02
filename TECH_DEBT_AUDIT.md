# Tech Debt Audit — Labocea PMC V2

Generated: 2026-07-02
Scope: `src/` (287 fichiers TS/TSX, ~32 870 LOC) + config racine + dépendances.
Stack: React 18 + TypeScript + Zustand + Firebase Firestore, build Vite, déploiement Cloudflare Workers.

## Executive summary

1. **Codebase globalement sain.** `tsc --noEmit` propre, **0 dépendance circulaire** (madge, 291 fichiers), aucun fichier > 500 LOC, seulement **4 `any`** dans tout le code applicatif. Ce n'est pas un codebase en dette.
2. **Vulnérabilité dépendance sans fix — `xlsx` (SheetJS)** : 6 alertes (`npm audit`), dont 4 *high* (Prototype Pollution + ReDoS), **aucun correctif disponible en amont**. Seule dette de sécurité réelle.
3. **Concentration de churn + taille sur le module planning** : `planningUtils.ts`, `usePlanningData.ts`, `WeekView.tsx`, `DashboardPage.tsx`, `useDashboardStats.ts` — c'est là que se logera la dette future, à surveiller.
4. **Dead code isolé et sans risque** : composant `MobileDrawer.tsx` jamais importé, 4 exports morts, 12 types exportés inutilisés, 1 dépendance possiblement inutile (`@tailwindcss/oxide`).
5. **Gestion d'erreur mûre** : les `catch` vides sont tous intentionnels et commentés ; les mutations affichent des toasts d'erreur.
6. **Sécurité applicative solide** : `firestore.rules` couvre les 14 collections avec rôles et champs immuables ; pas de secret en dur (tout via `import.meta.env`).
7. **Risque opérationnel hors code** : staging et prod partagent la **même** base Firestore (`labocea-pmc`) — tout test d'écriture touche les vraies données.
8. **Bundle lourd** : chunk `heic-to` ~2,99 Mo (gzip 751 Ko) ; plusieurs chunks > 500 Ko signalés au build.
9. **Dérive documentaire mineure** : `CLAUDE.md` annonce react-doctor 39/100 (mémoire projet = 71/100) et « 66 tests » (réel = 232) ; `VITE_APP_VERSION` utilisée mais absente de `.env.example`.
10. **Tests concentrés sur `lib/`** ; les vues planning à fort churn (`WeekView`, `MonthView`, `WorkloadMatrixView`) n'ont pas de test de comportement.

## Architectural mental model

Flux unidirectionnel strict et bien respecté : `Firestore (onSnapshot)` → `hooks/` → `stores Zustand` → composants ; toutes les **écritures** passent par `services/`, chacune wrappée dans `trackWrite()` pour le compteur `pendingWrites`. Les hooks de collection globale (`useClients`, `useEquipements`, etc.) sont désormais montés une seule fois via `GlobalListeners` dans `AppLayout` (commit e379775), ce qui supprime la refacturation de lectures Firestore à chaque navigation. Les pages sont lazy-loaded. La couche `services` isole bien Firestore ; `authSecondary`/`dbSecondary` gère la création de comptes sans déconnecter l'admin. Ce modèle correspond fidèlement à ce que décrit `CLAUDE.md` — pas de contradiction architecturale.

Le seul endroit où l'architecture montre une tension est `useClientData.ts` : auto-save debounce 800 ms + détection de conflit collaboratif (bandeau REMOTE_CHANGED) + protection self-echo, le tout coordonné par des `useRef`. C'est le fichier le plus subtil du repo, et le plus sensible aux régressions.

## Findings

| ID | Category | File:Line | Severity | Effort | Description | Recommendation |
|----|----------|-----------|----------|--------|-------------|----------------|
| F001 | Dependency & security | package.json (`xlsx`) | High | L | `xlsx` (SheetJS) : Prototype Pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9), aucun fix npm | Migrer vers le tarball officiel SheetJS (`https://cdn.sheetjs.com`) qui est patché, ou isoler le parsing xlsx (données non fiables uniquement en import CSV/Excel manuel) | 
| F002 | Ops / data safety | .env / .env.local | High | S | Staging (`labocea-pmc-v2-dev`) et prod pointent la même base Firestore `labocea-pmc` — un test d'écriture sur staging modifie les vraies données | Créer un projet Firebase de dev séparé, ou au minimum documenter la règle « pas d'écriture de test sur staging » en tête de `deploy-dev.sh` |
| F003 | Architectural decay | src/components/layout/MobileDrawer.tsx | Medium | S | Composant complet jamais importé (confirmé : 0 référence hors du fichier) | Supprimer le fichier, ou le brancher s'il devait remplacer le menu burger actuel |
| F004 | Performance / bundle | src/… (heic-to) | Medium | M | Chunk `heic-to` ~2,99 Mo (gzip 751 Ko) ; build signale plusieurs chunks > 500 Ko | Vérifier que `heic-to` est bien en `import()` dynamique et chargé seulement à l'upload de photo HEIC ; sinon le rendre lazy |
| F005 | Test debt | src/components/planning/WeekView.tsx, MonthView.tsx, WorkloadMatrixView.tsx | Medium | M | Vues planning à fort churn (16/13/… modifs récentes) sans test de comportement | Ajouter des tests de rendu sur les cas limites (jour vide, J1/J2, fériés) — la logique pure `planningUtils` est déjà couverte (31 tests) |
| F006 | Test / CI friction | vitest.config (projet `storybook`) | Medium | S | `npm test` échoue par défaut si Playwright/Chromium n'est pas installé (le projet `storybook` tente de lancer un navigateur) | Documenter `npx playwright install` dans le README, ou exclure le projet `storybook` de `npm test` par défaut |
| F007 | Architectural decay | src/components/ui/avatarColors.ts:20, src/lib/planningUtils.ts:86, src/stores/authStore.ts:43, src/stores/pointsRejetStore.ts:20 | Low | S | 4 exports morts : `getAvatarColor`, `JOURS_LONG`, `selectIsAuthenticated`, `selectPointsRejet` | Supprimer (knip les confirme inutilisés) |
| F008 | Type & contract debt | src/pages/EquipementPage.tsx:126 | Low | S | `etat: pendingEtat as any` — cast qui contourne le type `EtatEquipement` | Typer `pendingEtat` en `EtatEquipement` et retirer le cast |
| F009 | Type & contract debt | src/components/dashboard/DashboardPlanningWidget.tsx:15, src/hooks/useWeather.ts:57 | Low | S | `activeItems: any[]` et réponse météo `(data: any)` non typées à une frontière de données | Définir une interface pour l'item planning et pour la réponse de l'API météo |
| F010 | Dependency debt | package.json:22 (`@tailwindcss/oxide`) | Low | S | Dépendance directe sans référence dans le code (knip) | Vérifier qu'elle n'est pas requise implicitement par Tailwind v4 ; sinon retirer de `dependencies` |
| F011 | Documentation drift | CLAUDE.md (section « État du projet ») | Low | S | Annonce react-doctor **39/100** alors que la mémoire projet indique **71/100** ; skill `tester-app` mentionne « 66 tests » (réel : 232) | Mettre à jour les chiffres |
| F012 | Documentation drift | .env.example | Low | S | `VITE_APP_VERSION` (utilisée dans `src/lib/sentry.ts`) absente de `.env.example` | Ajouter la clé documentée |
| F013 | Architectural decay | src/…/*.ts (12 types exportés) | Low | S | 12 types/interfaces exportés jamais consommés ailleurs (ex: `WarnType`, `RainWindow`, `ReportHistory`, `CategorieEquipement`) | Passer en type local (non exporté) ou supprimer |

## Top 5 — si tu ne corriges que ça

1. **F001 — Neutraliser `xlsx`.** C'est la seule vraie dette de sécurité. `npm audit` ne pourra jamais la « fix » (pas de version corrigée sur npm). Deux options concrètes : (a) remplacer par le build officiel patché de SheetJS via leur CDN dans `package.json` (`"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz"`), ou (b) confirmer que le parsing ne traite que des fichiers produits en interne (export → réimport), ce qui réduit fortement le risque d'exploitation.
2. **F002 — Séparer la base de dev.** Aujourd'hui « staging » est un faux filet de sécurité : il écrit dans la prod. Un second projet Firebase (`labocea-pmc-dev`) avec ses propres clés dans `.env.local` de staging rendrait les tests réellement sans risque. Effort modéré mais gain durable.
3. **F004 — Confirmer le lazy-load de `heic-to`.** 2,99 Mo, c'est presque la moitié du poids transféré. S'il est déjà en `import()` dynamique derrière l'upload photo, rien à faire (le noter en section « looks bad but fine ») ; sinon, un simple passage en import dynamique divise le bundle initial.
4. **F005 — Tester les vues planning.** C'est le module le plus modifié du repo (churn max) et celui qui casse le plus facilement en silence. Quelques tests de rendu sur `WeekView`/`MonthView` (jour vide, continuation J2, férié) protégeraient la zone chaude.
5. **F003 + F007 + F013 — Passe de nettoyage dead code (30 min).** `MobileDrawer.tsx` + 4 exports + 12 types morts : suppression mécanique, sans risque, confirmée par knip. Réduit le bruit pour les futurs audits.

## Quick wins (Low effort × Medium+ impact)

- [ ] F003 : supprimer `src/components/layout/MobileDrawer.tsx`
- [ ] F007 : supprimer les 4 exports morts (`getAvatarColor`, `JOURS_LONG`, `selectIsAuthenticated`, `selectPointsRejet`)
- [ ] F006 : documenter `npx playwright install` ou sortir `storybook` de `npm test`
- [ ] F008 : retirer le `as any` de `EquipementPage.tsx:126`
- [ ] F011 : corriger les chiffres react-doctor / nb de tests dans `CLAUDE.md`
- [ ] F012 : ajouter `VITE_APP_VERSION` à `.env.example`

## Things that look bad but are actually fine

- **Les `catch` « vides ».** `rg` en compte ~36, mais aucun n'est un vrai swallow silencieux : soit ils appellent `toast.error(...)` / `addToast('error', …)`, soit ils sont volontairement idempotents et **commentés** (`src/lib/uploadPhoto.ts:88/119/150` — suppression d'un fichier déjà supprimé ; `useClientData.ts:137` — attente d'une promesse de save à ignorer). Ne pas « corriger ».
- **Les multiples `useState`/`dispatch` dans le `useEffect` de `useClientData.ts`.** Ça ressemble à un anti-pattern React, mais c'est le pattern onSnapshot + détection de conflit, déjà documenté comme faux positif react-doctor. Load-bearing, ne pas toucher.
- **`types/index.ts` (455 LOC) et `planningUtils.ts` (407 LOC).** Gros fichiers, mais l'un n'est que des définitions de types et l'autre des fonctions pures bien testées. Taille ≠ dette ici.
- **`useUsers` / `useClients` etc. montés « partout ».** Semblait dupliqué, mais la centralisation dans `GlobalListeners` (commit e379775) fait que chaque collection n'est abonnée qu'une fois. Résolu.
- **Service workers `public/sw.js` et `firebase-messaging-sw.js` listés « unused » par knip.** Faux positif : ils sont référencés au runtime (enregistrement SW / push), pas par import statique.

## Open questions pour le mainteneur

- **`@tailwindcss/oxide` (F010)** est-il là volontairement pour forcer le moteur natif de Tailwind v4 sur un environnement précis (Cloudflare build) ? Si oui, garder et commenter ; sinon retirer.
- **`heic-to` (F004)** est-il déjà chargé en lazy uniquement lors d'un upload HEIC, ou entre-t-il dans le bundle initial ?
- **La base de dev séparée (F002)** est-elle un choix assumé (simplicité, une seule base) ou une contrainte non encore adressée avant la bascule Brest ?
- **`src/App.css`** listé unused par knip — reste-t-il des styles globaux utilisés, ou est-ce un résidu de la migration Tailwind ?
