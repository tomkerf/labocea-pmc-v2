# React Doctor — Faux positifs connus

## Sécurité — storage.rules (lecture et suppression larges)

- `storage.rules` — `allow read: if request.auth != null` sur tous les chemins (`samplings/`, `visites/`, `plans/`). Intentionnel : toute l'équipe doit pouvoir consulter les photos de tous les clients. Politique validée pour cette stack interne.
- `storage.rules` — `allow delete: if request.auth != null` sur les mêmes chemins. Intentionnel : les techniciens suppriment leurs propres photos depuis SamplingForm, VisiteFormPage et PlanConfigSection. Restreindre à admin casserait l'UX. Un lookup Firestore pour vérifier le rôle ajouterait de la latence sans apport de sécurité réel (tous les utilisateurs authentifiés sont des employés Labocea).

## Sécurité — react-doctor/firebase-client-owned-authz-field

- `src/hooks/useAuth.ts` — `setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true })`. `lastLoginAt` est un horodatage de connexion, pas un champ d'autorisation. Les champs sensibles (`role`, etc.) sont protégés comme immuables côté `firestore.rules` (validation livrée, cf. commit 6df9921). FP.

## react-doctor/auth-token-in-web-storage

- `src/components/actus/ActuFormModal.tsx:68` — `sessionStorage.setItem('pmc_gemini_api_key', …)`. Ce n'est pas un token d'auth de l'app : c'est une clé Gemini AI Studio *personnelle et optionnelle* que l'utilisateur colle lui-même pour l'assistant IA de rédaction d'actus. Stockée en `sessionStorage` (effacée à la fermeture de l'onglet, contrairement au `localStorage` utilisé avant le fix sécurité du 2026-07-20) — compromis assumé entre confort (pas de re-saisie à chaque génération) et surface d'exposition minimale. Pas de clé projet ni de secret partagé en jeu.

## Sécurité — dangerouslySetInnerHTML

- Signalé en session 128 par react-doctor. Introuvable dans `src/` au 2026-06-15 — faux positif de l'outil ou déjà corrigé dans un commit antérieur. Aucune occurrence de `dangerouslySetInnerHTML` ni d'`innerHTML` dynamique dans le code source.

## react-doctor/only-export-components

