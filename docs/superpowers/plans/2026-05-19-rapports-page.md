# Page Rapports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet Rapports dans la navigation principale avec deux sections (À envoyer / Envoyés), corriger le bug de double-usage de `rapportDate`, et relier le tout au widget dashboard existant.

**Architecture:** Nouveau champ `rapportDatePrevue` sur `Sampling` pour la date planifiée (séparé de `rapportDate` = date d'envoi effectif). La page `RapportsPage` agrège les données depuis le store Missions existant. Une fonction utilitaire `markRapportEnvoye` est extraite en service partagé pour éviter la duplication entre Dashboard et RapportsPage.

**Tech Stack:** React + TypeScript, Zustand (useMissionsStore, useAuthStore), React Router v6, Lucide React, CSS tokens design system existant.

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/types/index.ts` | Modifier — ajouter `rapportDatePrevue?: string` sur `Sampling` |
| `src/pages/PlanPage.tsx` | Modifier — écrire dans `rapportDatePrevue` (bug fix) |
| `src/components/plan/SamplingForm.tsx` | Modifier — afficher/éditer `rapportDatePrevue` |
| `src/hooks/useDashboardStats.ts` | Modifier — ajouter `rapportDatePrevue` sur `RapportItem`, exposer `rapportsEnvoyes` |
| `src/components/dashboard/RapportsWidget.tsx` | Modifier — afficher `rapportDatePrevue`, lien "Voir tous" |
| `src/pages/DashboardPage.tsx` | Modifier — transmettre `rapportDatePrevue` à `markRapportEnvoye`, lien vers `/rapports` |
| `src/pages/RapportsPage.tsx` | Créer — page principale Rapports |
| `src/components/layout/Sidebar.tsx` | Modifier — ajouter entrée nav Rapports |
| `src/components/layout/MobileDrawer.tsx` | Modifier — ajouter entrée nav Rapports |
| `src/App.tsx` | Modifier — ajouter route lazy `/rapports` |

---

## Task 1 : Corriger le type Sampling

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1 : Ajouter `rapportDatePrevue` sur l'interface Sampling**

Dans `src/types/index.ts`, après la ligne `rapportDate: string` :

```typescript
  rapportPrevu: boolean
  rapportDate: string           // date d'envoi effectif — "" si pas encore envoyé
  rapportDatePrevue?: string    // date d'envoi prévue (défaut: doneDate + 1 mois)
```

- [ ] **Step 2 : Vérifier que le build passe**

```bash
npm run build 2>&1 | tail -5
```

Attendu : `✓ built in ...ms` sans erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): ajouter rapportDatePrevue sur Sampling"
```

---

## Task 2 : Corriger le bug PlanPage (rapportDate → rapportDatePrevue)

**Files:**
- Modify: `src/pages/PlanPage.tsx`

Context : la modification du 2026-05-19 matin écrit dans `rapportDate` au lieu de `rapportDatePrevue`, ce qui casse le widget dashboard (qui considère `rapportDate !== ''` comme "déjà envoyé").

- [ ] **Step 1 : Corriger le calcul du défaut dans `updateSampling`**

Dans `src/pages/PlanPage.tsx`, trouver le bloc ajouté ce matin :

```typescript
      // Rapport : date par défaut = doneDate + 1 mois
      const effectiveDoneDate = field === 'doneDate' ? String(value) : s.doneDate
      const effectiveRapportPrevu = field === 'rapportPrevu' ? Boolean(value) : s.rapportPrevu
      if (effectiveRapportPrevu && !s.rapportDate) {
        if (effectiveDoneDate) {
          const d = new Date(effectiveDoneDate)
          d.setMonth(d.getMonth() + 1)
          patch.rapportDate = d.toISOString().slice(0, 10)
        }
      }
```

Remplacer par :

```typescript
      // Rapport : date prévue par défaut = doneDate + 1 mois
      const effectiveDoneDate = field === 'doneDate' ? String(value) : s.doneDate
      const effectiveRapportPrevu = field === 'rapportPrevu' ? Boolean(value) : s.rapportPrevu
      if (effectiveRapportPrevu && !s.rapportDatePrevue) {
        if (effectiveDoneDate) {
          const d = new Date(effectiveDoneDate)
          d.setMonth(d.getMonth() + 1)
          patch.rapportDatePrevue = d.toISOString().slice(0, 10)
        }
      }
```

- [ ] **Step 2 : Mettre à jour AUDIT_FIELDS pour tracer rapportDatePrevue**

Dans `src/pages/PlanPage.tsx`, dans la constante `AUDIT_FIELDS`, après la ligne `rapportDate` :

```typescript
  rapportPrevu: (v) => v ? 'Oui' : 'Non',
  rapportDate:      (v) => v ? new Date(v as string).toLocaleDateString('fr-FR') : '—',
  rapportDatePrevue: (v) => v ? new Date(v as string).toLocaleDateString('fr-FR') : '—',
```

- [ ] **Step 3 : Build**

```bash
npm run build 2>&1 | tail -5
```

Attendu : `✓ built in ...ms`

- [ ] **Step 4 : Commit**

```bash
git add src/pages/PlanPage.tsx
git commit -m "fix(plan): rapportDatePrevue au lieu de rapportDate pour la date planifiée"
```

---

## Task 3 : Mettre à jour SamplingForm

**Files:**
- Modify: `src/components/plan/SamplingForm.tsx`

- [ ] **Step 1 : Afficher et éditer `rapportDatePrevue` dans SamplingForm**

Dans `src/components/plan/SamplingForm.tsx`, trouver la zone où `rapportDate` est affiché (autour de la ligne `{sampling.rapportPrevu && (`). Remplacer le bloc d'input date rapport par :

```tsx
{sampling.rapportPrevu && (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
      Date envoi prévue
    </label>
    <input
      type="date"
      value={sampling.rapportDatePrevue ?? ''}
      onChange={(e) => onUpdate('rapportDatePrevue', e.target.value)}
      className="rounded-md px-3 py-2 text-sm"
      style={{
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
      }}
    />
  </div>
)}
```

Supprimer l'ancien input qui ciblait `sampling.rapportDate` (le champ "Date d'envoi" qui était dans le SamplingForm) — ce champ n'est plus éditable manuellement ici, il sera géré depuis la page Rapports.

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/plan/SamplingForm.tsx
git commit -m "feat(plan): SamplingForm affiche rapportDatePrevue éditable"
```

---

## Task 4 : Mettre à jour useDashboardStats

**Files:**
- Modify: `src/hooks/useDashboardStats.ts`

- [ ] **Step 1 : Ajouter `rapportDatePrevue` sur l'interface `RapportItem`**

Dans `src/hooks/useDashboardStats.ts`, modifier l'interface :

```typescript
export interface RapportItem {
  clientId: string; planId: string; samplingId: string
  clientNom: string; siteNom: string; planNom: string
  doneDate: string; joursDepuis: number; enRetard: boolean
  rapportDatePrevue: string   // peut être vide si non défini
  doneBy: string              // uid du technicien
}
```

- [ ] **Step 2 : Passer `rapportDatePrevue` et `doneBy` dans le push de `rapportsAFaire`**

Trouver le bloc `result.push({` dans `rapportsAFaire` (autour de la ligne 140) et ajouter les deux champs :

```typescript
          result.push({
            clientId: client.id, planId: plan.id, samplingId: s.id,
            clientNom: client.nom, siteNom: plan.siteNom || plan.nom || '—', planNom: plan.nom || '—',
            doneDate: s.doneDate, joursDepuis, enRetard: joursDepuis > 30,
            rapportDatePrevue: s.rapportDatePrevue ?? '',
            doneBy: s.doneBy ?? '',
          })
```

- [ ] **Step 3 : Ajouter le calcul `rapportsEnvoyes`**

Après le `useMemo` de `rapportsAFaire` (autour de la ligne 146), ajouter :

```typescript
  const rapportsEnvoyes = useMemo((): RapportItem[] => {
    const result: RapportItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach((plan: Plan) => {
        plan.samplings.forEach((s: Sampling) => {
          if (!s.rapportPrevu || !s.rapportDate) return
          if (!isGeneraliste) {
            const estMonRapport = s.doneBy ? s.doneBy === uid : client.preleveur === initiales
            if (!estMonRapport) return
          }
          result.push({
            clientId: client.id, planId: plan.id, samplingId: s.id,
            clientNom: client.nom, siteNom: plan.siteNom || plan.nom || '—', planNom: plan.nom || '—',
            doneDate: s.doneDate, joursDepuis: 0, enRetard: false,
            rapportDatePrevue: s.rapportDate,   // date d'envoi effectif affiché ici
            doneBy: s.doneBy ?? '',
          })
        })
      })
    })
    return result.sort((a, b) => b.rapportDatePrevue.localeCompare(a.rapportDatePrevue))
  }, [clients, isGeneraliste, uid, initiales])
```

- [ ] **Step 4 : Exposer `rapportsEnvoyes` dans le return du hook**

Trouver la ligne `return {` à la fin du hook et ajouter :

```typescript
    rapportsEnvoyes,
```

- [ ] **Step 5 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6 : Commit**

```bash
git add src/hooks/useDashboardStats.ts
git commit -m "feat(stats): RapportItem enrichi + rapportsEnvoyes exposé"
```

---

## Task 5 : Mettre à jour RapportsWidget (dashboard)

**Files:**
- Modify: `src/components/dashboard/RapportsWidget.tsx`

- [ ] **Step 1 : Ajouter `rapportDatePrevue` sur l'interface locale et lien "Voir tous"**

Remplacer l'intégralité du fichier `src/components/dashboard/RapportsWidget.tsx` par :

```tsx
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface RapportItem {
  clientId: string; planId: string; samplingId: string
  clientNom: string; siteNom: string
  doneDate: string; joursDepuis: number; enRetard: boolean
  rapportDatePrevue: string
}

interface RapportsWidgetProps {
  rapports: RapportItem[]
  onMarkEnvoye: (clientId: string, planId: string, samplingId: string) => void
}

export function RapportsWidget({ rapports, onMarkEnvoye }: RapportsWidgetProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Rapports à envoyer
        </span>
        {rapports.length > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            {rapports.length}
          </span>
        )}
        <ChevronDown size={14} strokeWidth={2} style={{
          color: 'var(--color-text-tertiary)', marginLeft: 'auto',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease',
        }} />
      </button>
      {open && (
        rapports.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-secondary)' }}>
            ✓ Tous les rapports ont été envoyés.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {rapports.map((r, i) => {
                const fmtDone = new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                const fmtPrevue = r.rapportDatePrevue
                  ? new Date(r.rapportDatePrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  : '—'
                const dotColor = r.enRetard ? 'var(--color-danger)' : r.joursDepuis > 15 ? 'var(--color-warning)' : 'var(--color-success)'
                const tagBg    = r.enRetard ? 'var(--color-danger-light)' : r.joursDepuis > 15 ? 'var(--color-warning-light)' : 'var(--color-success-light)'
                const tagColor = r.enRetard ? 'var(--color-danger)' : r.joursDepuis > 15 ? 'var(--color-warning)' : 'var(--color-success)'
                const tagLabel = r.enRetard ? `+${r.joursDepuis}j` : `${r.joursDepuis}j`
                return (
                  <div key={r.samplingId}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < rapports.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                    <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{r.clientNom}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {r.siteNom} · intervention {fmtDone} · envoi prévu {fmtPrevue}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: tagBg, color: tagColor }}>
                      {tagLabel}
                    </span>
                    <button
                      onClick={() => onMarkEnvoye(r.clientId, r.planId, r.samplingId)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent)', (e.currentTarget.style.color = 'white'))}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent-light)', (e.currentTarget.style.color = 'var(--color-accent)'))}
                    >
                      Envoyé ✓
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <button
                onClick={() => navigate('/rapports')}
                className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                Voir tous les rapports →
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/dashboard/RapportsWidget.tsx
git commit -m "feat(dashboard): widget rapports affiche date prévue + lien vers /rapports"
```

---

## Task 6 : Créer RapportsPage

**Files:**
- Create: `src/pages/RapportsPage.tsx`

- [ ] **Step 1 : Créer la page**

Créer `src/pages/RapportsPage.tsx` :

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectUid, selectAppUser, selectRole } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useVerificationsStore } from '@/stores/verificationsStore'
import { saveClient } from '@/services/clientService'
import type { Client, Plan, Sampling, RapportItem } from '@/types'

// RapportItem est exporté depuis useDashboardStats mais on le réimporte via le hook

export default function RapportsPage() {
  const navigate = useNavigate()
  const { clients } = useMissionsStore()
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)
  const role = useAuthStore(selectRole)
  const { users } = useUsersStore()
  useUsersListener()

  const equipements = useEquipementsStore((s) => s.equipements)
  const verifications = useVerificationsStore((s) => s.verifications)

  const isGeneraliste = role === 'admin' || role === 'charge_mission'
  const initiales = appUser?.initiales ?? ''

  const [touteEquipe, setTouteEquipe] = useState(isGeneraliste)

  const { rapportsAFaire, rapportsEnvoyes } = useDashboardStats({
    clients, uid: uid ?? '', initiales, isGeneraliste: touteEquipe,
    equipements, verifications, evenements: [],
  })

  async function markEnvoye(clientId: string, planId: string, samplingId: string) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    const today = new Date().toISOString().slice(0, 10)
    await saveClient({
      ...client,
      plans: client.plans.map((plan: Plan) => plan.id !== planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== samplingId ? s : { ...s, rapportDate: today }
        ),
      }),
    }, uid)
  }

  async function updateDatePrevue(clientId: string, planId: string, samplingId: string, date: string) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    await saveClient({
      ...client,
      plans: client.plans.map((plan: Plan) => plan.id !== planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== samplingId ? s : { ...s, rapportDatePrevue: date }
        ),
      }),
    }, uid)
  }

  function resolveNom(doneBy: string) {
    const u = users.find((u) => u.uid === doneBy)
    return u ? `${u.prenom} ${u.nom}` : doneBy || '—'
  }

  return (
    <div className="p-6 pb-10 max-w-4xl">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={22} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Rapports</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
          <button
            onClick={() => setTouteEquipe(false)}
            className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            style={{
              background: !touteEquipe ? 'var(--color-bg-secondary)' : 'transparent',
              color: !touteEquipe ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: !touteEquipe ? 'var(--shadow-card)' : 'none',
            }}
          >
            Mes rapports
          </button>
          <button
            onClick={() => setTouteEquipe(true)}
            className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            style={{
              background: touteEquipe ? 'var(--color-bg-secondary)' : 'transparent',
              color: touteEquipe ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: touteEquipe ? 'var(--shadow-card)' : 'none',
            }}
          >
            Toute l'équipe
          </button>
        </div>
      </div>

      {/* Section À envoyer */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            À envoyer
          </h2>
          {rapportsAFaire.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              {rapportsAFaire.length}
            </span>
          )}
        </div>

        {rapportsAFaire.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-secondary)' }}>
            ✓ Tous les rapports ont été envoyés.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {rapportsAFaire.map((r, i) => {
              const fmtDone = r.doneDate
                ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const today = new Date().toISOString().slice(0, 10)
              const joursAvant = r.rapportDatePrevue
                ? Math.floor((new Date(r.rapportDatePrevue).getTime() - new Date(today).getTime()) / 86400000)
                : null
              const delaiColor = joursAvant === null ? 'var(--color-text-tertiary)'
                : joursAvant < 0 ? 'var(--color-danger)'
                : joursAvant <= 7 ? 'var(--color-warning)'
                : 'var(--color-success)'
              const delaiBg = joursAvant === null ? 'var(--color-bg-tertiary)'
                : joursAvant < 0 ? 'var(--color-danger-light)'
                : joursAvant <= 7 ? 'var(--color-warning-light)'
                : 'var(--color-success-light)'
              const delaiLabel = joursAvant === null ? '—'
                : joursAvant < 0 ? `${Math.abs(joursAvant)}j de retard`
                : joursAvant === 0 ? 'Aujourd\'hui'
                : `dans ${joursAvant}j`

              return (
                <div key={r.samplingId}
                  className="flex items-center gap-3 px-4 py-3 flex-wrap"
                  style={{ borderBottom: i < rapportsAFaire.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {r.clientNom}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.siteNom} · intervention le {fmtDone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="date"
                      value={r.rapportDatePrevue}
                      onChange={(e) => updateDatePrevue(r.clientId, r.planId, r.samplingId, e.target.value)}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                    />
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: delaiBg, color: delaiColor }}>
                      {delaiLabel}
                    </span>
                    <button
                      onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}?sampling=${r.samplingId}`)}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium shrink-0"
                      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      Fiche
                    </button>
                    <button
                      onClick={() => markEnvoye(r.clientId, r.planId, r.samplingId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
                      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent)', (e.currentTarget.style.color = 'white'))}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent-light)', (e.currentTarget.style.color = 'var(--color-accent)'))}
                    >
                      Envoyé ✓
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section Envoyés */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Envoyés
          </h2>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            {rapportsEnvoyes.length}
          </span>
        </div>

        {rapportsEnvoyes.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-secondary)' }}>
            Aucun rapport envoyé pour le moment.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {rapportsEnvoyes.map((r, i) => {
              const fmtDone = r.doneDate
                ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const fmtEnvoye = r.rapportDatePrevue
                ? new Date(r.rapportDatePrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              return (
                <div key={r.samplingId}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < rapportsEnvoyes.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {r.clientNom}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.siteNom} · intervention le {fmtDone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Envoyé le {fmtEnvoye}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {resolveNom(r.doneBy)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2 : Build**

```bash
npm run build 2>&1 | tail -5
```

Si erreur sur `rapportsEnvoyes` non exposé : vérifier Task 4 Step 4.

- [ ] **Step 3 : Commit**

```bash
git add src/pages/RapportsPage.tsx
git commit -m "feat: page /rapports — À envoyer + Envoyés + filtre équipe"
```

---

## Task 7 : Ajouter la route et la navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/MobileDrawer.tsx`

- [ ] **Step 1 : Ajouter le lazy import dans App.tsx**

Dans `src/App.tsx`, après la ligne `const MaintenancePage = lazy(...)` :

```typescript
const RapportsPage      = lazy(() => import('@/pages/RapportsPage'))
```

- [ ] **Step 2 : Ajouter la route dans App.tsx**

Dans `src/App.tsx`, trouver la zone des routes protégées (après `<Route path="/maintenances/:id" ...>`), ajouter :

```tsx
<Route path="/rapports" element={<RapportsPage />} />
```

- [ ] **Step 3 : Ajouter l'entrée dans Sidebar.tsx**

Dans `src/components/layout/Sidebar.tsx`, ajouter `FileText` aux imports Lucide :

```typescript
import { LayoutDashboard, ClipboardList, CalendarDays, Wrench, Gauge, Hammer, Inbox, BookOpen, ShieldAlert, Pipette, HelpCircle, Bug, FileText } from 'lucide-react'
```

Puis dans le tableau `navItems`, après l'entrée `maintenances` :

```typescript
  { to: '/rapports',     icon: FileText,        label: 'Rapports'               },
```

- [ ] **Step 4 : Ajouter l'entrée dans MobileDrawer.tsx**

Dans `src/components/layout/MobileDrawer.tsx`, ajouter `FileText` aux imports Lucide, puis dans le tableau des nav items, après `maintenances` :

```typescript
  { to: '/rapports',   icon: FileText,        label: 'Rapports'                   },
```

- [ ] **Step 5 : Build final**

```bash
npm run build 2>&1 | tail -5
```

Attendu : `✓ built in ...ms`

- [ ] **Step 6 : Tests**

```bash
npm test -- --run 2>&1 | tail -8
```

Attendu : 64 tests passent (les 2 échecs `conformitePct` sont préexistants et sans rapport).

- [ ] **Step 7 : Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx src/components/layout/MobileDrawer.tsx
git commit -m "feat(nav): ajout onglet Rapports dans sidebar et mobile drawer"
```

---

## Task 8 : Deploy staging

- [ ] **Step 1 : Deploy**

```bash
bash deploy-dev.sh 2>&1 | tail -5
```

- [ ] **Step 2 : Vérifier sur staging**

URL : https://labocea-pmc-v2-dev.tomkerf.workers.dev/rapports

Checklist :
- [ ] L'onglet "Rapports" apparaît dans la sidebar et le drawer mobile
- [ ] Section "À envoyer" liste les prélèvements avec `rapportPrevu=true` et `rapportDate=''`
- [ ] Le filtre "Mes rapports / Toute l'équipe" fonctionne
- [ ] Modifier la date d'envoi prévue → sauvegarde et se reflète dans la liste
- [ ] Bouton "Envoyé ✓" → déplace le rapport en section "Envoyés"
- [ ] Widget dashboard : affiche "envoi prévu [date]" sur chaque ligne + lien "Voir tous les rapports →"
- [ ] Nouveau prélèvement avec `rapportPrevu` coché : `rapportDatePrevue` = doneDate+1 mois, `rapportDate` reste vide → apparaît dans "À envoyer"
