# Alignement Fichier Excel de Cindy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intégrer les champs administratifs, le Bon de Commande (BC), le flag COFRAC, le contact de prévenance et les contraintes particulières du fichier Excel de Cindy dans l'application PMC V2.

---

### Task 1 : Mise à jour des Types & de la structure

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Ajouter les champs administratifs et de contact à la structure `Client`** :
  Ajouter dans l'interface `Client` :
  ```typescript
  numBC?: string
  modeFacturation?: string
  situationActuelle?: string
  contactPrevenance?: string
  ```

- [ ] **Ajouter les champs opérationnels à la structure `Plan`** :
  Ajouter dans l'interface `Plan` :
  ```typescript
  cofrac?: boolean
  contraintesParticulieres?: string
  ```

---

### Task 2 : Formulaire de fiche Client (`ClientInfoForm.tsx`)

**Files:**
- Modify: `src/components/client/ClientInfoForm.tsx`

- [ ] **Ajouter les champs dans la section "Contact"** :
  Ajouter le champ `contactPrevenance` (ex: "Contact prévenance client") juste avant la fin de la section.

- [ ] **Ajouter une nouvelle section "Facturation & Situation"** :
  Ajouter avant la section "Description de la mission" :
  ```typescript
  <Section title="Facturation & Situation">
    <Field label="N° Bon de commande (BC)">
      <input value={client.numBC || ''} onChange={(e) => update('numBC', e.target.value)}
        className="field-input" placeholder="ex: BC-12345" />
    </Field>
    <Field label="Mode de facturation">
      <input value={client.modeFacturation || ''} onChange={(e) => update('modeFacturation', e.target.value)}
        className="field-input" placeholder="ex: Facturation mensuelle" />
    </Field>
    <Field label="Situation administrative" last>
      <input value={client.situationActuelle || ''} onChange={(e) => update('situationActuelle', e.target.value)}
        className="field-input" placeholder="ex: Convention signée" />
    </Field>
  </Section>
  ```

---

### Task 3 : Formulaire de configuration de Plan (`PlanForm.tsx`)

**Files:**
- Modify: `src/components/client/PlanForm.tsx` (ou modal de configuration équivalent dans `src/components/client`)

- [ ] **Localiser le formulaire de création / édition de plan**
- [ ] **Ajouter le Switch/Checkbox pour COFRAC** :
  Placer un commutateur ou une case à cocher "Prélèvement accrédité COFRAC" de style sobre Apple :
  ```typescript
  <Field label="Accréditation COFRAC">
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={plan.cofrac || false} 
        onChange={(e) => updatePlan('cofrac', e.target.checked)} 
        className="sr-only peer" />
      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
      <span className="ml-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Point accrédité</span>
    </label>
  </Field>
  ```

- [ ] **Ajouter le champ "Contraintes d'accès / Remarques terrain"** :
  ```typescript
  <Field label="Contraintes terrain">
    <textarea value={plan.contraintesParticulieres || ''} 
      onChange={(e) => updatePlan('contraintesParticulieres', e.target.value)}
      rows={2} className="field-input resize-none" placeholder="Codes barrières, équipements spécifiques..." />
  </Field>
  ```

---

### Task 4 : Badges COFRAC dans les interfaces de planning et de Dashboard

**Files:**
- Modify: `src/pages/PlanningPage.tsx`, `src/pages/DashboardPage.tsx`
- Modify: `src/hooks/useDashboardStats.ts`

- [ ] **Ajouter le badge COFRAC à côté du nom de plan dans le planning** :
  Quand on affiche un prélèvement ou un point de prélèvement, si `plan.cofrac === true`, rendre un petit badge discret `COFRAC` de couleur bleu/gris clair :
  ```typescript
  {plan.cofrac && (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" 
      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
      COFRAC
    </span>
  )}
  ```

- [ ] **Intégrer le badge COFRAC dans la liste du planning du jour du Dashboard**

---

### Task 5 : Validation & Build

- [ ] **Lancer un build de production pour valider les types et l'intégration** :
  ```bash
  npm run build
  ```
- [ ] **Exécuter les tests** :
  ```bash
  npm test
  ```
