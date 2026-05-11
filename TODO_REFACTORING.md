# Backlog de Refactoring & Architecture

Ce document liste les dettes techniques identifiées lors de l'audit du 9 mai 2026. À traiter progressivement pour passer l'application d'un état "Junior/Prototype" à un état "Senior/Production-Ready".

## 1. Découpage des "God Components" (Priorité : Critique)
Les pages suivantes sont trop volumineuses et difficiles à maintenir. Elles doivent être découpées en sous-composants atomiques.
- [x] **`PlanPage.tsx` (~980 lignes → 428L)** : SamplingForm, PlanConfigSection, buildReportHtml extraits. ✅ 2026-05-11
- [x] **`DashboardPage.tsx` (~890 lignes → 407L)** : Widgets (KPIs, Planning du jour, État du parc, Alertes) extraits. ✅ 2026-05-11
- [x] **`BilanPage.tsx` (~880 lignes → 122L)** : 7 onglets + lib calculs extraits. ✅ 2026-05-11
- [x] **`EquipementPage.tsx` (~782 lignes → 158L)** : FicheDeVie + EquipementForm extraits. ✅ 2026-05-11

## 2. Architecture & Découplage (Priorité : Haute)
- [ ] **Logique métier vs Vue** : Extraire la logique de manipulation complexe des données (ex: calculs de stats, filtrage complexe) des composants `pages/` vers des hooks spécialisés ou des utilitaires purs.
- [ ] **Abstraction Firestore** : Centraliser davantage les appels Firestore dans des services ou hooks pour que les composants UI ne connaissent pas les détails de l'implémentation (ex: `onSnapshot`, `runTransaction`).

## 3. Évolutivité des données (Priorité : Moyenne)
- [ ] **Structure des documents Firestore** : Les `plans` et `samplings` sont actuellement imbriqués dans le document `client`. Risque de dépasser la limite de 1 Mo par document si l'historique croît. Envisager de déplacer les `samplings` dans une sous-collection `/clients-v2/{id}/samplings`.

## 4. Expérience Développeur (Priorité : Basse)
- [ ] **Tests Unitaires** : Augmenter la couverture sur les hooks de données (`usePlanningData`, etc.).
- [ ] **Storybook (Optionnel)** : Pour documenter et tester les composants UI "Apple-style" de manière isolée.

---
*Dette technique identifiée par Gemini CLI le 09/05/2026.*
