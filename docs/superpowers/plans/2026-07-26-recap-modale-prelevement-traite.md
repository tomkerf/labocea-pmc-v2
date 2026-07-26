# Récap modale prélèvement traité — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quand on ouvre la modale de détail d'un prélèvement qui n'est plus `planned` à venir (réalisé, non effectué, ou en retard), remplacer les boutons d'action (Déplacer, Changer technicien, Assigner du matériel, Retirer) par un récapitulatif de ce qui s'est passé (commentaire, motif, checklist, photos, historique), en gardant le bouton "Ouvrir la mission".

**Architecture:** Un helper pur `findSamplingDetail()` retrouve le `Sampling` complet déjà chargé en mémoire (via `clients`, sans appel Firestore) à partir d'un `PlanningEvent`. Un nouveau composant `EventDetailRecapPanel` affiche ce détail. `EventDetailModal` bascule entre le bloc de boutons existant et ce récap selon `event.priority` (0=retard, 1=non_effectue, 3=réalisé → récap ; 2=planifié → boutons actuels inchangés). Les deux points d'appel de `EventDetailModal` (`PlanningModals.tsx`, `DashboardPage.tsx`) calculent `samplingDetail` avec `findSamplingDetail(clients, event)` et le passent en prop.

**Tech Stack:** React + TypeScript, Zustand (`useMissionsStore`), Vitest + Testing Library, Tailwind (classes utilitaires existantes du projet), lucide-react.

**Spec de référence :** `docs/superpowers/specs/2026-07-26-recap-modale-prelevement-traite-design.md`

---

## Task 1 : Helper `findSamplingDetail` dans `planningUtils.ts`

**Files:**
- Modify: `src/lib/planningUtils.ts:8` (import), `src/lib/planningUtils.ts:52-54` (nouveau type + fonction, avant `PoolItem`)
- Test: `src/lib/__tests__/planningUtils.test.ts`

