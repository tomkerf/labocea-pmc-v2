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

---

*Roadmap générée le 2026-04-18.*
