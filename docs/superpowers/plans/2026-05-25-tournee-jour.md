# Mode Tournée du Jour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un écran `/tournee` accessible depuis le Dashboard permettant à un technicien de gérer ses prélèvements du jour en un seul endroit, sans naviguer dans les fiches clients.

**Architecture:** Nouvelle route `/tournee` (page `TourneePage`) qui consomme les stores Zustand déjà hydratés par le Dashboard. Trois composants dédiés dans `src/components/tournee/`. Écriture Firestore via `saveClient` existant.

**Tech Stack:** React 18, TypeScript strict, Zustand, Vitest, Tailwind CSS, Lucide React, Framer Motion (modale)

---

## Fichiers créés / modifiés

| Fichier | Action |
|---------|--------|
| `src/pages/TourneePage.tsx` | Créer |
| `src/components/tournee/TourneeItem.tsx` | Créer |
| `src/components/tournee/SaisieRapideModal.tsx` | Créer |
| `src/components/tournee/TourneeFinEcran.tsx` | Créer |
| `src/pages/DashboardPage.tsx` | Modifier — bouton + import |
| `src/App.tsx` | Modifier — route `/tournee` |
| `src/components/tournee/__tests__/TourneeItem.test.tsx` | Créer |
| `src/components/tournee/__tests__/SaisieRapideModal.test.tsx` | Créer |
| `src/components/tournee/__tests__/TourneeFinEcran.test.tsx` | Créer |

---

## Task 1 : TourneeFinEcran

Composant le plus simple — aucune dépendance externe. On commence par lui pour valider le pattern de test.

**Files:**
- Create: `src/components/tournee/TourneeFinEcran.tsx`
- Create: `src/components/tournee/__tests__/TourneeFinEcran.test.tsx`

- [ ] **Step 1 : Créer le fichier de test**

```tsx
// src/components/tournee/__tests__/TourneeFinEcran.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TourneeFinEcran } from '../TourneeFinEcran'

const items = [
  { samplingId: 's1', clientNom: 'Plounerin', siteNom: 'Rivière Jaudy', status: 'done' as const, motif: '' },
  { samplingId: 's2', clientNom: 'Lannion',   siteNom: 'AEP',           status: 'non_effectue' as const, motif: 'Accès impossible' },
]

describe('TourneeFinEcran', () => {
  it('affiche le titre et le nombre de sites', () => {
    render(<TourneeFinEcran items={items} onRetour={vi.fn()} />)
    expect(screen.getByText('Tournée terminée !')).toBeTruthy()
    expect(screen.getByText(/2 prélèvements/)).toBeTruthy()
  })

  it('affiche chaque item avec son statut', () => {
    render(<TourneeFinEcran items={items} onRetour={vi.fn()} />)
    expect(screen.getByText('Plounerin — Rivière Jaudy')).toBeTruthy()
    expect(screen.getByText('Lannion — AEP')).toBeTruthy()
    expect(screen.getByText('Accès impossible')).toBeTruthy()
  })

  it('appelle onRetour au clic du bouton', () => {
    const onRetour = vi.fn()
    render(<TourneeFinEcran items={items} onRetour={onRetour} />)
    fireEvent.click(screen.getByRole('button', { name: /retour/i }))
    expect(onRetour).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2 : Lancer les tests — vérifier l'échec**

```bash
npx vitest run src/components/tournee/__tests__/TourneeFinEcran.test.tsx
```

Attendu : FAIL — module introuvable.

- [ ] **Step 3 : Créer le composant**

```tsx
// src/components/tournee/TourneeFinEcran.tsx
import { CheckCircle2, X } from 'lucide-react'

export interface TourneeFinItem {
  samplingId: string
  clientNom: string
  siteNom: string
  status: 'done' | 'non_effectue'
  motif: string
}

interface Props {
  items: TourneeFinItem[]
  onRetour: () => void
}

