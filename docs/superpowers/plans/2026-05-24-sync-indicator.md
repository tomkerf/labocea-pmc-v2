# Sync Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher un badge nuage discret (synced/syncing/offline) dans la TopBar mobile et la Sidebar desktop, reflétant l'état réel des écritures Firestore et de la connexion réseau.

**Architecture:** Un store Zustand `syncStore` centralise `pendingWrites` et `isOnline`. Un helper `trackWrite()` wrappe chaque écriture Firestore pour incrémenter/décrémenter le compteur. Un hook `useNetworkStatus()` écoute les événements `online`/`offline` du navigateur. Le composant `SyncBadge` lit le store et affiche l'icône appropriée.

**Tech Stack:** React 19, TypeScript strict, Zustand, Lucide React, Vitest + @testing-library/react

---

## File Map

| Fichier | Action |
|---------|--------|
| `src/stores/syncStore.ts` | Créer |
| `src/lib/trackWrite.ts` | Créer |
| `src/hooks/useNetworkStatus.ts` | Créer |
| `src/components/ui/SyncBadge.tsx` | Créer |
| `src/stores/__tests__/syncStore.test.ts` | Créer |
| `src/lib/__tests__/trackWrite.test.ts` | Créer |
| `src/services/clientService.ts` | Modifier |
| `src/services/equipementService.ts` | Modifier |
| `src/services/verificationService.ts` | Modifier |
| `src/services/maintenanceService.ts` | Modifier |
| `src/services/evenementService.ts` | Modifier |
| `src/services/userService.ts` | Modifier |
| `src/components/layout/AppLayout.tsx` | Modifier |
| `src/components/layout/Sidebar.tsx` | Modifier |

---

## Task 1 : Store Zustand `syncStore`

**Files:**
- Create: `src/stores/syncStore.ts`
- Create: `src/stores/__tests__/syncStore.test.ts`

- [ ] **Écrire le store**

```ts
// src/stores/syncStore.ts
import { create } from 'zustand'

interface SyncState {
  pendingWrites: number
  isOnline: boolean
  increment: () => void
  decrement: () => void
  setOnline: (v: boolean) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingWrites: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  increment: () => set((s) => ({ pendingWrites: s.pendingWrites + 1 })),
  decrement: () => set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) })),
  setOnline: (v) => set({ isOnline: v }),
}))

export type SyncStatus = 'synced' | 'syncing' | 'offline'

export function getSyncStatus(state: Pick<SyncState, 'isOnline' | 'pendingWrites'>): SyncStatus {
  if (!state.isOnline) return 'offline'
  if (state.pendingWrites > 0) return 'syncing'
  return 'synced'
}
```

- [ ] **Écrire les tests**

```ts
// src/stores/__tests__/syncStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSyncStore, getSyncStatus } from '@/stores/syncStore'

beforeEach(() => {
  useSyncStore.setState({ pendingWrites: 0, isOnline: true })
})

describe('useSyncStore', () => {
  it('increment augmente pendingWrites', () => {
    useSyncStore.getState().increment()
    expect(useSyncStore.getState().pendingWrites).toBe(1)
  })

  it('decrement diminue pendingWrites', () => {
    useSyncStore.setState({ pendingWrites: 2 })
    useSyncStore.getState().decrement()
    expect(useSyncStore.getState().pendingWrites).toBe(1)
  })

  it('decrement ne passe pas en négatif', () => {
    useSyncStore.getState().decrement()
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })

  it('setOnline met à jour isOnline', () => {
    useSyncStore.getState().setOnline(false)
    expect(useSyncStore.getState().isOnline).toBe(false)
  })
})

describe('getSyncStatus', () => {
  it('retourne offline si !isOnline', () => {
    expect(getSyncStatus({ isOnline: false, pendingWrites: 0 })).toBe('offline')
  })

  it('retourne offline même avec pendingWrites > 0', () => {
    expect(getSyncStatus({ isOnline: false, pendingWrites: 3 })).toBe('offline')
  })

  it('retourne syncing si online et pendingWrites > 0', () => {
    expect(getSyncStatus({ isOnline: true, pendingWrites: 1 })).toBe('syncing')
  })

  it('retourne synced si online et pendingWrites = 0', () => {
    expect(getSyncStatus({ isOnline: true, pendingWrites: 0 })).toBe('synced')
  })
})
```

- [ ] **Lancer les tests**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && npx vitest run src/stores/__tests__/syncStore.test.ts
```

Résultat attendu : `8 passed`

- [ ] **Commit**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && git add src/stores/syncStore.ts src/stores/__tests__/syncStore.test.ts && git commit -m "feat(sync): syncStore Zustand + getSyncStatus"
```

