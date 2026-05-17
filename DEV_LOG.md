# DEV_LOG — Labocea PMC V2

Journal de développement chronologique. Mis à jour à chaque session de travail.

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