export function TourneeFinEcran({ items, onRetour }: Props) {
  const done = items.filter(i => i.status === 'done').length
  const nonFait = items.filter(i => i.status === 'non_effectue').length

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'var(--color-success-light)' }}>
        <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Tournée terminée !
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        {items.length} prélèvement{items.length > 1 ? 's' : ''} · {done} réalisé{done > 1 ? 's' : ''}{nonFait > 0 ? `, ${nonFait} non effectué${nonFait > 1 ? 's' : ''}` : ''}
      </p>

      <div className="w-full max-w-sm rounded-xl overflow-hidden mb-8"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
        {items.map((item, i) => (
          <div key={item.samplingId}
            className="flex items-start gap-3 px-4 py-3"
            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
            {item.status === 'done'
              ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
              : <X size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
            }
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.clientNom} — {item.siteNom}
              </p>
              {item.motif && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.motif}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onRetour}
        className="px-6 py-3 rounded-lg text-sm font-medium"
        style={{ background: 'var(--color-accent)', color: 'white' }}>
        Retour au dashboard
      </button>
    </div>
  )
}
```

- [ ] **Step 4 : Lancer les tests — vérifier le succès**

```bash
npx vitest run src/components/tournee/__tests__/TourneeFinEcran.test.tsx
```

Attendu : PASS 3/3.

- [ ] **Step 5 : Commit**

```bash
git add src/components/tournee/TourneeFinEcran.tsx src/components/tournee/__tests__/TourneeFinEcran.test.tsx
git commit -m "feat(tournee): TourneeFinEcran — écran de fin de tournée"
```

---

## Task 2 : TourneeItem

Composant de ligne avec boutons d'action. Pas de Firestore — les callbacks sont injectés par le parent.

**Files:**
- Create: `src/components/tournee/TourneeItem.tsx`
- Create: `src/components/tournee/__tests__/TourneeItem.test.tsx`

- [ ] **Step 1 : Créer le fichier de test**

```tsx
// src/components/tournee/__tests__/TourneeItem.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TourneeItem } from '../TourneeItem'
import type { TourneeItemData } from '../TourneeItem'

const baseItem: TourneeItemData = {
  samplingId: 's1',
  clientId: 'c1',
  planId: 'p1',
  clientNom: 'Plounerin',
  siteNom: 'Rivière Jaudy',
  planNom: 'Mensuel',
  time: '09:00',
  meteo: '',
  nature: 'Eau de rivière',
  lat: '',
  lng: '',
  status: 'todo',
  motif: '',
}

describe('TourneeItem — statut todo', () => {
  it('affiche le nom client et le site', () => {
    render(<TourneeItem item={baseItem} onAction={vi.fn()} />)
    expect(screen.getByText('Plounerin')).toBeTruthy()
    expect(screen.getByText(/Rivière Jaudy/)).toBeTruthy()
  })

  it('affiche les boutons Réalisé et Non effectué', () => {
    render(<TourneeItem item={baseItem} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /réalisé/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /non effectué/i })).toBeTruthy()
  })

  it('appelle onAction("done") au clic Réalisé', () => {
    const onAction = vi.fn()
    render(<TourneeItem item={baseItem} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /réalisé/i }))
    expect(onAction).toHaveBeenCalledWith('s1', 'done')
  })

  it('appelle onAction("non_effectue") au clic Non effectué', () => {
    const onAction = vi.fn()
    render(<TourneeItem item={baseItem} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /non effectué/i }))
    expect(onAction).toHaveBeenCalledWith('s1', 'non_effectue')
  })
})

describe('TourneeItem — statut done', () => {
  it('masque les boutons quand done', () => {
    render(<TourneeItem item={{ ...baseItem, status: 'done' }} onAction={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /réalisé/i })).toBeNull()
  })

  it('affiche icône météo si meteo pluie', () => {
    render(<TourneeItem item={{ ...baseItem, meteo: 'pluie' }} onAction={vi.fn()} />)
    expect(screen.getByTitle('Prélèvement temps de pluie')).toBeTruthy()
  })
})