- `src/components/infos/EntryCard.tsx` — `TYPE_CONFIG` est co-localisé intentionnellement avec les composants `Badge`/`EntryCard` car ils sont étroitement couplés (config de rendu par type).
- `src/components/ui/UserAvatar.tsx` — `AVATAR_COLORS`, `DEFAULT_AVATAR_COLOR`, `getAvatarColor` sont co-localisés intentionnellement (palette utilisée par AppLayout pour les tokens CSS d'accent).
- `src/components/materiel/EquipementCard.tsx` — `ETAT_CONFIG` co-localisé intentionnellement ; consommé par `StatusChangeModal` et `ficheDeVieExport` qui en ont besoin pour les libellés d'état.

## react-doctor/no-mutable-in-deps

- `src/components/layout/AppLayout.tsx` — `location.pathname` en deps vient de `useLocation()` (React Router), pas de `window.location`. C'est réactif et correct en deps.

## react-doctor/effect-needs-cleanup

- `src/components/planning/MapView.tsx:153` — `marker.on()` sont des listeners Leaflet. Le cleanup du premier `useEffect` appelle `mapRef.current.remove()` qui détruit la carte et tous ses layers/listeners. Pas de fuite mémoire.
- `src/components/planning/useMapMarkers.ts:49` — même famille : `marker.on('popupopen'/'popupclose', …)` par marqueur Leaflet. Le cleanup du `useEffect` (lignes 113-116) appelle `markers.forEach(m => m.off())` (retire tous les listeners du marqueur) puis `markerGroup.clearLayers()`. Pas de fuite mémoire. FP.

## react-doctor/no-prop-callback-in-render

- `src/hooks/usePlanningExports.ts:32` — `filteredForDayFlat(dateStr)` (prop callback) est appelé dans un `useMemo`, pas pendant un rendu impur. La fonction est pure : elle enchaîne `filterEvents` → `sortEvts`/`groupByClient` (filtrage, tri) sans effet de bord, `setState` ni mutation externe. FP.

## dist_old/

- Tous les diagnostics dans `dist_old/` sont des artefacts de build archivés — ignorer.

## react-doctor/rendering-hydration-mismatch-time

- Toutes les occurrences dans `src/` — L'app est une SPA Vite + React déployée sur Cloudflare Workers comme bundle statique. Il n'y a pas de rendu serveur React (pas de SSR, pas d'hydration). Les `new Date()` et `Date.now()` dans le JSX ne causent aucune divergence hydration. FP systématique sur cette stack.

## react-doctor/no-large-animated-blur

- `src/components/layout/MobileDrawer.tsx`, `TabBar.tsx`, `AppLayout.tsx`, `Sidebar.tsx`, `pages/AsservissementPage.tsx` — Les `backdropFilter: 'blur(Npx)'` sont des effets de verre dépoli (glassmorphism Apple-style), appliqués sur des éléments de navigation fixes (sidebar, drawer, tab bar). Ce sont des styles statiques (non animés) sur des panneaux de petite surface — pas des filtres GPU coûteux sur viewport. Intentionnel, design system validé.
- `src/components/planning/CellContextMenu.tsx` — `backdrop-filter: blur(20px)` sur un petit menu contextuel. Intentionnel.
- `src/components/asservissement/AsservissementResultBar.tsx` — barre de résultat, surface réduite. Intentionnel.

## react-doctor/js-combine-iterations (faux positifs)

- `src/hooks/usePlanActions.ts` — `.filter().map()` sur `plan.samplings` avec index pour renumérotation. N < 20 dans tous les cas réels. Deux passes négligeables ; combiner nécessiterait un compteur externe qui nuit à la lisibilité.
- `src/components/tournee/SaisieRapideModal.tsx:72` — `.filter().map()` sur un tableau de 3 littéraux statiques. N trivial.
- `src/lib/exportClientHtml.ts:60` — `.flatMap().map()` avec transformation complexe (tri + génération HTML). La lisibilité prime, N < nombre de plans d'un client.

## react-doctor/js-combine-iterations (faux positifs — suite)

- `src/pages/PlanningPage.tsx:289` — `.filter().flatMap()` sur `eventsByDate[eventDetail.dateStr]` (N = nombre d'événements du jour, < 20 en pratique). Lisibilité prime sur l'optimisation marginale.

## react-doctor/js-flatmap-filter (faux positifs)

- `worker/index.js` — fichier Cloudflare Worker côté serveur, hors scope React Doctor.

## react-doctor/async-await-in-loop (faux positifs)

- `worker/index.js:353` et `worker/index.js:426` — fichier Cloudflare Worker côté serveur (do-while de traitement de requêtes), hors scope React Doctor.

## deslop/unused-file (faux positifs)

- `public/firebase-messaging-sw.js` — Service worker Firebase chargé dynamiquement par `firebase/messaging` via `navigator.serviceWorker.register()`, pas par import statique. deslop ne trace pas les enregistrements de service workers.

## react-doctor/no-derived-state (faux positifs)

- `src/hooks/usePushNotifications.ts:57` — `isPushEnabled` nécessite une vérification asynchrone du token Firebase + lecture Firestore. Ne peut pas être dérivé synchroniquement depuis d'autres états. FP confirmé (comportement async obligatoire).
- `src/pages/PointMesureFichePage.tsx:31` — valeur copiée dans l'état de façon intentionnelle avec eslint-disable existant. Sync effect délibéré pour initialiser le champ éditable depuis les données Firestore.

## react-doctor/no-chain-state-updates (faux positifs)

- `src/hooks/usePushNotifications.ts:57` — mises à jour d'état dans un callback async Firebase/Firestore. Le chaînage est inévitable après une opération asynchrone ; pas de render synchrone supplémentaire dans ce contexte.

## react-doctor/no-event-handler (faux positifs)

- `src/hooks/usePushNotifications.ts:55` — pattern async obligatoire : `checkIfTokenSynced` est une fonction async qui lit Firestore pour synchroniser l'état `isPushEnabled`. Impossible de le transformer en gestionnaire d'événement direct.

## react-doctor/exhaustive-deps (faux positifs)

- `src/components/plan/SamplingForm.tsx:33` — `eslint-disable` intentionnel sur cet effet qui auto-remplit `rapportDatePrevue`. Inclure `onUpdate` dans les deps provoquerait une boucle infinie (onUpdate est recréé à chaque render parent).
- `src/components/planning/useMapMarkers.ts:118` — `eslint-disable` intentionnel sur l'effet qui gère les markers Leaflet. Les dépendances omises (`handleSelectEvent`, `dateStr`) sont des fonctions/valeurs stables dont le changement ne doit pas recréer tous les markers (performance Leaflet).

## react-doctor/no-fetch-in-effect (faux positifs)

- `src/hooks/useWeather.ts:40` — SPA Vite sans SSR ni hydration. Le `fetch` dans l'effet utilise un flag `cancelled` pour éviter les race conditions et les mises à jour sur composant démonté. Pas de double-fire en production (StrictMode désactivé en prod). Pattern intentionnel et sûr sur cette stack.

## react-doctor/no-gray-on-colored-background (faux positifs)

- `src/components/plan/SamplingForm.tsx:32` — Pointage de ligne erroné par react-doctor : la ligne 32 est dans un `useEffect` sans aucune classe couleur. Aucun `bg-red` ni `text-neutral` dans ce fichier. FP de l'outil.

## react-doctor/no-derived-useState (faux positifs)

- `src/components/planning/DayModalPoolTab.tsx:166` — `poolDate` est initialisé depuis `dateStr` mais est intentionnellement éditable par l'utilisateur (champ date dans PoolItemRow). La correction canonique (prop `key` depuis le parent) nécessiterait de modifier le composant parent DayModal. Accepté comme dette mineure — le seul risque réel est une valeur stale si `dateStr` change sans que le modal se ferme et rouvre, ce qui ne se produit pas dans l'UX actuelle.

## react-doctor/set-state-in-effect (faux positifs)

- `src/pages/PlanningPage.tsx:115` (eslint-disable inline depuis 2026-07-02) — Initialisation unique de `filterSite`/`filterTech` quand le store `preleveurs` arrive (cas async). La lazy initializer de `useState` gère le cas synchrone (store déjà hydraté) ; l'effect prend le relais si les preleveurs n'étaient pas encore chargés au mount. Le `useRef siteDefaultApplied` garantit une exécution au plus une fois, et le guard `localStorage` évite d'écraser une préférence déjà sauvegardée. Pas de sync d'état en boucle — initialisation one-shot depuis données async.

## react-doctor/no-array-index-as-key (faux positifs)

- `src/components/planning/WorkloadMatrixView.tsx` — ✅ soldé le 2026-07-02 : les colonnes des 12 mois utilisent désormais `key={MOIS_LONG[i]}` (identifiant sémantique stable).

## react-doctor/no-event-handler (faux positifs — suite)

- `src/components/plan/SamplingForm.tsx:29` — Auto-remplissage de `rapportDatePrevue` depuis `doneDate` + 1 mois. Pas de gestionnaire d'événement approprié : la logique se déclenche en réaction à 3 props simultanées, pas à une action utilisateur unique. `eslint-disable` intentionnel (ligne 34).

## react-doctor/no-pass-data-to-parent (faux positifs)

- `src/components/plan/SamplingForm.tsx:32` — `onUpdate('rapportDatePrevue', ...)` dans un effet d'auto-remplissage. La logique appartient au composant enfant qui connaît `doneDate`, `rapportPrevu` et `rapportDatePrevue`. La remonter au parent disperserait la logique métier du formulaire.

## react-doctor/no-gray-on-colored-background (faux positifs — suite)

- `src/components/todos/TodoRow.tsx:167` — Bouton suppression avec `hover:bg-red-50 hover:text-red-500 text-neutral-500`. Les classes `hover:bg-red-50` et `hover:text-red-500` s'appliquent simultanément via la même pseudo-classe CSS `:hover` : on ne voit jamais `text-neutral-500` sur fond rouge. FP dû à l'analyse statique sans évaluation des états CSS combinés.

## react-doctor/js-combine-iterations (faux positifs — suite)

- `src/components/planning/WorkloadMatrixView.tsx:84` — `.filter().map().sort()` dans un `useMemo` avec dépendances stables. Recalcul uniquement sur changement de données. Performance négligeable (N = nb de techniciens, < 20).
- `src/pages/PlanningPage.tsx:168` — `.filter().flatMap()` sur les événements d'un seul jour (N < 20 en pratique). Lisibilité prime.

## react-doctor/no-many-boolean-props (déféré — refactor architectural)

- `src/components/planning/PlanningHeader.tsx:50` — 4 props booléennes (`showMiniCal`, `showRain`, `showDragHint`, `showBilanMois`). Vrai positif mais le découpage en sous-composants est un refactor architectural majeur (PlanningHeader est déjà optimisé et < 250L). À adresser si score target passe à 80+.

## react-hooks/purity (disables intentionnels — eslint-plugin-react-hooks v7)

- `src/components/equipement/FicheDeVie.tsx` (ancienneté) et `src/pages/EquipementPage.tsx` (`nowMs`) — `Date.now()` lu pendant le render, volontairement. SPA sans SSR : la valeur se rafraîchit à chaque render, c'est le comportement voulu pour l'affichage de durées/retards. Figer la valeur au mount (`useState` lazy) réintroduirait le bug « heure figée après minuit ». Disables inline avec justification.

## react-doctor/control-has-associated-label (faux positifs — PointCard)

- `src/components/visites/PointCard.tsx` — `<input type="file" hidden>` imbriqué à l'intérieur d'un `<label>` (pattern standard pour les custom file upload buttons). L'association est correcte par imbrication DOM ; react-doctor ne la détecte pas car il cherche `htmlFor`/`aria-label`/`aria-labelledby` explicites.
