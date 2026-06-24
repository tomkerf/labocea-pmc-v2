# ROADMAP — Labocea PMC V2

> Développement solo (Tom + Claude), rythme soirs/weekends (~6-8h/semaine.
> Durée totale estimée : **12 semaines** — de mai à fin juillet 2026.

---

## Vue d'ensemble

```
Phase 1 — Fondations        Semaines 1-2    ░░░░░░░░░░  2 sem.
Phase 2 — Missions (V1→V2) Semaines 3-6    ░░░░░░░░░░  4 sem.
Phase 3 — Matériel          Semaines 7-8    ░░░░░░░░░░  2 sem.
Phase 4 — Métrologie        Semaines 9-10   ░░░░░░░░░░  2 sem.
Phase 5 — Dashboard         Semaines 11-12  ░░░░░░░░░░  2 sem.
Phase 6 — Deploy & Validate À fixer après validation équipe
```

---

## Phase 1 — Fondations (~12h)
**Semaines 1-2 | Objectif : l'app tourne, on peut se connecter et naviguer**

### Étape 0 — Init projet (3h)
- [x] `npm create vite@latest labocea-pmc-v2 -- --template react-ts`
- [x] Installer Tailwind CSS + configurer les tokens du design system (section 6 du CLAUDE.md)
- [x] Installer `react-router-dom`, `zustand`, `lucide-react`, `framer-motion`
- [x] Installer et configurer shadcn/ui : `npx shadcn-ui@latest init`
- [x] Configurer Firebase SDK (Auth + Firestore)
- [x] Configurer Wrangler (Cloudflare Workers)
- [x] Créer `deploy-dev.sh` et `deploy-prod.sh`

### Étape 1 — Authentification (4h)
- [x] Page `/login` — email + password, design Apple
- [x] `useAuthStore` Zustand : user, uid, role, initiales
- [x] Firebase Auth : signIn, signOut, onAuthStateChanged
- [x] Route guard global (redirect `/login` si non connecté)
- [x] Collection Firestore `users/{uid}` : création au premier login
- [x] Page `/compte` : profil + bouton déconnexion

### Étape 2 — Layout et navigation (5h)
- [x] Composant `AppLayout` : sidebar desktop + tab bar mobile
- [x] `Sidebar` : 5 sections (Missions / Matériel / Métrologie / Maintenances / Compte)
- [x] `TabBar` : visible mobile uniquement, 5 icônes + labels
- [x] `TopBar` : titre de page + actions contextuelles
- [x] Transitions de page Framer Motion (fade 150ms)
- [x] Déploiement staging initial : `bash deploy-dev.sh` ✓

**Livrable Phase 1 :** on se connecte, on navigue entre les sections vides, l'app est en ligne sur staging.

---

## Phase 2 — Module Missions (~22h)
**Semaines 3-6 | Objectif : migration complète du cœur métier V1**

C'est la phase la plus longue — c'est le module le plus complexe et celui qui contient toutes les données existantes.

### Liste clients (5h)
- [x] Page `/missions` : liste des clients avec filtres (technicien, statut, mois, site)
- [x] Composant `ClientCard` : nom, segment, prochain prélèvement, badge statut
- [x] Lecture temps réel `onSnapshot` sur `clients-v2`
- [x] Bouton "Nouveau client"

### Fiche client (5h)
- [x] Page `/missions/:clientId` : informations administratives complètes
- [x] Formulaire `ClientForm` : tous les champs V1 (interlocuteur, devis, budget, sites…)
- [x] Liste des plans de prélèvement de ce client
- [x] Écriture Firestore avec `updatedBy` = uid connecté

### Fiche plan (7h)
- [x] Page `/missions/:clientId/plan/:planId`
- [x] Formulaire `PlanForm` : fréquence, nature eau, méthode, GPS
- [x] Calendrier annuel des prélèvements (vue mois par mois)
- [x] Chaque prélèvement : badge statut coloré (planifié / fait / en retard / non effectué)

### Saisie prélèvement (5h)
- [x] Formulaire `SamplingForm` : date réalisée, statut, nappe haute/basse, rapport
- [x] Historique des reports de date (reportHistory)
- [x] Auto-save debounce 800ms
- [x] Marquage `doneBy` = uid de l'utilisateur connecté

**Livrable Phase 2 :** les missions V1 sont entièrement accessibles et éditables en V2. L'équipe peut commencer à tester.

---

## Phase 3 — Module Matériel (~10h)
**Semaines 7-8 | Objectif : inventaire complet du parc terrain**

### Liste équipements (4h)
- [x] Page `/materiel` : liste avec filtres (catégorie, état)
- [x] Composant `EquipementCard` : nom, N° série, état, indicateur métrologie
- [x] Composant `CircleProgress` : anneau SVG animé (vert/orange/rouge selon échéance)
- [x] Lecture temps réel `onSnapshot` sur `equipements`

### Fiche équipement (4h)
- [x] Page `/materiel/:equipementId`
- [x] Formulaire `EquipementForm` : marque, modèle, catégorie, localisation
- [x] Historique des vérifications métrologiques (lecture seule)
- [x] Historique des maintenances (lecture seule)

### Création équipement (2h)
- [x] Formulaire ajout depuis `/materiel`
- [x] Écriture dans `equipements/{id}` avec `createdBy`

**Livrable Phase 3 :** tout le parc matériel est saisissable et visible avec les indicateurs d'alerte.

---

## Phase 4 — Modules Métrologie + Maintenances (~12h)
**Semaines 9-10 | Objectif : traçabilité des vérifications et interventions**

### Métrologie (6h)
- [x] Page `/metrologie` : tableau statuts (à jour / à prévoir / en retard)
- [x] Composant `VerificationRow` : statut coloré, dates, technicien
- [x] Calcul automatique statut selon `prochainControle`
- [x] Formulaire `VerificationForm` : équipement, type, date, résultat, prochain contrôle
- [x] Page `/metrologie/:verificationId` : fiche détail
- [x] Mise à jour de `prochainEtalonnage` dans l'équipement concerné

### Maintenances (6h)
- [x] Page `/maintenances` : liste avec filtres (équipement, type, statut)
- [x] Composant `MaintenanceRow`
- [x] Formulaire `MaintenanceForm` : type, dates, description, pièces, coût
- [x] Page `/maintenances/:maintenanceId` : fiche détail
- [x] Mise à jour automatique statut équipement (`en_maintenance` si en cours)

**Livrable Phase 4 :** la traçabilité métrologique et les interventions sont opérationnelles. L'app est fonctionnellement complète.

---

## Phase 5 — Tableau de bord + Polish (~10h)
**Semaines 11-12 | Objectif : première impression premium**

### Dashboard (6h)
- [x] `GreetingHeader` : "Bonjour [Prénom] 👋" + date + résumé du jour
- [x] 4 `StatCard` : missions du mois, conformité métrologique, alertes, équipements à calibrer
- [x] `DayTimeline` : planning du jour en liste chronologique avec badges statut
- [x] `EquipementStatusSummary` : 4 compteurs (En service / À calibrer / En panne / SAV)
- [x] `AlertsSection` : métrologie et maintenances urgentes avec liens directs
- [x] `RecentActivity` : 5 dernières actions de l'équipe

### Polish mobile + accessibilité (4h)
- [x] Vérifier tous les écrans sur 375px (iPhone SE) et 428px (iPhone Pro Max)
- [x] Touch targets ≥ 44px sur tous les éléments interactifs
- [x] Focus visible sur tous les inputs (accessibilité clavier)
- [x] Test cache Firestore (fonctionnement hors connexion partielle)
- [x] Favicon + manifest PWA basique

**Livrable Phase 5 :** l'app est visuellement complète et utilisable depuis le terrain.

---

## Phase 6 — Déploiement et validation (~4h)
**Timing : après validation personnelle de la Phase 5**

- [x] Déploiement staging complet : `bash deploy-dev.sh` ✅
- [ ] Session de test avec l'équipe (1-2 semaines de retours)
- [ ] Corrections issues de la phase de test
- [ ] Déploiement production : `npx wrangler deploy`
- [ ] Archiver V1 (renommer le dossier, ne pas supprimer)
- [ ] Communiquer à l'équipe l'URL de production

---

## Phase 7 — Planning + Polish dashboard (~5h)
**Inspiré des mockups ChatGPT — évolution naturelle post-V2**

### Vue Planning (~3h)
- [x] Page `/planning` : navigation semaine (← →) avec grille Lun→Dim
- [x] Points colorés sur les jours ayant des interventions
- [x] Timeline sous la grille : prélèvements + maintenances + vérifications du jour sélectionné
- [x] Chaque ligne cliquable → fiche correspondante
- [x] Ajout de Planning dans la sidebar et TabBar

### Donut chart matériel (~2h)
- [x] Composant `DonutChart` SVG : 4 segments colorés (opérationnel/à calibrer/maintenance/hors service)
- [x] Remplacer les 4 compteurs plats du Dashboard par le donut centré sur le total

### Guidage GPS de la tournée (~2h)
- [x] Générer l'URL d'itinéraire multi-destinations vers Google Maps dans `TourneePage.tsx`
- [x] Gérer le découpage de la tournée si > 10 points (limite Google Maps waypoints)
- [x] Gérer l'affichage d'alertes visuelles pour les points sans coordonnées GPS configurées

---

## Estimation totale

| Phase | Contenu | Heures | Semaines |
|-------|---------|--------|----------|
| 1 | Fondations (init + auth + nav) | ~12h | 2 sem. |
| 2 | Module Missions | ~22h | 4 sem. |
| 3 | Module Matériel | ~10h | 2 sem. |
| 4 | Métrologie + Maintenances | ~12h | 2 sem. |
| 5 | Dashboard + Polish | ~10h | 2 sem. |
| 6 | Deploy + Validation | ~4h | à fixer |
| **Total** | | **~70h** | **~12 sem.** |

À 6h/semaine → **fin juillet 2026** (en commençant début mai).
À 8h/semaine → **mi-juillet 2026**.

---

## Règles de travail

- **Chaque session avec Claude démarre par :** "on reprend la Phase X, étape Y du ROADMAP.md"
- **On ne passe pas à la phase suivante sans avoir déployé sur staging** la phase courante
- **Jamais de travail direct en prod.** Toujours staging → validation → prod
- **En cas de blocage > 30 min**, documenter le problème ici et passer à une autre tâche

---

## Journal de progression

| Date | Phase | Ce qui a été fait |
|------|-------|-------------------|
| 2026-04-18 | Phase 1 ✅ | Vite + React TS initialisé, Tailwind configuré avec tokens design system, Firebase SDK, Wrangler, deploy scripts, types Firestore complets, useAuthStore Zustand, useAuthInit hook, LoginPage, RequireAuth, AppLayout, Sidebar, TabBar, pages placeholder, router — build OK |
| 2026-04-18 | Phase 2 ✅ | Module Missions complet : store + onSnapshot, MissionsPage (liste + recherche + nouveau client), ClientCard, ClientPage (tous champs V1 + auto-save 800ms + gestion plans), PlanPage (config plan + calendrier prélèvements + SamplingForm inline), routes /missions/:clientId/plan/:planId — TypeScript 0 erreur |
| 2026-04-18 | Phase 3 ✅ | Module Matériel complet : equipementsStore, useEquipements (onSnapshot + save + create), CircleProgress (anneau SVG métrologie), EquipementCard (avec calcul % étalonnage), MaterielPage (liste + filtres catégorie/état + recherche), EquipementPage (fiche complète + auto-save 800ms + suppression), routes /materiel + /materiel/:equipementId — TypeScript 0 erreur |
| 2026-04-18 | Phase 4 ✅ | Modules Métrologie + Maintenances complets : metrologieStore, maintenancesStore, useVerifications, useMaintenances, MerologiePage (tableau + filtres statut + calcul auto à jour/à prévoir/en retard), VerificationPage (fiche + sync prochainEtalonnage équipement), MaintenancesPage (liste + filtres statut/type), MaintenancePage (fiche + auto-update état équipement en_cours/réalisée), routes /metrologie/:id + /maintenances/:id — TypeScript 0 erreur |
| 2026-04-18 | Phase 5 ✅ | Dashboard complet : KPIs temps réel (missions ce mois, conformité métrologie %, alertes actives, équipements à calibrer), planning du jour (prélèvements du jour avec badges statut + lien fiche), état du parc (4 compteurs avec icônes colorées), section alertes combinées métrologie+maintenances triées par urgence — TypeScript 0 erreur |
| 2026-04-22 | Qualité ✅ | Code review 11 points corrigés, zombie documents (runTransaction), alerte retrait intervention autre tech, système toasts, validation formulaires, eslint-disable supprimés, code-splitting 924kB→330kB, tests unitaires 39 tests (generateSamplings/isSamplingOverdue/generateId), versions dépendances figées |
| 2026-04-22 | Infra ✅ | Règles Firestore déployées (bloque V1 sans auth → fix définitif zombie docs), vérification post-delete côté serveur, redirect MissionDetailPage sur suppression client, CI staging verts (#147, #148) |
| 2026-04-23 | UX ✅ | Bug J1/J2 planning (doneDate écrasait plannedDay), swipe mobile vue jour, CheckCircle2 desktop, événements gris, badge Réalisé vert, setup .claude/skills/ |
| 2026-04-24 | Planning ✅ | Motif obligatoire report/retrait, fantômes visuels, modale intervention dans widget dashboard, mini-calendrier sidebar + overlay (3 mois), historique motifs dans PDF |
| 2026-04-25 | Features ✅ | Page Admin (création comptes), export PDF historique complet, page Infos terrain, avatar emoji, calculateur asservissement 24h mobile, widget rapports filtré technicien |
| 2026-04-26 | Mobile ✅ | Burger menu latéral mobile (remplace tab bar), groupement plans par site dans fiche client, dédoublonnage users, fix PDF |
| 2026-04-27 | Features ✅ | Météo pluie (config + planning), jours fériés français, module Tuyaux V1→V2, DnD points de prélèvement, photos terrain, persistance IndexedDB offline, dashboard alertes retard |
| 2026-04-28 | Finitions ✅ | assignedTo par prélèvement (technicien sans écraser client.preleveur), fallback mémoire IndexedDB, Bilan 24h retiré (→ labocea-app-rapports), badges planning gris rapport |
| 2026-05-08 | Refactor ✅ | Refactoring PlanningPage (extraction DayView/WeekView/MonthView/EventRow/MiniCalendar), fix build prod, déploiement staging. 3 points de dette technique identifiés et mis en TODO pour la suite (MonthGrid, filtres, props drag). |
| 2026-05-09 | Qualité + Sécu + UX ✅ | Dette technique planning soldée (MonthGrid, getISOWeek, getPeriodLabel, AllDayItem nettoyé), protection rôles admin (RequireAdmin + Firestore rules), mode d'emploi réécrit (6 modules), aides contextuelles in-app (tooltips statuts + métrologie + hint drag). |
| 2026-05-11 | Refactor ✅ | Refactoring massif des "God Components" (PlanPage, DashboardPage, BilanPage). Extraction des widgets, formulaires et logiques de calcul. Réduction de ~60% de la taille des pages. Déploiement staging. |
| 2026-05-12 | Solidité ✅ | Détection écriture concurrente (bandeau orange ClientPage + PlanPage), signalement de bugs in-app (BugReportModal + sidebar + AdminPage + règles Firestore + mode d'emploi). |
| 2026-05-12 | Style ✅ | Icône pluie retirée des en-têtes de dates, conservée dans les cellules de pills. Opacité icône jours fériés ajustée à 0.55. |
| 2026-05-14 | Repo + UX ✅ | README professionnel, .env.example, TODO_REFACTORING §2 priorisé, filtres matériau/marque sur flacons (MaterielPage), suppression doublon métrologie 12-SNI-08.B, roadmap.html viewer auto-update. |
| 2026-05-15 | Refactor ✅ | Extraction vues planning (§2) constatée déjà faite. Création usePlanningCalendar — 6 calculs inline extraits de PlanningPage (828 → 692L). TODO_REFACTORING mis à jour. |
| 2026-05-15 | Refactor ✅ | Abstraction Firestore §2 : useClientData + useDocumentData<T> (générique). ClientPage 815→717L, MaintenancePage 225→194L, VerificationPage 206→174L, PlanPage 470→416L. −215L au total. Staging déployé. |
| 2026-05-16 | Refactor ✅ | §2 soldé : MissionDetailPage 368→333L via useClientData. TODO_REFACTORING §2 entièrement coché. AdminPage non refactorisée (BugsSection déjà isolée). Prochaine priorité : §3 sous-collection samplings ou §4 tests. |
| 2026-05-16 | Qualité ✅ | Roadmap visuelle HTML (auto-fetch GitHub, journal-driven phase status, dots verts si phase done), sync checkboxes ROADMAP.md (75 tâches cochées), audit qualité pré-équipe : document.write→Blob URL (FicheDeVie + TabSynthese), confirm/alert→two-step state (PlanPage, EquipementPage, DemandesPage, useDocumentData, MaintenancePage, VerificationPage), : any→LucideIcon dans MobileDrawer. |
| 2026-05-16 | Sécu + Qualité ✅ | Firestore rules durcies (delete→admin, validation champs), Storage rules (10MB + images), §4 tests unitaires (66 tests, jsdom, renderHook), skill tester-app, code review senior (8 issues corrigées : navigate/render, password type, saveClient throw, deleteClient simplifié, isToday timezone, aCalibrrer double comptage). |
| 2026-05-17 | UX pré-prod ✅ | Guide utilisateur enrichi (Par où commencer, Tableau de bord, Missions rapports/suppression, Matériel localisation, Métrologie PDF), changement de mot de passe in-app (Mon compte), retrait vue planning équipe, matériaux tuyaux réduits à 3. Staging prêt pour envoi équipe. |
| 2026-05-17 | Infra + Explore ✅ | Git débloqué (nouveau PAT + osxkeychain), 10 commits poussés. Tentative emojis KPI cards — revert. |
| 2026-05-17 | Matériel + Dashboard ✅ | Fix conformité métrologie dashboard (calcul depuis statuts équipements), champ Site (Quimper/Brest) + filtre, champ Technicien assigné sur 8 catégories + filtre conditionnel. |
| 2026-05-17 | Matériel ✅ | Fix technicien assigné (useUsersListener manquant), filtre technicien permanent sur liste matériel, admins inclus dans la liste. |
| 2026-05-17 | UI cartes ✅ | Navigation mobile : Métrologie + Maintenances ajoutés dans MobileDrawer. Pages Maintenances, Métrologie, Missions refondues en cartes (style Matériel). Légendes types + anneau métrologique. |
| 2026-05-19 | Page Rapports ✅ | Fix bug rapportDate (double usage → séparation rapportDatePrevue/rapportDate). Nouvel onglet /rapports : sections À envoyer + Envoyés, filtre équipe, date prévue éditable, loading state. Widget dashboard enrichi (date prévue + lien Voir tous). |
| 2026-05-19 | Rapports UX ✅ | Groupement À envoyer + Envoyés par client puis par site. Responsive mobile (flex-col). rapportsAFaireMoi pour widget dashboard scopé au technicien. DonutChart whitespace-nowrap. |
| 2026-05-19 | Audit dette ✅ | ClientPage 717→142L, AdminPage 706→49L (extraction composants). PlanningEquipePage supprimée. MerologiePage→MetrologiePage. Skeletons sur 3 listes. Focus visible clavier + aria-labels. |
| 2026-05-20 | Refacto + bugfix | TuyauxPage 570→283L. Fix conformitePct dashboard (logique hybride resultat/date). UX rapports : bouton "Marquer envoyé". |
| 2026-05-20 | Bugfix rapports ✅ | Fix temps réel bouton "Marquer rédigé" (useClientsListener manquant). Renommage "envoyé" → "rédigé". Technicien affiché en mode toute l'équipe. Fix UID brut affiché. Fix CI (variables inutilisées). |
| 2026-05-20 | Planning UX ✅ | Groupement par client en vue jour/semaine (×N badge). Dépliage chevron avec sous-lignes individuelles. Fréquence affichée par sous-ligne. MonthView déjà groupée. |
| 2026-05-21 | Refacto PlanningPage ✅ | PlanningPage.tsx 682L→431L (-37%). Extraction usePlanningDrag, usePlanningActions, PlanningHeader. Fix double bandeau après extraction. |
| 2026-05-21 | Refacto PlanPage (1/2) | PlanPage.tsx 461L→334L (-27%). Extraction usePlanActions (audit trail, Firestore, PDF). Reste : SamplingRow + PdfPreviewModal. |
| 2026-05-21 | UX discoverabilité | État vide riche + carte dashed en bas de liste + wording précis sur Matériel, Métrologie, Maintenances. |
| 2026-05-22 | Refacto PlanPage (2/2) + UX Personnalisé ✅ | PlanPage 334L→227L. Extraction SamplingRow + PdfPreviewModal. Création intervention sans date (dateUndefined). Nature eau usée par défaut. Carte dashed "Ajouter un point" toujours visible. |
| 2026-05-22 | Planning mobile ✅ | Regroupement par client et accordéons interactifs pour la vue planning mobile (EventRow, usePlanningCalendar, planningUtils). Tests et builds 100% OK. |
| 2026-05-22 | Refacto Aide + Infos ✅ | AidePage 724L→38L et InfosPage 688L→273L. Extraction en composants modulaires dédiés. Tests (67/67) et builds 100% OK. |
| 2026-05-22 | Rapports ✅ | Correction définitive de l'attribution des rapports (priorité 3 niveaux : assignedTo > doneBy > client.preleveur) pour résoudre le bug Kerjequel de Thomas. Tests (74) et staging OK. |
| 2026-05-22 | Dette technique ✅ | Alignement structurel des répertoires : renommage de components/missions en components/client. Cohérence imports et tests (74) verts. Déploiement staging OK. |
| 2026-05-22 | Qualité ESLint ✅ | Correction des 32 erreurs ESLint (pureté React 19) : Date.now() stabilisés, DonutChart pur, composants extraits. 0 erreur lint. |
| 2026-05-22 | Refacto PlanningPage (fin) ✅ | Extraction usePlanningNavigation + PeriodListView. PlanningPage 399→339L. Découpage architectural complet, §4 TODO soldé. |
| 2026-05-22 | Refacto PlanningPage (MiniCal) ✅ | Extraction du Mini-Calendrier et du backdrop overlay dans PlanningMiniCalendar. PlanningPage réduit à 322L. Tests (74) verts. |
| 2026-05-22 | Tests intégration ✅ | Création de tests d'intégration Firestore pour useClients, useEquipements, useVerifications (80/80 tests verts). |
| 2026-05-23 | Build / Staging ✅ | Fix de l'erreur d'upload d'assets Wrangler (accumulation de 4282 fichiers obsolètes) en activant emptyOutDir sur Vite. Déploiement staging 100% OK. |
| 2026-05-23 | Planning Carte ✅ | Carte interactive des tournées (Leaflet, pins colorés par technicien, sidebar, mobile carousel). Résolution définitive du bug de visibilité des épingles (découplage DOM + mapReady) et des règles Firestore preleveurs. Build & local 100% OK. |
| 2026-05-23 | Fix post-carte ✅ | Correction du label de période (carte = vue jour, pas mois) et de la navigation prev/next (incrémente selectedDate au lieu de monthStart). |
| 2026-05-23 | Bugs affichage carte ✅ | Sidebar tronquée corrigée (overflow:hidden + minWidth). Bandeaux "à planifier" et "Astuce drag" masqués en mode carte. |
| 2026-05-24 | Météo carte ✅ | Bandeau précipitations Open-Meteo en haut de la sidebar Carte (barycentre GPS, créneaux > 30%, fail silencieux). useWeather hook + 6 tests. |
| 2026-05-24 | Sync cloud ✅ | Badge nuage synced/syncing/offline dans TopBar mobile et Sidebar desktop. syncStore + trackWrite (6 services wrappés) + useNetworkStatus + SyncBadge. 98 tests. |
| 2026-05-25 | Tournée du jour ✅ | Mode Tournée du Jour : page /tournee accessible depuis Dashboard. TourneeItem (heure, GPS, météo), SaisieRapideModal (date/nappe/motif, Framer Motion), TourneeFinEcran (récap). Bouton conditionnel Dashboard. 115 tests, build 559ms. |
| 2026-05-25 | Qualité roadmap ✅ | Dynamisation complète de roadmap-visual.html et roadmap.html (chargement local/fallback, prochaines étapes dynamiques par phase, statut synchronisé par checkboxes). |
| 2026-05-25 | Notifications Push ✅ | Implémentation des notifications push (FCM) via un proxy sécurisé dans le Cloudflare Worker, service worker d'arrière-plan, hook React, switch de profil de style Apple et déclenchements automatiques (planning, bug). |
| 2026-05-25 | Config & Deploy Push ✅ | Configuration des variables d'environnement Firebase (.env), clé VAPID, secret FIREBASE_SERVICE_ACCOUNT injecté dans Wrangler. Staging déployé avec push activé. |
| 2026-05-25 | Raffinement UI/UX ✅ | Intégration de micro-animations premium Apple-style (Framer Motion spring, sélecteurs et navigation par pilule glissante layoutId, KPIs tactiles et cliquables pour la navigation). |
| 2026-05-25 | Raffinements Ultra-Premium ✅ | Scrollbars fines macOS, TopBar mobile flottante avec ombre 3D dynamique, modales à zoom élastique et verre dépoli, boutons haptiques et transitions de timelines en fondu. |
| 2026-05-25 | Phase 6 (Déploiement) ✅ | Validation via tests (115/115), build de production (0 erreur), et déploiement sur staging. Guide de test remplacé par le mode d'emploi interne. |
| 2026-05-26 | Visites Préliminaires ✅ | Implémentation du module de visites préliminaires (ClientPage, DemandeModal, hooks) + Modale de bienvenue incitant à lire le mode d'emploi. |
| 2026-05-26 | Dashboard / Push ✅ | Repliement par défaut du widget Métrologie à prévoir. Bypass auto-notification (allowSelfNotification) pour l'admin THK sur signalement de bug. |
| 2026-05-26 | Exports + Bilan UI ✅ | Implémentation des exports Planning PDF (liste de route A4) et Excel (tableur auto-ajusté) + refonte esthétique de la bande Bilan 24h avec en-tête asymétrique, icône Clock, badge Pose/Dépose et capsules dégradées avec ligne d'accentuation style Apple Calendar |
| 2026-05-26 | Gestion des Tâches ✅ | Implémentation complète du module de Gestion des Tâches (Todo List) : collection Firestore, règles de sécurité, store Zustand, hook temps réel onSnapshot, widget interactif sur le Tableau de bord et page principale Reminders-style Apple. |
| 2026-05-27 | Bugfixes dashboard | J2 bilan 24h manquant dans "Planning de demain" (item synthétique non généré) + layout mobile cassé sur le toggle Aujourd'hui/Demain. |
| 2026-05-27 | Reporter une intervention | Ajout du statut "Reporter" dans SaisieRapideModal (tournée) avec sélection de nouvelle date planifiée — met à jour plannedMonth/plannedDay en Firestore. |
| 2026-05-27 | Qualité code & sécurité | Installation react-doctor (score 57/100, fix button-has-type global + effect cleanup MapView) + security-guidance plugin Anthropic (revue sécurité automatique). |
| 2026-05-27 | Temps de pluie par défaut | Filtre "Temps de pluie" du planning activé par défaut (correction logique localStorage). |
| 2026-05-27 | Cohérence UI rapports + admin bugs | Widget rapports : titre/bouton/couleurs/calcul jours alignés sur RapportsPage. Site géographique affiché inline. AdminBugsSection : marquage traité + masquage par défaut. |
| 2026-05-28 | Suivi équipe CM ✅ | Implémentation du widget de suivi équipe pour les chargés de mission et admins : détection des prélèvements incomplets (isSamplingIncomplet), widget de style Apple (EquipeSuiviWidget) avec 4 KPIs, liste des manques (Date, Tech ou Nappe), intégration conditionnelle sur DashboardPage. Tests 100% PASS. |
| 2026-05-28 | Dashboard CM / Ajustements ✅ | Séparation du dashboard (Mon activité terrain / Suivi équipe CM) par onglets Apple-style, default tab intelligente par rôle, affichage du nom de point (planNom) dans les listes, icône pluie 🌧 dans les retards équipe, correction rapports dus (uniquement samplings done). |
| 2026-05-28 | Dashboard UX ✅ | Suppression temporaire du bouton "Démarrer la tournée", ajout du nom des points dans le widget des rapports à rédiger, et résolution du désalignement de calcul des rapports dus de l'équipe (dates futures corrompues). |
| 2026-05-28 | Alignement Excel Cindy ✅ | Ajout champs BC, COFRAC, contact prévenance, contraintes terrain dans types + formulaires. Badge COFRAC propagé dans tout le stack planning. Checklist terrain remplacée par contraintes particulières du plan dans MissionDetailPage. |
| 2026-05-28 | Fiche Point de Mesure ✅ | Création de la Fiche Point de Mesure dédiée (carte GPS, contraintes terrain éditables, uploads directs sur la fiche, galerie photo unifiée, listes des inspections de visites préliminaires et historique des prélèvements) + raccordement sur PlanPage et ClientPlans. |
| 2026-05-28 | Correction Upload Photo & HEIC ✅ | Déploiement des règles Firebase Storage pour plans/... + support automatique de la conversion HEIC (iPhone) vers JPEG côté client à l'upload + toasts de succès/erreur. |
| 2026-05-28 | Fix suppression photo ✅ | Séparation des règles Storage en create/update et delete pour résoudre l'erreur 403 Forbidden lors de la suppression de photo. |
| 2026-05-28 | Sélection HEIC Mac/PC ✅ | Mise à jour de l'attribut accept pour autoriser la sélection des fichiers .HEIC et .HEIF sous macOS et Windows. |
| 2026-05-28 | Migration heic-to ✅ | Migration de heic2any vers heic-to pour assurer le décodage et support des formats HEIC récents issus d'iOS 17+/iPhone 15+. |
| 2026-05-28 | Vignettes photo 96px + Zoom ✅ | Agrandissement des miniatures d'images à 96px et intégration du zoom natif au clic dans un nouvel onglet. |
| 2026-05-31 | Planning UX ✅ | Intégration des Tâches (todos) et Rapports dus dans le planning et le Dashboard. Ajustements de la sidebar et topbar. |
| 2026-06-01 | Bugfix planning ✅ | Couleur rapport dans EventPill corrigée : utilise techColor au lieu de statusColor fixe. |
| 2026-06-01 | Polissage UI/UX ✅ | Dashboard : bannière 🌧 à la place de "Pluie prévue" dans le planning, tâches retirées du widget planning. Page Tâches : dates en français, icônes edit/delete au hover, priorités !/!!/!!!, couleur avatar via getTechColor. |
| 2026-05-31 | Bugfixes + Qualité ✅ | Bilan 24h : ghost events exclus, lignes séparées par site, badge J1/J2 corrigé, sous-titre nettoyé. UI planning : pill retard supprimée, bouton 🌧 repositionné et rectangulaire. Hooks useWeather/useVisites : setState-in-effect corrigé. Accessibilité : 137 aria-label ajoutés (score react-doctor control-has-associated-label → 0). |
| 2026-06-01 | Planning — Filtres site + tech ✅ | Filtre par site (Quimper/Brest) + avatars circulaires pour les pills technicien. Fix usePreleveurs (collection vide → preleveurs-v1/data). Fix règles Firestore preleveurs-v1. |
| 2026-06-01 | Alignement Excel Cindy (suite) ✅ | Ajout section "Détail analytique" dans la fiche client. Création vue "Matrice Annuelle" dans le planning avec défilement sticky (légende + en-têtes). |
| 2026-06-01 | React Doctor — qualité code ✅ | 135 warnings fixés (645→510) : button-has-type éliminé, constantes hoistées, size-N, toSorted, flatMap. |
| 2026-06-01 | Polish matrice annuelle ✅ | Fix ligne bimensuel (DREAL CORPEP) : 2 dots chevauchants, masquage hors-saison, z-index statut critique. Dots 20px uniforme. Badge "manuel" sur plans Personnalisés. |
| 2026-06-02 | Accessibilité formulaires ✅ | label-has-associated-control : 72 → 0 (htmlFor+id sur 16 fichiers). Spans cliquables → button. Bugfix Set.toSorted() (TuyauxPage, PlanningHeader). Score react-doctor 71→72. |
| 2026-06-02 | Alignement Excel Cindy + Mode d'emploi ✅ | Analyse comparative Excel Cindy (24 colonnes). Ajout hasSousTraitance+nomSousTraitant et interlocuteurCommercial sur Client. Réorganisation fiche client (5 sections logiques). Mode d'emploi : filtre par profil (Technicien/Chargé de mission/Admin), corrections inexactitudes (vues Planning, filtres, KPIs Dashboard, 11 modules). |
| 2026-06-02 | Bugfix iCal Google Agenda ✅ | Correction de la durée des événements "Automatique" (2 jours pleins) et de l'assignation du technicien dans le flux iCal. Déploiement staging OK. |
| 2026-06-03 | iCal événements personnels ✅ | Les EvenementPersonnel (congés, réunions, rappels…) sont désormais exportés dans le flux iCal Google Agenda de chaque utilisateur. |
| 2026-06-03 | Matrice annuelle UX ✅ | Pastilles cliquables (overdue/non effectué → modale), groupement dépliable par client (tous repliés par défaut), vue compacte toggleable, conditions météo "temps sec" ajoutées. |
| 2026-06-04 | Nettoyage repo + vue compacte ✅ | Toggle vue compacte/normale supprimé — vue compacte en dur. Alerte GitHub secret scanning dismissée (clé Firebase publique dans historique). Staging déployé. |
| 2026-06-04 | Bugfixes + TypeScript any ✅ | Fix "Date à définir" (clear dateUndefined), inversion colonnes YearMatrixView, élimination 13 `any` TypeScript (prod + tests). |
| 2026-06-04 | Refactoring final ✅ | Constants unifiées (100+ fichiers), BaseModal créé, useReducer TodosPage, Storybook installé. Dette technique soldée. |
| 2026-06-04 | Bilan du mois ✅ | Création de la modale Bilan du mois (BilanMoisModal) affichant la liste des tâches (retard, effectuées, planifiées, etc) par mois. Ajout du bouton d'ouverture dans PlanningHeader à gauche des filtres de vue (Jour/Sem/Mois/An). Staging déployé. |
| 2026-06-05 | Bugfixes isSamplingOverdue ✅ | Code review multi-angles (session Gemini). 6 bugs corrigés : propagation isAutomatique à 4 call sites manquants, parseInt NaN BilanMoisModal, RESET_FORM leakait deletingId, toast.error sur échec save TodosPage. |
| 2026-06-05 | UI/UX Modale événement ✅ | Clarification du bouton principal (label + style primaire) et masquage du formulaire de retrait d'événement dans un accordéon. Staging déployé. |
| 2026-06-05 | Refactoring ✅ | Découpage de MissionDetailPage.tsx en sous-composants dédiés. Validation React Doctor à 100/100. |
| 2026-06-05 | Qualité / ESLint ✅ | Zéro erreur TypeScript et ESLint. Suppression des types `any`, variables non utilisées, et correction exhaustive des deps dans les React Hooks. |
| 2026-06-05 | Refactoring god components ✅ | Suppression doublon EventDetailModal. Découpage FicheDeVie (491→226L), DemandesPage (501→162L), ComptePage (480→97L), AsservissementPage (464→110L). 20 nouveaux composants extraits. 0 erreurs TS/ESLint. |
| 2026-06-06 | Refactoring god components (suite) ✅ | VisiteFormPage (441→235L), ClientPlans (395→188L), DayModal (377→101L), usePlanningFilters extrait. 9 nouveaux fichiers, 0 erreur TS/ESLint. |
| 2026-06-06 | Bugfix deploy + validation staging ✅ | Fix import Preleveur cassé dans usePlanningFilters. Checklist staging complète validée (auth, auto-save, statuts, planning, mobile, dashboard, matériel, métrologie, maintenances). En attente retour équipe Brest avant prod. |
| 2026-06-06 | Audit & Qualité ✅ | Audit global automatique (TypeScript et ESLint 100% clean), 145/145 tests unitaires verts (correction bug useWeather), résolution erreur a11y reduced-motion dans index.css, optimisation config vitest.config.ts pour Storybook, rédaction audit_results.md. |
| 2026-06-06 | CI / Build ✅ | Résolution des builds CI sur GitHub Actions par commit et push des correctifs de code locaux (9 fichiers). Validation du déploiement staging. |
| 2026-06-06 | Guidage GPS Tournée ✅ | Implémentation du Guidage GPS (API URL Google Maps), découpage dynamique en tronçons de 10 points max, alerte visuelle (⚠️) pour coordonnées GPS manquantes. |

---

*Roadmap générée le 2026-04-18.*
| 2026-06-07 | UX Météo Planning ✅ | Extension des prévisions à 14 jours, ajout et uniformisation du WeatherBadge (WeekView, MonthView, DayView) avec regroupement des heures de pluie. |
| 2026-06-07 | Météo Fallback + UX ✅ | Météo robuste même sur les semaines vides. Ajout espaces insécables et restauration affichage de la température max sur vue pluie. |
| 2026-06-09 | UX Matériel & Planning ✅ | Garde-fou d'assignation de matériel (grise les équipements déjà pris le même jour). Filtrage intelligent pour les bilans 24h (débitmètres, préleveurs, flacons uniquement). Affichage du matériel assigné dans le calendrier, la modale et la fiche mission. |
| 2026-06-10 | Qualité & CI ✅ | Bugfix CI TypeScript (PlanningEvent manquait equipementsAssignes + methode). Accessibilité YearMatrixView (aria-label cellules mois). Revue code Gemini session 119 (IIFE JSX supprimé). Score react-doctor 71→72/100. |
| 2026-06-11 | Refactoring composants ✅ | Découpage de 4 composants géants : RapportsPage, YearMatrixView, SamplingForm, EventDetailModal → 10 nouveaux fichiers extraits. Score react-doctor 72→73/100 (−5 no-giant-component). Reste : TodosPage + PlanningPage. |
| 2026-06-11 | UX Dashboard ✅ | Ajout d'un badge d'alerte orange/rouge "en retard" sur le widget "Temps de pluie" si au moins un prélèvement pluie est en retard. |
| 2026-06-12 | UX/UI Planning ✅ | Refonte design pastilles (Apple-style), cartouches Vues/Analytiques, matrice de charge améliorée (calcul dynamique + UI), infobulle d'explication. |
| 2026-06-12 | Bugfix Météo ✅ | Rétablissement de la météo pour les semaines sans interventions géolocalisées et extension des prévisions à 16 jours. |
| 2026-06-13 | Bugfix Planning ✅ | Correction du bug qui grisait les colonnes de congé pour toute l'équipe (limité désormais au seul technicien concerné). |
| 2026-06-13 | Refactoring Planning ✅ | Extraction PlanningFilterBar + PlanningDragHint depuis PlanningHeader. Suppression border-bottom. Logo sidebar réduit (size-8). |
| 2026-06-13 | Audit UI/UX + 8 fixes ✅ | Audit terrain complet. Badge DEV, footer sidebar visible, empty state kanban, scroll indicator matrice, routing post-login, sous-titre bouton Tournée, toolbar planning allégée (menu ⋯ exports). |
| 2026-06-14 | Bugfix Planning ✅ | Correction décalage J2/J1 sur Bilans 24h avec saisie Date réalisée. |
| 2026-06-14 | Audit UI/UX — suite et fin ✅ | Tooltips + hover DayView, bug hover ClientCard, Asservissement sidebar desktop, overflow toolbar ~953px, empty state MissionsPage. Audit UI/UX externe entièrement soldé. |
| 2026-06-17 | Export inventaire matériel ✅ | Bouton "Exporter" dans MaterielPage → PDF HTML avec filtres actifs, dates métrologie en rouge si dépassées, format A4 paysage. Fix XSS (esc helper). |
| 2026-06-18 | Premortem prod + fix data loss ✅ | Premortem déploiement prod. Fix : equipementService → runTransaction, EquipementCard + EquipementPage → try/catch + toast. 4 blocages prod notés (rôles, DSIN, perf, monitoring). |
| 2026-06-18 | Sécurité + perf listeners ✅ | Audit firestore.rules (solides) + storage.rules (delete documenté intentionnel). limit(200) sur useVerifications + useMaintenances. Légende planning + doc aide export PDF. |
| 2026-06-18 | Fiche de vie direct PDF ✅ | Bouton d'export PDF direct de la fiche de vie sur chaque équipement depuis la liste de matériel. Mocks de tests limit() fixés. |
| 2026-06-21 | Premortem #2 + sécurité + backup ✅ | Premortem actualisé (6 blocages). Firestore rules : immutableOn() protège createdBy/annee/equipementId. Backup automatique hebdomadaire via Cloud Scheduler → gs://labocea-pmc-backups. |
| 2026-06-21 | Harmonie & Accessibilité ✅ | Refonte UserAvatar (couleurs vives et harmonieuses Tailwind-600, texte blanc, responsive font-size pour initiales longues), harmonisation des TECH_COLORS/TECH_PALETTE et contrastes de texte. |
| 2026-06-22 | Audit UX ✅ | Restructuration de la navigation (sections Sidebar/Drawer), raccourcis Fiche Point dans la tournée terrain (TourneeItem Link + icon), et colonne collante (sticky) pour la matrice de charge. |
| 2026-06-23 | Refonte Mobile iOS ✅ | Refonte mobile iOS haute-fidélité des écrans Métrologie et Maintenances (boutons retour mobile, filtres style pilules glissantes iOS, codes équipement en monospace, et pastilles de statut avec points 6px). Fixes d'imports UserAvatar et types TS. |
| 2026-06-23 | Troncature Nom Matériel ✅ | Correction de la troncature des noms complets et codes d'équipements dans la liste de matériel. |
| 2026-06-23 | Mise en valeur Matériel ✅ | Mise en valeur du modèle et du type du matériel sur la ligne principale, marque en retrait entre parenthèses. |
| 2026-06-24 | WCAG + Photo dashboard + Fix monospace ✅ | --color-text-tertiary WCAG AA (2.21→4.6:1), bouton photo rapide inline sur lignes sampling du dashboard, suppression font-mono parasite (5 composants). |
| 2026-06-24 | En-têtes responsives mobiles ✅ | Alignement vertical automatique et boutons adaptatifs sur mobile (390px et moins) pour éviter tout chevauchement ou débordement sur 7 fichiers. |



