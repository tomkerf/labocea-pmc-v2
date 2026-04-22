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

*Dernière mise à jour : 22 avril 2026*