---

## Task 2 : Helper `trackWrite`

**Files:**
- Create: `src/lib/trackWrite.ts`
- Create: `src/lib/__tests__/trackWrite.test.ts`

- [ ] **Écrire le helper**

```ts
// src/lib/trackWrite.ts
import { useSyncStore } from '@/stores/syncStore'

export function trackWrite<T>(promise: Promise<T>): Promise<T> {
  useSyncStore.getState().increment()
  return promise.finally(() => {
    useSyncStore.getState().decrement()
  })
}
```

- [ ] **Écrire les tests**

```ts
// src/lib/__tests__/trackWrite.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { trackWrite } from '@/lib/trackWrite'
import { useSyncStore } from '@/stores/syncStore'

beforeEach(() => {
  useSyncStore.setState({ pendingWrites: 0, isOnline: true })
})

describe('trackWrite', () => {
  it('incrémente pendant le fetch puis décrémente à la résolution', async () => {
    let resolveFn!: () => void
    const promise = new Promise<void>((resolve) => { resolveFn = resolve })

    const tracked = trackWrite(promise)
    expect(useSyncStore.getState().pendingWrites).toBe(1)

    resolveFn()
    await tracked
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })

  it('décrémente même si la promise rejette', async () => {
    const failing = Promise.reject(new Error('firestore error'))
    await trackWrite(failing).catch(() => {})
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })

  it('retourne la valeur résolue de la promise', async () => {
    const result = await trackWrite(Promise.resolve('ok'))
    expect(result).toBe('ok')
  })

  it('gère plusieurs writes en parallèle', async () => {
    let r1!: () => void, r2!: () => void
    const p1 = new Promise<void>((r) => { r1 = r })
    const p2 = new Promise<void>((r) => { r2 = r })

    trackWrite(p1)
    trackWrite(p2)
    expect(useSyncStore.getState().pendingWrites).toBe(2)

    r1()
    await p1
    expect(useSyncStore.getState().pendingWrites).toBe(1)

    r2()
    await p2
    expect(useSyncStore.getState().pendingWrites).toBe(0)
  })
})
```

- [ ] **Lancer les tests**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && npx vitest run src/lib/__tests__/trackWrite.test.ts
```

Résultat attendu : `4 passed`

- [ ] **Commit**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && git add src/lib/trackWrite.ts src/lib/__tests__/trackWrite.test.ts && git commit -m "feat(sync): helper trackWrite — wrap Promise Firestore"
```

---

## Task 3 : Hook `useNetworkStatus`

**Files:**
- Create: `src/hooks/useNetworkStatus.ts`

- [ ] **Écrire le hook**

```ts
// src/hooks/useNetworkStatus.ts
import { useEffect } from 'react'
import { useSyncStore } from '@/stores/syncStore'

export function useNetworkStatus(): void {
  useEffect(() => {
    const store = useSyncStore.getState()
    store.setOnline(navigator.onLine)

    const onOnline  = () => useSyncStore.getState().setOnline(true)
    const onOffline = () => useSyncStore.getState().setOnline(false)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])
}
```

- [ ] **Vérifier TypeScript**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Commit**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && git add src/hooks/useNetworkStatus.ts && git commit -m "feat(sync): hook useNetworkStatus"
```

---

## Task 4 : Composant `SyncBadge`

**Files:**
- Create: `src/components/ui/SyncBadge.tsx`

- [ ] **Écrire le composant**

```tsx
// src/components/ui/SyncBadge.tsx
import { Cloud, CloudOff, CloudUpload } from 'lucide-react'
import { useSyncStore, getSyncStatus } from '@/stores/syncStore'

interface SyncBadgeProps {
  className?: string
}

export default function SyncBadge({ className = '' }: SyncBadgeProps) {
  const pendingWrites = useSyncStore((s) => s.pendingWrites)
  const isOnline      = useSyncStore((s) => s.isOnline)
  const status        = getSyncStatus({ isOnline, pendingWrites })

  const tooltips = {
    synced:  'Données synchronisées',
    syncing: 'Synchronisation en cours...',
    offline: 'Hors connexion — modifications sauvegardées localement',
  }

  return (
    <span
      title={tooltips[status]}
      aria-label={tooltips[status]}
      className={`flex items-center justify-center ${className}`}
    >
      {status === 'synced' && (
        <span className="relative flex items-center">
          <Cloud size={16} strokeWidth={1.5} style={{ color: 'var(--color-success)' }} />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-success)' }}
          >
            <svg width="5" height="5" viewBox="0 0 5 5" fill="none">
              <path d="M1 2.5L2 3.5L4 1.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </span>
      )}
      {status === 'syncing' && (
        <CloudUpload
          size={16}
          strokeWidth={1.5}
          className="animate-pulse"
          style={{ color: 'var(--color-text-tertiary)' }}
        />
      )}
      {status === 'offline' && (
        <CloudOff
          size={16}
          strokeWidth={1.5}
          style={{ color: 'var(--color-text-tertiary)' }}
        />
      )}
    </span>
  )
}
```

- [ ] **Vérifier TypeScript + build**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && npm run build
```