describe('TourneeItem — GPS', () => {
  it('affiche le bouton GPS si lat/lng présents', () => {
    render(<TourneeItem item={{ ...baseItem, lat: '48.1', lng: '-3.2' }} onAction={vi.fn()} />)
    expect(screen.getByRole('link', { name: /gps/i })).toBeTruthy()
  })

  it('masque le bouton GPS si lat vide', () => {
    render(<TourneeItem item={baseItem} onAction={vi.fn()} />)
    expect(screen.queryByRole('link', { name: /gps/i })).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer les tests — vérifier l'échec**

```bash
npx vitest run src/components/tournee/__tests__/TourneeItem.test.tsx
```

Attendu : FAIL — module introuvable.

- [ ] **Step 3 : Créer le composant**

```tsx
// src/components/tournee/TourneeItem.tsx
import { CheckCircle2, X, MapPin } from 'lucide-react'

export interface TourneeItemData {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  planNom: string
  time: string
  meteo: string
  nature: string
  lat: string
  lng: string
  status: 'todo' | 'done' | 'non_effectue'
  motif: string
}

interface Props {
  item: TourneeItemData
  onAction: (samplingId: string, action: 'done' | 'non_effectue') => void
}

export function TourneeItem({ item, onAction }: Props) {
  const isDone = item.status === 'done'
  const isNonFait = item.status === 'non_effectue'
  const isTerminal = isDone || isNonFait

  const bg = isDone
    ? 'var(--color-success-light)'
    : isNonFait
    ? 'var(--color-warning-light)'
    : 'var(--color-bg-secondary)'

  const badgeLabel = isDone ? 'Réalisé' : isNonFait ? 'Non effectué' : 'À faire'
  const badgeBg    = isDone ? 'var(--color-success-light)' : isNonFait ? 'var(--color-warning-light)' : 'var(--color-bg-tertiary)'
  const badgeColor = isDone ? 'var(--color-success)' : isNonFait ? 'var(--color-warning)' : 'var(--color-text-secondary)'

  const hasGps = item.lat !== '' && item.lng !== ''
  const mapsUrl = `https://maps.apple.com/?q=${item.lat},${item.lng}`

  return (
    <div className="rounded-xl mb-3 overflow-hidden"
      style={{ background: bg, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* En-tête */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {item.time ? (
          <span className="text-xs font-semibold shrink-0 w-12 text-center px-1.5 py-1 rounded-lg"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            {item.time}
          </span>
        ) : (
          <span className="shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-accent)' }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
            {item.clientNom}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {item.siteNom} · {item.planNom}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.meteo === 'pluie' && (
            <span title="Prélèvement temps de pluie" className="text-base leading-none">🌧</span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: badgeBg, color: badgeColor }}>{badgeLabel}</span>
        </div>
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button
            aria-label="Réalisé"
            onClick={() => onAction(item.samplingId, 'done')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={15} />
            Réalisé
          </button>
          <button
            aria-label="Non effectué"
            onClick={() => onAction(item.samplingId, 'non_effectue')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <X size={15} />
            Non effectué
          </button>
          {hasGps && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GPS"
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              <MapPin size={15} />
              GPS
            </a>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4 : Lancer les tests — vérifier le succès**

```bash
npx vitest run src/components/tournee/__tests__/TourneeItem.test.tsx
```

Attendu : PASS 8/8.

- [ ] **Step 5 : Commit**

```bash
git add src/components/tournee/TourneeItem.tsx src/components/tournee/__tests__/TourneeItem.test.tsx
git commit -m "feat(tournee): TourneeItem — ligne de prélèvement avec actions"
```

---

## Task 3 : SaisieRapideModal

Modale bottom-sheet avec Framer Motion. Valide le statut + motif avant soumission.

**Files:**
- Create: `src/components/tournee/SaisieRapideModal.tsx`
- Create: `src/components/tournee/__tests__/SaisieRapideModal.test.tsx`

- [ ] **Step 1 : Créer le fichier de test**

```tsx
// src/components/tournee/__tests__/SaisieRapideModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaisieRapideModal } from '../SaisieRapideModal'
import type { SaisieRapideData } from '../SaisieRapideModal'

const baseProps = {
  clientNom: 'Plounerin',
  siteNom: 'Rivière Jaudy',
  nature: 'Eau de rivière',
  initialStatus: 'done' as const,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe('SaisieRapideModal', () => {
  it('affiche le nom client et site', () => {
    render(<SaisieRapideModal {...baseProps} />)
    expect(screen.getByText('Plounerin')).toBeTruthy()
    expect(screen.getByText(/Rivière Jaudy/)).toBeTruthy()
  })

  it('masque le champ nappe si nature !== Souterraine', () => {
    render(<SaisieRapideModal {...baseProps} nature="Eau de rivière" />)
    expect(screen.queryByLabelText(/nappe/i)).toBeNull()
  })

  it('affiche le champ nappe si nature === Souterraine', () => {
    render(<SaisieRapideModal {...baseProps} nature="Souterraine" />)
    expect(screen.getByLabelText(/nappe/i)).toBeTruthy()
  })

  it('requiert le motif si statut Non effectué', () => {
    render(<SaisieRapideModal {...baseProps} initialStatus="non_effectue" />)
    fireEvent.click(screen.getByRole('button', { name: /valider/i }))
    expect(screen.getByText(/motif obligatoire/i)).toBeTruthy()
    expect(baseProps.onConfirm).not.toHaveBeenCalled()
  })

  it('appelle onConfirm avec les bonnes données', () => {
    const onConfirm = vi.fn()
    render(<SaisieRapideModal {...baseProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /valider/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining<Partial<SaisieRapideData>>({
      status: 'done',
      motif: '',
    }))
  })

  it('appelle onClose au clic Annuler', () => {
    const onClose = vi.fn()
    render(<SaisieRapideModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2 : Lancer les tests — vérifier l'échec**

```bash
npx vitest run src/components/tournee/__tests__/SaisieRapideModal.test.tsx
```

Attendu : FAIL — module introuvable.

- [ ] **Step 3 : Créer le composant**

```tsx
// src/components/tournee/SaisieRapideModal.tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { NappeType } from '@/types'

export interface SaisieRapideData {
  status: 'done' | 'non_effectue'
  doneDate: string
  nappe: NappeType
  commentaire: string
  motif: string
}

interface Props {
  clientNom: string
  siteNom: string
  nature: string
  initialStatus: 'done' | 'non_effectue'
  onConfirm: (data: SaisieRapideData) => void
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export function SaisieRapideModal({ clientNom, siteNom, nature, initialStatus, onConfirm, onClose }: Props) {
  const [status, setStatus]           = useState<'done' | 'non_effectue'>(initialStatus)
  const [doneDate, setDoneDate]       = useState(todayISO())
  const [nappe, setNappe]             = useState<NappeType>('')
  const [commentaire, setCommentaire] = useState('')
  const [motif, setMotif]             = useState('')
  const [error, setError]             = useState('')

  const isSouterraine = nature === 'Souterraine'

  function handleConfirm() {
    if (status === 'non_effectue' && !motif.trim()) {
      setError('Motif obligatoire pour un prélèvement non effectué.')
      return
    }
    setError('')
    onConfirm({ status, doneDate, nappe, commentaire, motif: motif.trim() })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full rounded-t-2xl px-6 pt-5 pb-10"
          style={{ background: 'var(--color-bg-secondary)' }}
          onClick={e => e.stopPropagation()}>

          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--color-border)' }} />

          <p className="text-base font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{clientNom}</p>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>{siteNom}</p>

          {/* Statut */}
          <div className="flex gap-2 mb-4">
            {(['done', 'non_effectue'] as const).map(s => (
              <button key={s}
                onClick={() => setStatus(s)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: status === s ? (s === 'done' ? 'var(--color-success-light)' : 'var(--color-warning-light)') : 'var(--color-bg-tertiary)',
                  color: status === s ? (s === 'done' ? 'var(--color-success)' : 'var(--color-warning)') : 'var(--color-text-secondary)',
                }}>
                {s === 'done' ? 'Réalisé' : 'Non effectué'}
              </button>
            ))}
          </div>

          {/* Date */}
          <label className="block mb-3">
            <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Date réalisée</span>
            <input type="date" value={doneDate} onChange={e => setDoneDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} />
          </label>

          {/* Nappe — uniquement eau souterraine */}
          {isSouterraine && (
            <label className="block mb-3" aria-label="nappe">
              <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Nappe</span>
              <select value={nappe} onChange={e => setNappe(e.target.value as NappeType)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                <option value="">—</option>
                <option value="haute">Haute</option>
                <option value="basse">Basse</option>
              </select>
            </label>
          )}

          {/* Motif (requis si non_effectue) */}
          {status === 'non_effectue' && (
            <label className="block mb-3">
              <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Motif *</span>
              <input type="text" value={motif} onChange={e => setMotif(e.target.value)}
                placeholder="Accès impossible, conditions météo..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} />
            </label>
          )}

          {/* Commentaire */}
          <label className="block mb-4">
            <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Commentaire (optionnel)</span>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} />
          </label>

          {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} aria-label="Annuler"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              Annuler
            </button>
            <button onClick={handleConfirm} aria-label="Valider"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white' }}>
              Valider
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 4 : Lancer les tests — vérifier le succès**

```bash
npx vitest run src/components/tournee/__tests__/SaisieRapideModal.test.tsx
```

Attendu : PASS 6/6.

- [ ] **Step 5 : Commit**

```bash
git add src/components/tournee/SaisieRapideModal.tsx src/components/tournee/__tests__/SaisieRapideModal.test.tsx
git commit -m "feat(tournee): SaisieRapideModal — modale saisie rapide prélèvement"
```

---

## Task 4 : TourneePage

Orchestre l'état, les callbacks Firestore et l'affichage.

**Files:**
- Create: `src/pages/TourneePage.tsx`

- [ ] **Step 1 : Créer la page**

```tsx
// src/pages/TourneePage.tsx
import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useAuthStore, selectInitiales, selectUid, selectRole } from '@/stores/authStore'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { saveClient } from '@/services/clientService'
import { localISO } from '@/lib/dashboardUtils'
import type { Client, Plan, Sampling, NappeType } from '@/types'

import { TourneeItem } from '@/components/tournee/TourneeItem'
import type { TourneeItemData } from '@/components/tournee/TourneeItem'
import { SaisieRapideModal } from '@/components/tournee/SaisieRapideModal'
import type { SaisieRapideData } from '@/components/tournee/SaisieRapideModal'
import { TourneeFinEcran } from '@/components/tournee/TourneeFinEcran'
import type { TourneeFinItem } from '@/components/tournee/TourneeFinEcran'

type LocalStatus = 'todo' | 'done' | 'non_effectue'

interface ModalState {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  nature: string
  initialStatus: 'done' | 'non_effectue'
}

export default function TourneePage() {
  const navigate    = useNavigate()
  const initiales   = useAuthStore(selectInitiales)
  const uid         = useAuthStore(selectUid)
  const role        = useAuthStore(selectRole)
  const isGeneraliste = role === 'charge_mission' || role === 'admin'

  const { clients }       = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { evenements }    = useEvenementsStore()
  const { maintenances }  = useMaintenancesStore()

  const { jourItems } = useDashboardStats({
    clients, verifications, equipements, evenements, maintenances,
    uid, initiales, isGeneraliste,
  })

  // Construire TourneeItemData depuis jourItems (sampling uniquement)
  const tourneeItems = useMemo((): TourneeItemData[] => {
    return jourItems
      .filter(i => i.kind === 'sampling')
      .map(i => {
        const ev = i.modalEvent
        const client = clients.find((c: Client) => c.id === ev.clientId)
        const plan   = client?.plans.find((p: Plan) => p.id === ev.planId)
        const s      = plan?.samplings.find((sa: Sampling) => sa.id === ev.samplingId)
        return {
          samplingId: ev.samplingId ?? '',
          clientId:   ev.clientId  ?? '',
          planId:     ev.planId    ?? '',
          clientNom:  i.title,
          siteNom:    plan?.siteNom ?? '',
          planNom:    plan?.nom     ?? '',
          time:       i.time,
          meteo:      'meteo' in i ? (i.meteo as string) : '',
          nature:     plan?.nature  ?? '',
          lat:        plan?.lat     ?? '',
          lng:        plan?.lng     ?? '',
          status:     (s?.status === 'done' ? 'done' : s?.status === 'non_effectue' ? 'non_effectue' : 'todo') as LocalStatus,
          motif:      s?.motif ?? '',
        }
      })
  }, [jourItems, clients])

  const [localStatuses, setLocalStatuses] = useState<Map<string, LocalStatus>>(() => {
    const m = new Map<string, LocalStatus>()
    tourneeItems.forEach(i => m.set(i.samplingId, i.status))
    return m
  })

  const [modal, setModal] = useState<ModalState | null>(null)

  const allDone = tourneeItems.length > 0 && tourneeItems.every(i => {
    const s = localStatuses.get(i.samplingId) ?? i.status
    return s === 'done' || s === 'non_effectue'
  })

  const doneCount = tourneeItems.filter(i => {
    const s = localStatuses.get(i.samplingId) ?? i.status
    return s === 'done' || s === 'non_effectue'
  }).length

  function handleAction(samplingId: string, action: 'done' | 'non_effectue') {
    const item = tourneeItems.find(i => i.samplingId === samplingId)
    if (!item) return
    setModal({
      samplingId,
      clientId: item.clientId,
      planId:   item.planId,
      clientNom: item.clientNom,
      siteNom:  item.siteNom,
      nature:   item.nature,
      initialStatus: action,
    })
  }

  const handleConfirm = useCallback(async (data: SaisieRapideData) => {
    if (!modal || !uid) return
    const client = clients.find((c: Client) => c.id === modal.clientId)
    if (!client) return

    const d = new Date(data.doneDate + 'T12:00:00')
    const updatedClient: Client = {
      ...client,
      plans: client.plans.map((plan: Plan) => plan.id !== modal.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) => {
          if (s.id !== modal.samplingId) return s
          if (data.status === 'done') {
            return {
              ...s,
              status:   'done',
              doneDate: localISO(d),
              nappe:    data.nappe as NappeType,
              comment:  data.commentaire,
            }
          }
          return {
            ...s,
            status: 'non_effectue',
            motif:  data.motif,
          }
        }),
      }),
    }
    await saveClient(updatedClient, uid)
    setLocalStatuses(prev => new Map(prev).set(modal.samplingId, data.status))
    setModal(null)
  }, [modal, uid, clients])

  // Construire les items pour l'écran de fin
  const finItems: TourneeFinItem[] = tourneeItems.map(i => ({
    samplingId: i.samplingId,
    clientNom:  i.clientNom,
    siteNom:    i.siteNom,
    status:     (localStatuses.get(i.samplingId) ?? i.status) as 'done' | 'non_effectue',
    motif:      i.motif,
  }))

  const today = new Date()
  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (allDone) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <TourneeFinEcran items={finItems} onRetour={() => navigate('/')} />
      </div>
    )
  }

  return (
    <div className="p-6 pb-10 max-w-xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Tournée du jour</h1>
          <p className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
            {dateLabel} · {tourneeItems.length} site{tourneeItems.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{doneCount}/{tourneeItems.length} traité{doneCount > 1 ? 's' : ''}</span>
          <span>{Math.round((doneCount / Math.max(tourneeItems.length, 1)) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--color-border)' }}>
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${(doneCount / Math.max(tourneeItems.length, 1)) * 100}%`, background: 'var(--color-accent)' }} />
        </div>
      </div>

      {/* Liste */}
      {tourneeItems.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun prélèvement prévu aujourd'hui.
        </p>
      ) : (
        tourneeItems.map(item => (
          <TourneeItem
            key={item.samplingId}
            item={{ ...item, status: localStatuses.get(item.samplingId) ?? item.status }}
            onAction={handleAction}
          />
        ))
      )}

      {/* Modale */}
      {modal && (
        <SaisieRapideModal
          clientNom={modal.clientNom}
          siteNom={modal.siteNom}
          nature={modal.nature}
          initialStatus={modal.initialStatus}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Build TypeScript**

```bash
npx tsc -b --noEmit
```

Attendu : 0 erreur. Corriger toute erreur de type avant de continuer.

- [ ] **Step 3 : Commit**

```bash
git add src/pages/TourneePage.tsx
git commit -m "feat(tournee): TourneePage — page principale de la tournée"
```

---

## Task 5 : Route + bouton Dashboard

Brancher la route dans App.tsx et ajouter le bouton d'entrée dans DashboardPage.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1 : Ajouter la route dans App.tsx**

Dans `src/App.tsx`, après l'import de `PlanningPage` (ligne ~24), ajouter :

```tsx
const TourneePage = lazy(() => import('@/pages/TourneePage'))
```

Dans la section `<Routes>`, après la route `/planning`, ajouter :

```tsx
<Route path="/tournee" element={
  <Suspense fallback={null}><TourneePage /></Suspense>
} />
```

- [ ] **Step 2 : Ajouter le bouton dans DashboardPage**

Dans `src/pages/DashboardPage.tsx`, ajouter l'import :

```tsx
import { Route } from 'lucide-react'
```

Remplacer le bloc du titre "Planning du jour" (autour de la ligne 129) :

```tsx
{/* Avant */}
<SectionTitle>{planningMode === 'today' ? 'Planning du jour' : 'Planning de demain'}</SectionTitle>

{/* Après */}
<div className="flex items-center justify-between mb-3">
  <SectionTitle className="mb-0">{planningMode === 'today' ? 'Planning du jour' : 'Planning de demain'}</SectionTitle>
  {planningMode === 'today' && jourItems.filter(i => i.kind === 'sampling' && !i.modalEvent.isDone).length > 0 && (
    <button
      onClick={() => navigate('/tournee')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: 'var(--color-accent)', color: 'white' }}>
      <Route size={13} />
      Démarrer la tournée
    </button>
  )}
</div>
```

> Note : supprimer le `mb-3` existant sur le div wrapper du planning si nécessaire pour éviter le double espacement.

- [ ] **Step 3 : Build TypeScript**

```bash
npx tsc -b --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 4 : Run all tests**

```bash
npx vitest run
```

Attendu : tous les tests passent (nombre ≥ au précédent run).

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx src/pages/DashboardPage.tsx
git commit -m "feat(tournee): route /tournee + bouton Dashboard"
```

---

## Task 6 : Build production + staging

- [ ] **Step 1 : Build production**

```bash
npx tsc -b && npx vite build
```

Attendu : build sans erreur, taille bundle raisonnable.

- [ ] **Step 2 : Lancer tous les tests une dernière fois**

```bash
npx vitest run
```

Attendu : PASS sur tous les tests existants + les nouveaux.

- [ ] **Step 3 : Déployer staging**

```bash
bash deploy-dev.sh
```

- [ ] **Step 4 : Commit final si nécessaire**

```bash
git add -A
git commit -m "feat(tournee): mode tournée du jour — déploiement staging"
```
