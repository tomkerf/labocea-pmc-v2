# Fiche Point de Mesure dédiée — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer une page "Fiche Point de Mesure" autonome pour consulter à tout moment les métadonnées d'un point, éditer ses contraintes d'accès, voir sa galerie photos unifiée, ses rapports de visite préliminaire et son historique de prélèvements.

---

### Task 1 : Routage de la nouvelle page

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/PointMesureFichePage.tsx` (créer un squelette simple d'abord)

- [ ] **Déclarer le lazy import dans `src/App.tsx`** :
  ```typescript
  const PointMesureFichePage = lazy(() => import('@/pages/PointMesureFichePage'))
  ```

- [ ] **Ajouter la route dans `src/App.tsx`** :
  Ajouter sous la route de `PlanPage` :
  ```typescript
  <Route path="/missions/:clientId/plan/:planId/fiche" element={
    <Suspense fallback={<PageSpinner />}><PointMesureFichePage /></Suspense>
  } />
  ```

---

### Task 2 : Création de la Fiche Point de Mesure

**Files:**
- Modify: `src/pages/PointMesureFichePage.tsx`

- [ ] **Écrire le squelette d'intégration des hooks** :
  Utiliser `useParams` pour extraire `clientId` et `planId`, charger le client via `useClientData(clientId)` et les visites via `useVisites(clientId)`.

- [ ] **Ajouter le filtrage des visites préliminaires et l'agrégation des photos** :
  ```typescript
  const plan = client?.plans.find((p) => p.id === planId) ?? null
  
  // Mappage des inspections du point dans les visites préliminaires du client
  const pointVisits = visites.flatMap(v => 
    (v.points || [])
      .filter(p => p.nom.trim().toLowerCase() === plan?.nom.trim().toLowerCase())
      .map(p => ({
        visitId: v.id,
        date: v.date,
        technicienNom: v.technicienNom,
        ...p
      }))
  )
  
  // Galerie photos unifiée
  const samplingPhotos = plan?.samplings.flatMap(s => s.photos || []) || []
  const visitPhotos = pointVisits.flatMap(pv => pv.photos || [])
  const allPhotos = Array.from(new Set([...samplingPhotos, ...visitPhotos]))
  ```

- [ ] **Implémenter la mise à jour des contraintes terrain (Editable Textarea)** :
  ```typescript
  function handleSaveContraintes(text: string) {
    if (!client || !plan) return
    const updatedPlans = client.plans.map(p => 
      p.id === planId ? { ...p, contraintesParticulieres: text } : p
    )
    triggerSave({
      ...client,
      plans: updatedPlans
    })
  }
  ```

- [ ] **Implémenter le rendu UI complet de la fiche** :
  - Style Apple-style (cartes blanches avec bordures discrètes sur fond gris clair `#F5F5F7`).
  - Carte Google Maps (iframe).
  - Métadonnées complètes avec Badge **COFRAC** s'il est actif.
  - Liste chronologique des visites préliminaires.
  - Galerie de photos horizontale.
  - Timeline des prélèvements passés (`sampling.status === 'done'`).

---

### Task 3 : Points d'Entrée depuis PlanPage

**Files:**
- Modify: `src/pages/PlanPage.tsx`

- [ ] **Ajouter un bouton "Fiche du point" dans l'en-tête de `PlanPage.tsx`** :
  Ajouter à côté du bouton "Exporter en PDF" ou dans les actions de l'en-tête, un bouton sobre de redirection vers la fiche dédiée :
  ```typescript
  <button type="button"
    onClick={() => navigate(`/missions/${clientId}/plan/${planId}/fiche`)}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shadow-sm transition-all"
    style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}
  >
    <BookOpen size={13} />
    Fiche du point
  </button>
  ```

---

### Task 4 : Points d'Entrée depuis ClientPlans (Fiche Client)

**Files:**
- Modify: `src/components/client/ClientPlans.tsx`

- [ ] **Ajouter un lien d'ouverture de la fiche à côté de chaque plan** :
  À côté du titre du plan de prélèvement, placer une icône ou un petit lien direct pour ouvrir sa fiche Point de Mesure :
  ```typescript
  <button type="button"
    onClick={(e) => {
      e.stopPropagation()
      navigate(`/missions/${client.id}/plan/${plan.id}/fiche`)
    }}
    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
    title="Consulter la fiche du point"
  >
    <BookOpen size={14} />
  </button>
  ```

---

### Task 5 : Validation technique

- [ ] **Vérifier la compilation globale** :
  ```bash
  npm run build
  ```
- [ ] **Lancer le banc de tests** :
  ```bash
  npm test
  ```
