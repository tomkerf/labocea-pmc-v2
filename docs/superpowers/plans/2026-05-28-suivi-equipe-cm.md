# Suivi équipe chargé de mission — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bloc "Suivi équipe" dans le dashboard, visible uniquement pour les rôles `charge_mission` et `admin`, affichant 4 KPIs et la liste des prélèvements incomplets avec lien direct vers la fiche.

**Architecture:** Un nouveau composant `EquipeSuiviWidget` autonome calcule les KPIs et la liste via `useMemo` depuis les `clients` déjà chargés. Il est rendu conditionnellement dans `DashboardPage` selon le rôle. Zéro nouveau champ Firestore.

**Tech Stack:** React, TypeScript, Tailwind, `react-router-dom` (useNavigate), Vitest + Testing Library

---

### Task 1 : Logique de calcul — `isSamplingIncomplet`

**Files:**
- Modify: `src/lib/overdue.ts`
- Test: `src/lib/__tests__/overdue.test.ts` (fichier existant ou à créer)

- [ ] **Vérifier si le fichier de test existe**

```bash
ls src/lib/__tests__/
```

Si absent, créer `src/lib/__tests__/overdue.test.ts`.

- [ ] **Écrire les tests pour `isSamplingIncomplet`**

Dans `src/lib/__tests__/overdue.test.ts`, ajouter :

```typescript
import { describe, it, expect } from 'vitest'
import { isSamplingIncomplet } from '../overdue'
import type { Sampling } from '@/types'

const base: Sampling = {
  id: 's1', num: 1, plannedMonth: 4, plannedDay: 15,
  status: 'done', doneDate: '2026-05-14', doneBy: 'uid1',
  nappe: 'haute', comment: '', rapportPrevu: false, rapportDate: '',
  tente: false, reportHistory: [],
}

describe('isSamplingIncomplet', () => {
  it('retourne false si tout est renseigné (plan non-nappe)', () => {
    expect(isSamplingIncomplet({ ...base, nappe: '' }, 'Eau usée')).toBe(false)
  })

  it('retourne false si tout est renseigné (plan nappe)', () => {
    expect(isSamplingIncomplet({ ...base, nappe: 'haute' }, 'Rivière')).toBe(false)
  })

  it('retourne false si status !== done', () => {
    expect(isSamplingIncomplet({ ...base, status: 'planned' }, 'Rivière')).toBe(false)
  })

  it('retourne true si doneDate manquante', () => {
    expect(isSamplingIncomplet({ ...base, doneDate: '' }, 'Eau usée')).toBe(true)
  })

  it('retourne true si doneBy manquant', () => {
    expect(isSamplingIncomplet({ ...base, doneBy: '' }, 'Eau usée')).toBe(true)
  })

  it('retourne true si nappe manquante sur plan Rivière', () => {
    expect(isSamplingIncomplet({ ...base, nappe: '' }, 'Rivière')).toBe(true)
  })

  it('retourne true si nappe manquante sur plan Souterraine', () => {
    expect(isSamplingIncomplet({ ...base, nappe: '' }, 'Souterraine')).toBe(true)
  })

  it('retourne true si nappe manquante sur plan AEP', () => {
    expect(isSamplingIncomplet({ ...base, nappe: '' }, 'AEP')).toBe(true)
  })

  it('retourne false si nappe manquante sur plan Eau usée', () => {
    expect(isSamplingIncomplet({ ...base, nappe: '' }, 'Eau usée')).toBe(false)
  })
})
```

- [ ] **Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/__tests__/overdue.test.ts
```

Attendu : FAIL sur `isSamplingIncomplet` (not defined).

- [ ] **Implémenter `isSamplingIncomplet` dans `src/lib/overdue.ts`**

Ajouter à la fin du fichier :

```typescript
const NATURES_NAPPE: string[] = ['Rivière', 'Souterraine', 'AEP']

