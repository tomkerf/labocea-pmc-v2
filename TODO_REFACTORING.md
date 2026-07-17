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

## 8. Performance ✅ Soldé

- [x] **`LazyMotion` Framer Motion** — migré `motion` → `m` + `LazyMotion` à la racine. ~30 Ko bundle. ✅ 2026-06-06
- [x] **`no-large-animated-blur`** — `AppLayout` blur animé supprimé (blur statique). ✅ 2026-06-06

## 9. Maintenabilité ✅ Soldé

- [x] **`no-render-in-render`** — `renderSection()` → `BilanSection`, `renderItem()` → `PoolItemRow`. ✅ 2026-06-06
- [x] **`prefer-useReducer`** — `DragCreateModal` (7 états) + `EntryForm` (11 états) migrés. ✅ 2026-06-06
- [x] **Props drag redondantes** — `isInDrag` remplacé par `dragStart`/`dragEnd` dans WeekView et MonthView, calcul local `inDragRange`. ✅ 2026-06-12
- [x] **Champ `tag`** — inexistant dans `AllDayItem` (dette fantôme). ✅ 2026-06-12

## 10. Accessibilité ✅ Soldé (essentiel)

- [x] **`no-autofocus`** (9 cas) — tous supprimés. ✅ 2026-06-06
- [x] **`no-static-element-interactions`** — réduit de 26 → 6 (overlays modals → `role="presentation"`, items cliquables → `<button>`). ✅ 2026-06-06
- [x] **`click-events-have-key-events`** — éliminé (22 → 0). ✅ 2026-06-06
- [x] **`control-has-associated-label`** — disparu avec react-doctor v0.5.1 (détection HTML classique corrigée). `no-gray-on-colored-background` × 2 : `TodoRow.tsx:167` corrigé (neutral-400→500), `SamplingForm.tsx:32` FP de pointage. ✅ 2026-06-12
- Note : react-doctor v0.2.9 a ajouté de nouvelles règles (em-dash × 53, letter-spacing × 43) qui n'étaient pas dans le scope initial.

## 12. Audit UI/UX — retour design 2026-07-04

Retour externe (revue visuelle staging), non encore traité. Classé par effort.

**Quick wins (CSS/contenu seul)**
- [x] Bouton "Charge" actif (MissionsPage) trop saturé vs "Liste"/"Vue annuelle" — variante moins contrastée, même famille de bleu que le CTA principal
- [x] Badges de statut incohérents : Missions utilise `—` pour "pas de date" alors qu'ailleurs (Planning) c'est un point coloré — uniformiser sur un seul système
- [x] Graphique "Charge 2026" : barres écrasées en bas de leur zone, dur de comparer les mois — augmenter la hauteur utile + afficher la valeur au-dessus de chaque barre (pas seulement au survol)

**Effort moyen**
- [x] États vides pauvres (Demandes : "Visite préliminaire"/"Devis signé" ; Planning du jour : "Aucune intervention") — juste du texte gris. Ajouter icône + CTA (ex: "Planifier une visite")
- [x] Liste Missions : tags techniciens (ROD/THK/SRA) en gris peu lisibles à distance — utiliser le mapping couleur par technicien déjà existant (`TECH_COLORS`/`TECH_PALETTE` dans `planningUtils.ts`)
- [x] Planning hebdo : RDV/tâches/rappels/retraits tassés sans distinction visuelle claire — léger fond ou bordure par type d'item

**À vérifier avant d'agir**
- [x] Avatar "THK" en haut à droite du dashboard sans affordance claire (pas de chevron, pas d'indice de clic) — rendu cliquable vers /compte avec hover scale pour meilleure affordance.

## 11. Hors scope V2

- Virtualisation listes — jamais >50 items en pratique
- Logging prod — `console.*` résiduels tous justifiés
- Store filtres global — chaque page gère ses filtres localement, pas de partage
- Migration `samplings` en sous-collection Firestore — voir §6, à surveiller long terme

---
*Mis à jour le 2026-06-06 — §8–10 ajoutés depuis audit Gemini session 111 + liste TODO_PLANNING planning.*
