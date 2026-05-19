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

- [ ] **`AidePage.tsx` (724L)** — contenu statique, pas critique. Découper seulement si on ajoute des sections. Gravité : faible.
- [ ] **`InfosPage.tsx` (688L)** — page terrain documentaire, peut rester monolithique. Gravité : faible.
- [ ] **`PlanningPage.tsx` (682L)** — complexe, déjà partiellement refactorisée. Découper si on doit y ajouter une feature. Gravité : moyenne.
- [ ] **`components/missions/` → `components/client/`** — alignement convention auditeur. Purement cosmétique, 30 min. Gravité : faible.

## 5. Évolutivité des données — Surveiller

- [ ] **Sous-collection `samplings`** : `plans` et `samplings` imbriqués dans le document client. Risque limite 1 Mo si historique croît. À migrer si un client approche la limite.

## 6. Qualité — Basse priorité

- [ ] **Tests hooks** (`useClients`, `useEquipements`, `useVerifications`) — vitest en place, ~2-3h de travail.
- [ ] **Storybook** — optionnel, pour documenter les composants UI.

## Hors scope V2

- Virtualisation listes — jamais >50 items en pratique
- Logging prod — 4 `console.*` dans tout le code, tous justifiés
- Store filtres global — chaque page gère ses filtres localement, pas de partage

---
*Mis à jour le 2026-05-19 — §1, §2, §3 soldés. Score audit : 7.5/10. Prochaine étape recommandée : déploiement prod + feedback équipe.*