- [ ] **Step 1: Écrire les tests (ils vont échouer, `findSamplingDetail` n'existe pas encore)**

Ajouter en fin de `src/lib/__tests__/planningUtils.test.ts` (après le dernier `describe`, garder les imports existants du fichier) :

```ts
// ── findSamplingDetail ────────────────────────────────────────────

import { findSamplingDetail, type PlanningEvent } from '../planningUtils'
import type { Client, Plan, Sampling } from '@/types'

function makeSampling(overrides: Partial<Sampling> = {}): Sampling {
  return {
    id: 'sampling-1',
    num: 1,
    plannedMonth: 3,
    plannedDay: 4,
    status: 'done',
    doneDate: '2026-07-23',
    comment: '',
    nappe: '',
    rapportPrevu: false,
    rapportDate: '',
    tente: false,
    reportHistory: [],
    doneBy: '',
    ...overrides,
  }
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    nom: 'Aven',
    siteNom: 'Aven',
    frequence: 'Mensuel',
    meteo: '',
    nature: 'Rivière',
    methode: 'Ponctuel',
    lat: '',
    lng: '',
    gpsApprox: false,
    customMonths: [],
    bimensuelMonths: [],
    defaultDay: 4,
    customDays: {},
    samplings: [],
    ...overrides,
  }
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    annee: '2026',
    nom: 'DREAL CORPEP',
    numClient: '',
    nouvelleDemande: 'Avenant',
    interlocuteur: '',
    telephone: '',
    mobile: '',
    email: '',
    fonction: '',
    mission: '',
    segment: 'SRA',
    numDevis: '',
    numConvention: '',
    preleveur: 'THK',
    dureeContrat: '',
    periodeIntervention: '',
    sites: [],
    montantTotal: 0,
    partPMC: 0,
    partSousTraitance: 0,
    plans: [],
    createdBy: '',
    ...overrides,
  } as Client
}

function makeEvent(overrides: Partial<PlanningEvent> = {}): PlanningEvent {
  return {
    id: 'evt-1',
    type: 'prelevement',
    title: 'DREAL CORPEP',
    subtitle: 'Aven',
    statusLabel: 'Réalisé',
    statusBg: '#EFF6FF',
    statusColor: '#0071E3',
    link: '/missions/client-1/plan/plan-1/sampling/sampling-1',
    isDone: true,
    priority: 3,
    technicien: 'THK',
    clientId: 'client-1',
    planId: 'plan-1',
    samplingId: 'sampling-1',
    ...overrides,
  }
}

describe('findSamplingDetail', () => {
  it('retourne undefined si event.clientId/planId/samplingId absents', () => {
    expect(findSamplingDetail([], makeEvent({ clientId: undefined }))).toBeUndefined()
  })

  it('retourne undefined si le client, le plan ou le sampling est introuvable', () => {
    const clients = [makeClient({ plans: [makePlan({ samplings: [makeSampling()] })] })]
    expect(findSamplingDetail(clients, makeEvent({ clientId: 'autre-client' }))).toBeUndefined()
  })

  it('retrouve le détail complet du sampling à partir du PlanningEvent', () => {
    const sampling = makeSampling({
      doneDate: '2026-07-23',
      comment: 'RAS',
      motif: undefined,
      checklist: [{ id: 'c1', label: 'Bouchon fermé', done: true }],
      photos: ['https://storage/photo1.jpg'],
      history: [{ at: '2026-07-23T10:00:00.000Z', by: 'uid1', byNom: 'Thomas', field: 'status', from: 'planned', to: 'done' }],
    })
    const clients = [makeClient({ plans: [makePlan({ samplings: [sampling] })] })]

    const detail = findSamplingDetail(clients, makeEvent())

    expect(detail).toEqual({
      doneDate: '2026-07-23',
      comment: 'RAS',
      motif: undefined,
      checklist: [{ id: 'c1', label: 'Bouchon fermé', done: true }],
      photos: ['https://storage/photo1.jpg'],
      history: [{ at: '2026-07-23T10:00:00.000Z', by: 'uid1', byNom: 'Thomas', field: 'status', from: 'planned', to: 'done' }],
    })
  })

  it('inclut le motif quand le prélèvement est non effectué', () => {
    const sampling = makeSampling({ status: 'non_effectue', doneDate: '', motif: 'Site inaccessible' })
    const clients = [makeClient({ plans: [makePlan({ samplings: [sampling] })] })]

    const detail = findSamplingDetail(clients, makeEvent({ priority: 1 }))

    expect(detail?.motif).toBe('Site inaccessible')
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run src/lib/__tests__/planningUtils.test.ts`
Expected: FAIL — `findSamplingDetail is not exported` (ou erreur de module introuvable)

- [ ] **Step 3: Implémenter `findSamplingDetail` et `SamplingDetail`**

Dans `src/lib/planningUtils.ts`, remplacer la ligne d'import (ligne 8) :

```ts
import type { Maintenance, EvenementPersonnel, TypeEvenement } from '@/types'
```

par :

```ts
import type { Maintenance, EvenementPersonnel, TypeEvenement, Client, ChecklistItem, SamplingHistoryEntry } from '@/types'
```

Puis, juste avant `export interface PoolItem {` (ligne 54), insérer :

```ts
export interface SamplingDetail {
  doneDate?: string
  comment?: string
  motif?: string
  checklist?: ChecklistItem[]
  photos?: string[]
  history?: SamplingHistoryEntry[]
}

/** Retrouve le Sampling source d'un PlanningEvent de type prélèvement, pour afficher son récap. */
export function findSamplingDetail(clients: Client[], event: PlanningEvent): SamplingDetail | undefined {
  if (!event.clientId || !event.planId || !event.samplingId) return undefined
  const client = clients.find(c => c.id === event.clientId)
  const plan = client?.plans.find(p => p.id === event.planId)
  const sampling = plan?.samplings.find(s => s.id === event.samplingId)
  if (!sampling) return undefined
  return {
    doneDate: sampling.doneDate || undefined,
    comment: sampling.comment || undefined,
    motif: sampling.motif,
    checklist: sampling.checklist,
    photos: sampling.photos,
    history: sampling.history,
  }
}

```

- [ ] **Step 4: Relancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/__tests__/planningUtils.test.ts`
Expected: PASS (tous les tests, y compris les 4 nouveaux `findSamplingDetail`)

- [ ] **Step 5: Commit**

```bash
git add src/lib/planningUtils.ts src/lib/__tests__/planningUtils.test.ts
git commit -m "feat(planning): ajoute findSamplingDetail pour récupérer le détail d'un Sampling depuis un PlanningEvent"
```

---

## Task 2 : Composant `EventDetailRecapPanel`

**Files:**
- Create: `src/components/planning/EventDetailRecapPanel.tsx`
- Test: `src/components/planning/__tests__/EventDetailRecapPanel.test.tsx`

- [ ] **Step 1: Écrire le test (il va échouer, le composant n'existe pas)**

Créer `src/components/planning/__tests__/EventDetailRecapPanel.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EventDetailRecapPanel from '../EventDetailRecapPanel'
import type { SamplingDetail } from '@/lib/planningUtils'

describe('EventDetailRecapPanel', () => {
  it('ne rend rien si detail est undefined', () => {
    const { container } = render(<EventDetailRecapPanel detail={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ne rend rien si detail ne contient aucune donnée exploitable', () => {
    const { container } = render(<EventDetailRecapPanel detail={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le commentaire et la date de réalisation', () => {
    const detail: SamplingDetail = { doneDate: '2026-07-23', comment: 'RAS, tout est ok' }
    render(<EventDetailRecapPanel detail={detail} />)
    expect(screen.getByText('RAS, tout est ok')).toBeInTheDocument()
    expect(screen.getByText(/23 juillet 2026/)).toBeInTheDocument()
  })

  it('affiche le motif quand présent', () => {
    render(<EventDetailRecapPanel detail={{ motif: 'Site inaccessible' }} />)
    expect(screen.getByText('Site inaccessible')).toBeInTheDocument()
  })

  it('affiche la checklist avec les items faits et non faits', () => {
    const detail: SamplingDetail = {
      checklist: [
        { id: 'c1', label: 'Bouchon fermé', done: true },
        { id: 'c2', label: 'Étiquette posée', done: false },
      ],
    }
    render(<EventDetailRecapPanel detail={detail} />)
    expect(screen.getByText('Bouchon fermé')).toBeInTheDocument()
    expect(screen.getByText('Étiquette posée')).toBeInTheDocument()
  })

  it('affiche les photos en vignettes cliquables', () => {
    const detail: SamplingDetail = { photos: ['https://storage/photo1.jpg', 'https://storage/photo2.jpg'] }
    render(<EventDetailRecapPanel detail={detail} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://storage/photo1.jpg')
  })

  it('affiche l\'historique des modifications', () => {
    const detail: SamplingDetail = {
      history: [{ at: '2026-07-23T10:00:00.000Z', by: 'uid1', byNom: 'Thomas', field: 'status', from: 'planned', to: 'done' }],
    }
    render(<EventDetailRecapPanel detail={detail} />)
    expect(screen.getByText(/Thomas/)).toBeInTheDocument()
    expect(screen.getByText(/status/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/components/planning/__tests__/EventDetailRecapPanel.test.tsx`
Expected: FAIL — `Cannot find module '../EventDetailRecapPanel'`

- [ ] **Step 3: Créer le composant**

Créer `src/components/planning/EventDetailRecapPanel.tsx` :

```tsx
import { Check, X as XIcon } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { SamplingDetail } from '@/lib/planningUtils'

export interface EventDetailRecapPanelProps {
  detail?: SamplingDetail
}

export default function EventDetailRecapPanel({ detail }: EventDetailRecapPanelProps) {
  if (!detail) return null
  const { doneDate, comment, motif, checklist, photos, history } = detail
  const hasContent = !!(doneDate || comment || motif || checklist?.length || photos?.length || history?.length)
  if (!hasContent) return null

  const dateLabel = doneDate
    ? new Date(doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {dateLabel && (
        <p className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>Réalisé le {dateLabel}</p>
      )}

      {motif && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.DANGER }}>Motif</p>
          <p className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{motif}</p>
        </div>
      )}

      {comment && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Commentaire</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.TEXT_PRIMARY }}>{comment}</p>
        </div>
      )}

      {!!checklist?.length && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Checklist</p>
          <ul className="flex flex-col gap-1">
            {checklist.map(item => (
              <li key={item.id} className="flex items-center gap-2 text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
                {item.done
                  ? <Check size={14} style={{ color: COLORS.SUCCESS }} />
                  : <XIcon size={14} style={{ color: COLORS.DANGER }} />}
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!photos?.length && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Photos</p>
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Photo ${i + 1}`} className="size-16 rounded-lg object-cover"
                  style={{ border: `1px solid ${COLORS.BORDER}` }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {!!history?.length && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Historique</p>
          <ul className="flex flex-col gap-1">
            {history.map((h, i) => (
              <li key={i} className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
                {new Date(h.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {h.byNom} : {h.field} « {h.from} » → « {h.to} »
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Relancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/components/planning/__tests__/EventDetailRecapPanel.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/planning/EventDetailRecapPanel.tsx src/components/planning/__tests__/EventDetailRecapPanel.test.tsx
git commit -m "feat(planning): ajoute EventDetailRecapPanel pour le récap d'un prélèvement traité"
```

---

## Task 3 : Brancher le récap dans `EventDetailModal.tsx`

**Files:**
- Modify: `src/components/planning/EventDetailModal.tsx`
- Test: `src/components/planning/__tests__/EventDetailModal.test.tsx`

- [ ] **Step 1: Écrire le test (il va échouer, `samplingDetail` n'existe pas encore comme prop et le récap n'est pas branché)**

Créer `src/components/planning/__tests__/EventDetailModal.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EventDetailModal, { type EventDetailModalProps } from '../EventDetailModal'
import type { PlanningEvent } from '@/lib/planningUtils'

function ev(overrides: Partial<PlanningEvent> = {}): PlanningEvent {
  return {
    id: 'evt-1',
    type: 'prelevement',
    title: 'DREAL CORPEP',
    subtitle: 'Aven',
    statusLabel: 'Réalisé',
    statusBg: '#EFF6FF',
    statusColor: '#0071E3',
    link: '/missions/client-1/plan/plan-1/sampling/sampling-1',
    isDone: true,
    priority: 3,
    technicien: 'THK',
    ...overrides,
  }
}

const noopAsync = async () => {}
const noop = () => {}

function renderModal(props: Partial<EventDetailModalProps> = {}) {
  const defaults: EventDetailModalProps = {
    event: ev(),
    dateStr: '2026-07-23',
    onClose: noop,
    onCancel: noopAsync,
    onMove: noopAsync,
    onDelete: noop,
    onChangeTech: noopAsync,
    onChangeEquipements: noopAsync,
    techOptions: [],
    ...props,
  }
  return render(<MemoryRouter><EventDetailModal {...defaults} /></MemoryRouter>)
}

describe('EventDetailModal — récap prélèvement traité', () => {
  it('affiche le récap et masque les boutons d\'action pour un prélèvement réalisé (priority=3)', () => {
    renderModal({ event: ev({ priority: 3, isDone: true }), samplingDetail: { comment: 'RAS' } })
    expect(screen.getByText('RAS')).toBeInTheDocument()
    expect(screen.queryByText('Déplacer à une autre date')).not.toBeInTheDocument()
    expect(screen.queryByText('Changer le technicien')).not.toBeInTheDocument()
    expect(screen.queryByText('Retirer du calendrier')).not.toBeInTheDocument()
  })

  it('affiche le récap pour un prélèvement en retard (priority=0)', () => {
    renderModal({ event: ev({ priority: 0, isDone: false }), samplingDetail: { motif: 'Site inaccessible' } })
    expect(screen.getByText('Site inaccessible')).toBeInTheDocument()
    expect(screen.queryByText('Changer le technicien')).not.toBeInTheDocument()
  })

  it('garde les boutons d\'action habituels pour un prélèvement planifié (priority=2)', () => {
    renderModal({ event: ev({ priority: 2, isDone: false }) })
    expect(screen.getByText('Déplacer à une autre date')).toBeInTheDocument()
    expect(screen.getByText('Changer le technicien')).toBeInTheDocument()
  })

  it('garde le bouton "Ouvrir la mission" même pour un prélèvement traité', () => {
    renderModal({ event: ev({ priority: 3, isDone: true }) })
    expect(screen.getByText('Voir la mission')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/components/planning/__tests__/EventDetailModal.test.tsx`
Expected: FAIL — la prop `samplingDetail` n'existe pas sur `EventDetailModalProps` (erreur TS) et les boutons restent affichés pour `priority=3`/`priority=0`

- [ ] **Step 3: Modifier `EventDetailModal.tsx`**

Ajouter l'import du nouveau composant et du type, en remplaçant :

```ts
import type { PlanningEvent, TechOption } from '@/lib/planningUtils'
```

par :

```ts
import type { PlanningEvent, TechOption, SamplingDetail } from '@/lib/planningUtils'
```

et en ajoutant, juste après `import EventDetailCancelPanel from './EventDetailCancelPanel'` :

```ts
import EventDetailRecapPanel from './EventDetailRecapPanel'
```

Ajouter la prop `samplingDetail` à l'interface (remplacer) :

```ts
export interface EventDetailModalProps {
  event: PlanningEvent
  dateStr: string
  assignedEqIdsForDate?: string[]
  onClose: () => void
```

par :

```ts
export interface EventDetailModalProps {
  event: PlanningEvent
  dateStr: string
  assignedEqIdsForDate?: string[]
  samplingDetail?: SamplingDetail
  onClose: () => void
```

Destructurer la nouvelle prop (remplacer) :

```ts
export default function EventDetailModal({
  event, dateStr, assignedEqIdsForDate = EMPTY_ITEMS, onClose, onCancel, onMove, onMoveEvenement, onDelete, onChangeTech, onChangeEquipements, techOptions,
}: EventDetailModalProps) {
```

par :

```ts
export default function EventDetailModal({
  event, dateStr, assignedEqIdsForDate = EMPTY_ITEMS, samplingDetail, onClose, onCancel, onMove, onMoveEvenement, onDelete, onChangeTech, onChangeEquipements, techOptions,
}: EventDetailModalProps) {
```

Ajouter le calcul `isTraite` (remplacer) :

```ts
  const isPrelev   = event.type === 'prelevement'
  const isEvt      = event.type === 'evenement'
  const isBilan24h = event.methode === 'Composite' || event.methode === 'Automatique'
```

par :

```ts
  const isPrelev   = event.type === 'prelevement'
  const isEvt      = event.type === 'evenement'
  const isBilan24h = event.methode === 'Composite' || event.methode === 'Automatique'
  // priority : 0=retard, 1=non_effectue, 2=planifié, 3=réalisé — le récap remplace les actions dès que ce n'est plus "planifié à venir"
  const isTraite   = isPrelev && event.priority !== 2
```

Insérer le récap juste après le bouton "Ouvrir la mission" (remplacer) :

```tsx
          {isPrelev && !event.isDone && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'moving' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isMoving ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Déplacer à une autre date
            </button>
          )}

          {isPrelev && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'changingTech' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingTech ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Changer le technicien
            </button>
          )}

          {isPrelev && isBilan24h && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'changingEquipements' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingEq ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }} />
              <div className="flex-1 overflow-hidden">
                <div>Assigner du matériel</div>
                {equipementsAssignes.length > 0 && (
                  <div className="text-xs font-normal truncate mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {equipements.flatMap(eq => equipementsAssignes.includes(eq.id) ? eq.nom : []).join(', ')}
                  </div>
                )}
              </div>
            </button>
          )}

          {isPrelev && !event.isDone && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'canceling' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.DANGER, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isCanceling ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Retirer du calendrier
            </button>
          )}
```

par :

```tsx
          {isPrelev && isTraite && (
            <EventDetailRecapPanel detail={samplingDetail} />
          )}

          {isPrelev && !isTraite && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'moving' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isMoving ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Déplacer à une autre date
            </button>
          )}

          {isPrelev && !isTraite && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'changingTech' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingTech ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Changer le technicien
            </button>
          )}

          {isPrelev && isBilan24h && !isTraite && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'changingEquipements' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingEq ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }} />
              <div className="flex-1 overflow-hidden">
                <div>Assigner du matériel</div>
                {equipementsAssignes.length > 0 && (
                  <div className="text-xs font-normal truncate mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {equipements.flatMap(eq => equipementsAssignes.includes(eq.id) ? eq.nom : []).join(', ')}
                  </div>
                )}
              </div>
            </button>
          )}

          {isPrelev && !isTraite && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'canceling' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.DANGER, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isCanceling ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Retirer du calendrier
            </button>
          )}
```

- [ ] **Step 4: Relancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components/planning/__tests__/EventDetailModal.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/planning/EventDetailModal.tsx src/components/planning/__tests__/EventDetailModal.test.tsx
git commit -m "feat(planning): EventDetailModal bascule vers le récap pour un prélèvement traité"
```

---

## Task 4 : Passer `samplingDetail` depuis les deux points d'appel

**Files:**
- Modify: `src/components/planning/PlanningModals.tsx:96-111`
- Modify: `src/pages/DashboardPage.tsx:402-409`

- [ ] **Step 1: Brancher `findSamplingDetail` dans `PlanningModals.tsx`**

Remplacer l'import :

```ts
import {
  type PlanningEvent, type TechOption,
} from '@/lib/planningUtils'
```

par :

```ts
import {
  type PlanningEvent, type TechOption, findSamplingDetail,
} from '@/lib/planningUtils'
```

Remplacer le rendu de la modale :

```tsx
      {eventDetail && (
        <EventDetailModal
          key={eventDetail.event.id}
          event={eventDetail.event}
          dateStr={eventDetail.dateStr}
          assignedEqIdsForDate={assignedEqIdsForDate}
          onClose={() => setEventDetail(null)}
```

par :

```tsx
      {eventDetail && (
        <EventDetailModal
          key={eventDetail.event.id}
          event={eventDetail.event}
          dateStr={eventDetail.dateStr}
          assignedEqIdsForDate={assignedEqIdsForDate}
          samplingDetail={findSamplingDetail(clients, eventDetail.event)}
          onClose={() => setEventDetail(null)}
```

Cette modification est valide : `clients` est déjà une prop de `PlanningModalsProps` (utilisée pour `BilanMoisModal`).

- [ ] **Step 2: Brancher `findSamplingDetail` dans `DashboardPage.tsx`**

Repérer l'import de `planningUtils` en haut de `src/pages/DashboardPage.tsx` (adapter selon ce qui existe déjà — s'il importe déjà des éléments de `@/lib/planningUtils`, y ajouter `findSamplingDetail` ; sinon ajouter une ligne d'import dédiée à côté des autres imports de `@/lib`) :

```ts
import { findSamplingDetail } from '@/lib/planningUtils'
```

Remplacer :

```tsx
      {eventDetail && (
        <EventDetailModal
          event={eventDetail?.event || null}
          dateStr={eventDetail?.dateStr || ''}
          onClose={() => dispatch({ type: 'SET_EVENT_DETAIL', payload: null })}
```

par :

```tsx
      {eventDetail && (
        <EventDetailModal
          event={eventDetail?.event || null}
          dateStr={eventDetail?.dateStr || ''}
          samplingDetail={eventDetail?.event ? findSamplingDetail(clients, eventDetail.event) : undefined}
          onClose={() => dispatch({ type: 'SET_EVENT_DETAIL', payload: null })}
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `npm run build`
Expected: build réussi, aucune erreur TS (en particulier sur les props de `EventDetailModal` dans les deux fichiers modifiés)

- [ ] **Step 4: Lancer toute la suite de tests unitaires**

Run: `npm run test`
Expected: tous les tests passent, y compris les nouveaux (`findSamplingDetail`, `EventDetailRecapPanel`, `EventDetailModal`)

- [ ] **Step 5: Commit**

```bash
git add src/components/planning/PlanningModals.tsx src/pages/DashboardPage.tsx
git commit -m "feat(planning): passe samplingDetail à EventDetailModal depuis PlanningModals et DashboardPage"
```

---

## Task 5 : Vérification finale, revue et déploiement staging

**Files:** aucun fichier supplémentaire — vérification et déploiement uniquement.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 erreur

- [ ] **Step 2: Build complet**

Run: `npm run build`
Expected: build réussi

- [ ] **Step 3: Suite de tests complète**

Run: `npm run test`
Expected: tous les tests passent (existants + nouveaux)

- [ ] **Step 4: Revue de code**

Invoquer la skill `/code-review` sur les fichiers modifiés (`src/lib/planningUtils.ts`, `src/components/planning/EventDetailRecapPanel.tsx`, `src/components/planning/EventDetailModal.tsx`, `src/components/planning/PlanningModals.tsx`, `src/pages/DashboardPage.tsx` et leurs tests) avant tout déploiement, conformément à la convention du projet (CLAUDE.md).

- [ ] **Step 5: Vérification visuelle sur staging**

Déployer :

```bash
bash deploy-dev.sh
```

Puis, dans le navigateur, ouvrir le planning sur staging et vérifier :
- Un prélèvement `done` (Réalisé) affiche le récap (commentaire/checklist/photos si présents) et plus les 4 boutons d'action, mais garde "Voir la mission".
- Un prélèvement `non_effectue` affiche le motif.
- Un prélèvement en retard (`overdue`) affiche aussi le récap (peut être vide si aucune donnée renseignée — dans ce cas seul "Ouvrir la mission" reste visible).
- Un prélèvement `planned` non en retard garde tous les boutons d'action comme avant.
- Cas du bilan 24h : cliquer sur le J2 d'un bilan déjà réalisé affiche bien le récap (et non plus les actions).

- [ ] **Step 6: Commit final si des ajustements ont eu lieu pendant la vérification visuelle**

```bash
git add -A
git commit -m "fix(planning): ajustements suite à la vérification visuelle du récap prélèvement traité"
```

(Ne committer que s'il y a effectivement eu des changements après la Step 5 — sinon, sauter cette étape.)