export function isSamplingIncomplet(s: Sampling, nature: string): boolean {
  if (s.status !== 'done') return false
  if (!s.doneDate) return true
  if (!s.doneBy) return true
  if (NATURES_NAPPE.includes(nature) && !s.nappe) return true
  return false
}
```

- [ ] **Lancer les tests**

```bash
npx vitest run src/lib/__tests__/overdue.test.ts
```

Attendu : tous PASS.

- [ ] **Commit**

```bash
git add src/lib/overdue.ts src/lib/__tests__/overdue.test.ts
git commit -m "feat: ajouter isSamplingIncomplet dans overdue.ts"
```

---

### Task 2 : Composant `EquipeSuiviWidget`

**Files:**
- Create: `src/components/dashboard/EquipeSuiviWidget.tsx`
- Create: `src/components/dashboard/__tests__/EquipeSuiviWidget.test.tsx`

- [ ] **Écrire les tests**

Créer `src/components/dashboard/__tests__/EquipeSuiviWidget.test.tsx` :

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EquipeSuiviWidget } from '../EquipeSuiviWidget'
import type { Client } from '@/types'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c1', nom: 'Kerjequel', annee: '2026', numClient: '', nouvelleDemande: 'Annuelle',
  interlocuteur: '', telephone: '', mobile: '', email: '', fonction: '', mission: '',
  segment: 'Réseaux de mesure', numDevis: '', numConvention: '', preleveur: 'THK',
  dureeContrat: '', periodeIntervention: '', sites: [], montantTotal: 0,
  partPMC: 0, partSousTraitance: 0, plans: [], ...overrides,
})

const doneSampling = {
  id: 's1', num: 1, plannedMonth: 4, plannedDay: 10,
  status: 'done' as const, doneDate: '2026-05-10', doneBy: 'uid1',
  nappe: '' as const, comment: '', rapportPrevu: false, rapportDate: '',
  tente: false, reportHistory: [],
}

describe('EquipeSuiviWidget', () => {
  it('retourne null si aucun prélèvement incomplet', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Site', frequence: 'Mensuel',
      meteo: '', nature: 'Eau usée', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    const { container } = render(<EquipeSuiviWidget clients={[client]} />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche le titre "Suivi équipe"', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Site', frequence: 'Mensuel',
      meteo: '', nature: 'Rivière', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    render(<EquipeSuiviWidget clients={[client]} />)
    expect(screen.getByText(/suivi équipe/i)).toBeTruthy()
  })

  it('affiche le nom du client dans la liste des incomplets', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Jaudy', frequence: 'Mensuel',
      meteo: '', nature: 'Rivière', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    render(<EquipeSuiviWidget clients={[client]} />)
    expect(screen.getByText('Kerjequel')).toBeTruthy()
  })

  it('affiche le bon champ manquant', () => {
    const client = makeClient({ plans: [{ id: 'p1', nom: 'Plan', siteNom: 'Site', frequence: 'Mensuel',
      meteo: '', nature: 'Rivière', methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [{ ...doneSampling, nappe: '' }] }] })
    render(<EquipeSuiviWidget clients={[client]} />)
    expect(screen.getByText(/nappe/i)).toBeTruthy()
  })
})
```

- [ ] **Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/components/dashboard/__tests__/EquipeSuiviWidget.test.tsx
```

Attendu : FAIL (module not found).

- [ ] **Implémenter `EquipeSuiviWidget`**

Créer `src/components/dashboard/EquipeSuiviWidget.tsx` :

```typescript
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSamplingIncomplet, isSamplingOverdue } from '@/lib/overdue'
import type { Client, Plan, Sampling } from '@/types'

interface IncompletItem {
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  doneDate: string
  champManquant: string
}

function getChampManquant(s: Sampling, nature: string): string {
  if (!s.doneDate) return 'Date manquante'
  if (!s.doneBy) return 'Technicien manquant'
  if (['Rivière', 'Souterraine', 'AEP'].includes(nature) && !s.nappe) return 'Nappe manquante'
  return ''
}

interface Props {
  clients: Client[]
}

