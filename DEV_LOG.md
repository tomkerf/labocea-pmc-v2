# DEV_LOG — Labocea PMC V2

Journal de développement chronologique. Mis à jour à chaque session de travail.


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
