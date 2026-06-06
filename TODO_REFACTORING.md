# Backlog de Refactoring & Architecture

Ce document liste les dettes techniques identifiées lors des audits successifs. À traiter progressivement.
**État actuel : 7.5/10** (audit dev senior mai 2026)

## 1. Découpage des "God Components" ✅ Soldé

- [x] `PlanPage.tsx` (~980L → 428L) ✅ 2026-05-11
- [x] `DashboardPage.tsx` (~890L → 407L) ✅ 2026-05-11
- [x] `BilanPage.tsx` (~880L → 122L) ✅ 2026-05-11
- [x] `EquipementPage.tsx` (~782L → 158L) ✅ 2026-05-11
- [x] `ClientPage.tsx` (717L → 142L) ✅ 2026-05-19
- [x] `AdminPage.tsx` (706L → 49L) ✅ 2026-05-19

## 2. Architecture & Découplage ✅ Soldé

- [x] Extraction vues planning (DayView, WeekView, MonthView) ✅ 2026-05-08
- [x] `usePlanningCalendar` + `useClientData` ✅ 2026-05-15
- [x] `useDocumentData<T>` générique ✅ 2026-05-16
- [x] Dead code supprimé (`PlanningEquipePage` 518L) ✅ 2026-05-19
- [x] Typo `MerologiePage` → `MetrologiePage` ✅ 2026-05-19
- [x] Fallback route `* → /` ✅ 2026-05-19

## 3. UX & Accessibilité ✅ Soldé

- [x] Skeletons sur listes principales (Missions, Matériel, Maintenances) ✅ 2026-05-19
- [x] Focus visible clavier (`:focus-visible` CSS) ✅ 2026-05-19
- [x] `aria-label` sur boutons icônes critiques ✅ 2026-05-19

## 4. Dette faible — À traiter si on touche ces fichiers

- [x] **`AidePage.tsx` (724L → 38L)** — Découpé en composants modulaires dédiés. ✅ 2026-05-22
- [x] **`InfosPage.tsx` (688L → 273L)** — Découpé en composants modulaires dédiés. ✅ 2026-05-22
- [x] **`PlanningPage.tsx` (682L → 322L)** — Vues, header, modales, hooks et mini-calendrier extraits. ✅ 2026-05-22
- [x] **`components/missions/` → `components/client/`** — Renommage convention auditeur. ✅ 2026-05-22

## 5. God Components restants

- [x] **`MissionDetailPage.tsx` (~385L → ~180L)** — Extrait : barre d'actions, carte infos, map. ✅ 2026-06-05

## 6. Évolutivité des données — Surveiller

- [ ] **Sous-collection `samplings`** : `plans` et `samplings` imbriqués dans le document client. Risque limite 1 Mo si historique croît. À migrer si un client approche la limite.

## 7. Qualité — Basse priorité

- [x] **Tests hooks** (`useClients`, `useEquipements`, `useVerifications`) — vitest en place, tests vérifiés. ✅ 2026-06-04
- [x] **Storybook** — en place (installation Storybook initiée). ✅ 2026-06-04

## 8. Performance — À traiter

- [ ] **`LazyMotion` Framer Motion** — remplacer `motion` par `m` + `LazyMotion` à la racine (`App.tsx`). Économie estimée ~30 Ko sur le bundle mobile. 16 occurrences à migrer.
- [ ] **`no-large-animated-blur`** — 7 cas de `blur(12–20px)` animé (sidebar, modals). Coûteux GPU sur mobiles anciens. Réduire ou ne pas animer le flou.

## 9. Maintenabilité — À traiter

- [ ] **`no-render-in-render`** — 4 fonctions locales type `renderSection()` à extraire en composants (dont `BilanMoisModal`). Recréent le DOM à chaque rendu.
- [ ] **`prefer-useReducer`** — formulaires avec 7–11 `useState` (ex: `DragCreateModal`, `EntryForm`). Centraliser avec `useReducer`.
- [ ] **Props drag redondantes** — `isInDrag` passé en prop à `WeekView`/`MonthView` alors que calculable depuis `isDragging + dragStart + dragEnd`.
- [ ] **Champ `tag` inutilisé** dans le type `AllDayItem` — à supprimer.

## 10. Accessibilité — 251 warnings restants (non bloquants)

- [ ] **`no-static-element-interactions`** (26 cas) + **`click-events-have-key-events`** (22 cas) — divs/spans avec `onClick` sans `role` ni handler clavier.
- [ ] **`control-has-associated-label`** (24 cas) — boutons icônes sans `aria-label`.
- [ ] **`no-autofocus`** (9 cas) — `autoFocus` dans `DayModalEvtTab`, `DragCreateModal` — désoriente les lecteurs d'écran.

## 11. Hors scope V2

- Virtualisation listes — jamais >50 items en pratique
- Logging prod — `console.*` résiduels tous justifiés
- Store filtres global — chaque page gère ses filtres localement, pas de partage
- Migration `samplings` en sous-collection Firestore — voir §6, à surveiller long terme

---
*Mis à jour le 2026-06-06 — §8–10 ajoutés depuis audit Gemini session 111 + liste TODO_PLANNING planning.*