export function EquipeSuiviWidget({ clients }: Props) {
  const navigate = useNavigate()

  const { kpis, incomplets } = useMemo(() => {
    let realises = 0
    let enRetard = 0
    let rapportsDus = 0
    const incompletsList: IncompletItem[] = []

    for (const client of clients) {
      const year = parseInt(client.annee ?? String(new Date().getFullYear()))
      for (const plan of client.plans) {
        for (const s of plan.samplings) {
          if (s.status === 'done') {
            realises++
            if (isSamplingIncomplet(s, plan.nature)) {
              incompletsList.push({
                clientId: client.id,
                planId: plan.id,
                clientNom: client.nom,
                siteNom: plan.siteNom,
                doneDate: s.doneDate,
                champManquant: getChampManquant(s, plan.nature),
              })
            }
          }
          if (isSamplingOverdue(s, year)) enRetard++
          if (s.rapportPrevu && !s.rapportDate) rapportsDus++
        }
      }
    }

    incompletsList.sort((a, b) => b.doneDate.localeCompare(a.doneDate))

    return {
      kpis: { realises, incomplets: incompletsList.length, enRetard, rapportsDus },
      incomplets: incompletsList,
    }
  }, [clients])

  if (incomplets.length === 0) return null

  return (
    <div className="mb-6">
      <span className="text-xs font-semibold uppercase block mb-3"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        Suivi équipe
      </span>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Réalisés',    value: kpis.realises,   color: 'var(--color-success)' },
          { label: 'Incomplets',  value: kpis.incomplets, color: 'var(--color-warning)' },
          { label: 'En retard',   value: kpis.enRetard,   color: 'var(--color-danger)'  },
          { label: 'Rapports dus',value: kpis.rapportsDus,color: 'var(--color-accent)'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-3"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Liste incomplets */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Prélèvements incomplets
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {incomplets.length} à compléter
          </span>
        </div>
        {incomplets.map((item, i) => (
          <div key={`${item.clientId}-${item.planId}-${item.doneDate}`}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
            style={{ borderBottom: i < incomplets.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
            onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                {item.clientNom}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {item.siteNom}{item.doneDate ? ` · réalisé le ${new Date(item.doneDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              {item.champManquant}
            </span>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Lancer les tests**

```bash
npx vitest run src/components/dashboard/__tests__/EquipeSuiviWidget.test.tsx
```

Attendu : tous PASS.

- [ ] **Commit**

```bash
git add src/components/dashboard/EquipeSuiviWidget.tsx src/components/dashboard/__tests__/EquipeSuiviWidget.test.tsx
git commit -m "feat: composant EquipeSuiviWidget — suivi équipe pour chargés de mission"
```

---

### Task 3 : Intégration dans `DashboardPage`

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Ajouter l'import dans `DashboardPage.tsx`**

En haut du fichier, après les imports widgets existants :

```typescript
import { EquipeSuiviWidget } from '@/components/dashboard/EquipeSuiviWidget'
```

- [ ] **Ajouter le rendu conditionnel**

Dans le JSX de `DashboardPage`, après `<MetrologieWidget ... />` (dernière ligne des widgets) :

```typescript
{(role === 'charge_mission' || role === 'admin') && (
  <EquipeSuiviWidget clients={clients} />
)}
```

- [ ] **Vérifier le build**

```bash
npm run build
```

Attendu : `✓ built` sans erreur TypeScript.

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```

Attendu : tous PASS (même nombre qu'avant + nouveaux).

- [ ] **Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: intégrer EquipeSuiviWidget dans le dashboard pour charge_mission et admin"
```

---

### Task 4 : Déploiement staging

- [ ] **Déployer sur staging**

```bash
bash deploy-dev.sh
```

Attendu : `✅ Staging déployé` avec une nouvelle Version ID.

- [ ] **Vérifier manuellement**
  1. Se connecter avec un compte `technicien` → bloc "Suivi équipe" absent
  2. Se connecter avec un compte `charge_mission` ou `admin` → bloc visible
  3. Si des prélèvements `done` avec nappe manquante existent → apparaissent dans la liste
  4. Cliquer une ligne → navigation vers `/missions/:clientId/plan/:planId`

- [ ] **Commit final si ajustements**

```bash
git add -p
git commit -m "fix: ajustements visuels EquipeSuiviWidget après test staging"
```