Résultat attendu : build propre, 0 erreur.

- [ ] **Commit**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && git add src/components/ui/SyncBadge.tsx && git commit -m "feat(sync): composant SyncBadge (synced/syncing/offline)"
```

---

## Task 5 : Wrapper `trackWrite` dans les 6 services

**Files:**
- Modify: `src/services/clientService.ts`
- Modify: `src/services/equipementService.ts`
- Modify: `src/services/verificationService.ts`
- Modify: `src/services/maintenanceService.ts`
- Modify: `src/services/evenementService.ts`
- Modify: `src/services/userService.ts`

- [ ] **Modifier `clientService.ts`**

Remplacer le contenu entier par :

```ts
import {
  collection, doc,
  addDoc, deleteDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { Client } from '@/types'

const COLLECTION = 'clients-v2'

export async function saveClient(client: Client, uid: string): Promise<void> {
  const ref = doc(db, COLLECTION, client.id)
  await trackWrite(runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Le document client a été supprimé — modifications perdues.')
    tx.set(ref, { ...client, updatedBy: uid, updatedAt: serverTimestamp() }, { merge: true })
  }))
}

export async function deleteClient(clientId: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, COLLECTION, clientId)))
}

export async function createClient(
  partial: Omit<Client, 'id' | 'createdBy' | 'updatedBy' | 'updatedAt' | 'plans'>,
  uid: string,
): Promise<string> {
  const ref = await trackWrite(addDoc(collection(db, COLLECTION), {
    ...partial,
    plans: [],
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return ref.id
}
```

- [ ] **Modifier `equipementService.ts`**

Remplacer le contenu entier par :

```ts
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { Equipement } from '@/types'

export async function saveEquipement(equipement: Equipement, uid: string): Promise<void> {
  const ref = doc(db, 'equipements', equipement.id)
  await trackWrite(setDoc(ref, { ...equipement, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }))
}

export async function createEquipement(uid: string): Promise<string> {
  const now = new Date().toISOString().split('T')[0]
  const ref = await trackWrite(addDoc(collection(db, 'equipements'), {
    nom: '',
    marque: '',
    modele: '',
    numSerie: '',
    categorie: 'autre',
    dateAcquisition: now,
    etat: 'operationnel',
    localisation: 'labo',
    notes: '',
    prochainEtalonnage: '',
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return ref.id
}
```

- [ ] **Modifier `verificationService.ts`**

Remplacer le contenu entier par :

```ts
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { Verification } from '@/types'

export async function saveVerification(verification: Verification, uid: string): Promise<void> {
  const ref = doc(db, 'verifications', verification.id)
  await trackWrite(setDoc(ref, { ...verification, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }))
}

export async function createVerification(uid: string, technicienNom: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const ref = await trackWrite(addDoc(collection(db, 'verifications'), {
    equipementId: '',
    equipementNom: '',
    type: 'etalonnage_interne',
    date: today,
    resultat: 'conforme',
    remarques: '',
    prochainControle: '',
    technicienUid: uid,
    technicienNom,
    documentUrl: '',
    createdAt: serverTimestamp(),
  }))
  return ref.id
}
```

- [ ] **Modifier `maintenanceService.ts`**

Remplacer le contenu entier par :

```ts
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { Maintenance } from '@/types'

export async function saveMaintenance(maintenance: Maintenance, uid: string): Promise<void> {
  const ref = doc(db, 'maintenances', maintenance.id)
  await trackWrite(setDoc(ref, { ...maintenance, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }))
}

export async function createMaintenance(uid: string, technicienNom: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const ref = await trackWrite(addDoc(collection(db, 'maintenances'), {
    equipementId: '',
    equipementNom: '',
    type: 'preventive',
    statut: 'planifiee',
    datePrevue: today,
    dateRealisee: null,
    dureeHeures: null,
    description: '',
    travauxRealises: '',
    piecesRemplacees: '',
    technicienUid: uid,
    technicienNom,
    cout: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return ref.id
}
```

- [ ] **Modifier `evenementService.ts`**

Remplacer le contenu entier par :

```ts
import { collection, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { TypeEvenement } from '@/types'

export async function createEvenement(
  titre: string,
  date: string,
  type: TypeEvenement,
  heure: string,
  notes: string,
  uid: string,
  initiales?: string,
  dateFin?: string,
): Promise<string> {
  const ref = await trackWrite(addDoc(collection(db, 'evenements'), {
    titre,
    date,
    type,
    dateFin: dateFin || null,
    heure: heure || null,
    notes: notes || null,
    createdBy: uid,
    createdByInitiales: initiales || null,
    createdAt: serverTimestamp(),
  }))
  return ref.id
}

export async function deleteEvenement(id: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, 'evenements', id)))
}
```

- [ ] **Modifier `userService.ts`**

Remplacer le contenu entier par :

```ts
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'

export interface NewUserData {
  uid:        string
  prenom:     string
  nom:        string
  initiales:  string
  email:      string
  role:       string
  avatarColor: string
}

export async function createUserDocument(uid: string, data: NewUserData, dbInstance: Firestore = db): Promise<void> {
  await trackWrite(setDoc(doc(dbInstance, 'users', uid), {
    ...data,
    createdAt:   Timestamp.now(),
    lastLoginAt: Timestamp.now(),
  }))
}

export async function updateUserProfile(uid: string, fields: Record<string, unknown>): Promise<void> {
  await trackWrite(setDoc(doc(db, 'users', uid), fields, { merge: true }))
}
```

- [ ] **Build + tous les tests**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && npm run build && npx vitest run
```

Résultat attendu : build propre, tous les tests passent (90+).

- [ ] **Commit**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && git add src/services/ && git commit -m "feat(sync): wrapper trackWrite sur les 6 services Firestore"
```

---

## Task 6 : Intégration dans AppLayout et Sidebar

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Modifier `AppLayout.tsx` — ajouter useNetworkStatus et SyncBadge**

Ajouter ces imports en haut du fichier (après les imports existants) :

```ts
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import SyncBadge from '@/components/ui/SyncBadge'
```

Dans le corps du composant `AppLayout`, après la ligne `const [drawerOpen, setDrawerOpen] = useState(false)`, ajouter :

```ts
  useNetworkStatus()
```

Dans le JSX de la TopBar, remplacer le bloc du burger (le `<button className="md:hidden p-2...">`) par :

```tsx
          {/* Sync badge + Burger — mobile */}
          <div className="md:hidden flex items-center gap-2">
            <SyncBadge />
            <button
              className="p-2 rounded-xl"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              onClick={() => setDrawerOpen(true)}
              aria-label="Menu"
            >
              <Menu size={18} strokeWidth={2} />
            </button>
          </div>
```

- [ ] **Modifier `Sidebar.tsx` — ajouter SyncBadge au-dessus du bouton bug**

Ajouter l'import en haut du fichier :

```ts
import SyncBadge from '@/components/ui/SyncBadge'
```

Remplacer le bloc `{/* Bouton signalement bug */}` (lignes 99-110) par :

```tsx
      {/* Sync badge + Bouton signalement bug */}
      <div className="px-3 pb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <SyncBadge />
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {/* label rendu par le tooltip natif */}
          </span>
        </div>
        <button
          onClick={() => setBugOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
          <Bug size={14} strokeWidth={1.8} />
          Signaler un problème
        </button>
      </div>

      {bugOpen && <BugReportModal onClose={() => setBugOpen(false)} />}
```

- [ ] **Build + tous les tests**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && npm run build && npx vitest run
```

Résultat attendu : build propre, tous les tests passent.

- [ ] **Commit**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && git add src/components/layout/AppLayout.tsx src/components/layout/Sidebar.tsx && git commit -m "feat(sync): intégration SyncBadge dans TopBar mobile et Sidebar desktop"
```

---

## Task 7 : Déploiement staging

- [ ] **Déployer**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2 && bash deploy-dev.sh
```

- [ ] **Valider manuellement sur staging**

1. Ouvrir `https://labocea-pmc-v2-dev.tomkerf.workers.dev`
2. Vérifier le badge nuage vert (synced) dans la sidebar desktop et la topbar mobile
3. Saisir une modification dans une fiche client → le badge doit passer brièvement en syncing (gris animé) puis revenir vert
4. Dans DevTools → Network → passer en Offline → badge doit passer en CloudOff gris
5. Revenir Online → badge repasse en vert

- [ ] **Clôturer la session via `fin-session`**
