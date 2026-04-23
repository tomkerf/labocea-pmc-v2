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
- [ ] `npm create vite@latest labocea-pmc-v2 -- --template react-ts`
- [ ] Installer Tailwind CSS + configurer les tokens du design system (section 6 du CLAUDE.md)
- [ ] Installer `react-router-dom`, `zustand`, `lucide-react`, `framer-motion`
- [ ] Installer et configurer shadcn/ui : `npx shadcn-ui@latest init`
- [ ] Configurer Firebase SDK (Auth + Firestore)
- [ ] Configurer Wrangler (Cloudflare Workers)
- [ ] Créer `deploy-dev.sh` et `deploy-prod.sh`

### Étape 1 — Authentification (4h)
- [ ] Page `/login` — email + password, design Apple
- [ ] `useAuthStore` Zustand : user, uid, role, initiales
- [ ] Firebase Auth : signIn, signOut, onAuthStateChanged
- [ ] Route guard global (redirect `/login` si non connecté)
- [ ] Collection Firestore `users/{uid}` : création au premier login
- [ ] Page `/compte` : profil + bouton déconnexion

### Étape 2 — Layout et navigation (5h)
- [ ] Composant `AppLayout` : sidebar desktop + tab bar mobile
- [ ] `Sidebar` : 5 sections (Missions / Matériel / Métrologie / Maintenances / Compte)
- [ ] `TabBar` : visible mobile uniquement, 5 icônes + labels
- [ ] `TopBar` : titre de page + actions contextuelles
- [ ] Transitions de page Framer Motion (fade 150ms)
- [ ] Déploiement staging initial : `bash deploy-dev.sh` ✓

**Livrable Phase 1 :** on se connecte, on navigue entre les sections vides, l'app est en ligne sur staging.

---

## Phase 2 — Module Missions (~22h)
**Semaines 3-6 | Objectif : migration complète du cœur métier V1**

C'est la phase la plus longue — c'est le module le plus complexe et celui qui contient toutes les données existantes.

### Liste clients (5h)
- [ ] Page `/missions` : liste des clients avec filtres (technicien, statut, mois, site)
- [ ] Composant `ClientCard` : nom, segment, prochain prélèvement, badge statut
- [ ] Lecture temps réel `onSnapshot` sur `clients-v2`
- [ ] Bouton "Nouveau client"

### Fiche client (5h)
- [ ] Page `/missions/:clientId` : informations administratives complètes
- [ ] Formulaire `ClientForm` : tous les champs V1 (interlocuteur, devis, budget, sites…)
- [ ] Liste des plans de prélèvement de ce client
- [ ] Écriture Firestore avec `updatedBy` = uid connecté

### Fiche plan (7h)
- [ ] Page `/missions/:clientId/plan/:planId`
- [ ] Formulaire `PlanForm` : fréquence, nature eau, méthode, GPS
- [ ] Calendrier annuel des prélèvements (vue mois par mois)
- [ ] Chaque prélèvement : badge statut coloré (planifié / fait / en retard / non effectué)

### Saisie prélèvement (5h)
- [ ] Formulaire `SamplingForm` : date réalisée, statut, nappe haute/basse, rapport
- [ ] Historique des reports de date (reportHistory)
- [ ] Auto-save debounce 800ms
- [ ] Marquage `doneBy` = uid de l'utilisateur connecté

**Livrable Phase 2 :** les missions V1 sont entièrement accessibles et éditables en V2. L'équipe peut commencer à tester.

---

## Phase 3 — Module Matériel (~10h)
**Semaines 7-8 | Objectif : inventaire complet du parc terrain**

### Liste équipements (4h)
- [ ] Page `/materiel` : liste avec filtres (catégorie, état)
- [ ] Composant `EquipementCard` : nom, N° série, état, indicateur métrologie
- [ ] Composant `CircleProgress` : anneau SVG animé (vert/orange/rouge selon échéance)
- [ ] Lecture temps réel `onSnapshot` sur `equipements`

### Fiche équipement (4h)
- [ ] Page `/materiel/:equipementId`
- [ ] Formulaire `EquipementForm` : marque, modèle, catégorie, localisation
- [ ] Historique des vérifications métrologiques (lecture seule)
- [ ] Historique des maintenances (lecture seule)

### Création équipement (2h)
- [ ] Formulaire ajout depuis `/materiel`
- [ ] Écriture dans `equipements/{id}` avec `createdBy`

**Livrable Phase 3 :** tout le parc matériel est saisissable et visible avec les indicateurs d'alerte.

---

## Phase 4 — Modules Métrologie + Maintenances (~12h)
**Semaines 9-10 | Objectif : traçabilité des vérifications et interventions**

### Métrologie (6h)
- [ ] Page `/metrologie` : tableau statuts (à jour / à prévoir / en retard)
- [ ] Composant `VerificationRow` : statut coloré, dates, technicien
- [ ] Calcul automatique statut selon `prochainControle`
- [ ] Formulaire `VerificationForm` : équipement, type, date, résultat, prochain contrôle
- [ ] Page `/metrologie/:verificationId` : fiche détail
- [ ] Mise à jour de `prochainEtalonnage` dans l'équipement concerné

### Maintenances (6h)
- [ ] Page `/maintenances` : liste avec filtres (équipement, type, statut)
- [ ] Composant `MaintenanceRow`
- [ ] Formulaire `MaintenanceForm` : type, dates, description, pièces, coût
- [ ] Page `/maintenances/:maintenanceId` : fiche détail
- [ ] Mise à jour automatique statut équipement (`en_maintenance` si en cours)

**Livrable Phase 4 :** la traçabilité métrologique et les interventions sont opérationnelles. L'app est fonctionnellement complète.

---

## Phase 5 — Tableau de bord + Polish (~10h)
**Semaines 11-12 | Objectif : première impression premium**

### Dashboard (6h)
- [ ] `GreetingHeader` : "Bonjour [Prénom] 👋" + date + résumé du jour
- [ ] 4 `StatCard` : missions du mois, conformité métrologique, alertes, équipements à calibrer
- [ ] `DayTimeline` : planning du jour en liste chronologique avec badges statut
- [ ] `EquipementStatusSummary` : 4 compteurs (En service / À calibrer / En panne / SAV)
- [ ] `AlertsSection` : métrologie et maintenances urgentes avec liens directs
- [ ] `RecentActivity` : 5 dernières actions de l'équipe

### Polish mobile + accessibilité (4h)
- [ ] Vérifier tous les écrans sur 375px (iPhone SE) et 428px (iPhone Pro Max)
- [ ] Touch targets ≥ 44px sur tous les éléments interactifs
- [ ] Focus visible sur tous les inputs (accessibilité clavier)
- [ ] Test cache Firestore (fonctionnement hors connexion partielle)
- [ ] Favicon + manifest PWA basique

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
- [ ] Page `/planning` : navigation semaine (← →) avec grille Lun→Dim
- [ ] Points colorés sur les jours ayant des interventions
- [ ] Timeline sous la grille : prélèvements + maintenances + vérifications du jour sélectionné
- [ ] Chaque ligne cliquable → fiche correspondante
- [ ] Ajout de Planning dans la sidebar et TabBar

### Donut chart matériel (~2h)
- [ ] Composant `DonutChart` SVG : 4 segments colorés (opérationnel/à calibrer/maintenance/hors service)
- [ ] Remplacer les 4 compteurs plats du Dashboard par le donut centré sur le total

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

---

*Roadmap générée le 2026-04-18.*
