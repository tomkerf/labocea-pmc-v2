# Visites Préliminaires — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre la saisie et l'export de visites préliminaires de sites, liées à un Client ou une Demande.

**Architecture:** Nouvelle collection Firestore `visites/{id}` standalone, requêtée par `linkedTo.id`. Une seule page `VisiteFormPage` gère création et édition. L'export génère une page HTML imprimable via `window.open()` + `document.write()`.

**Tech Stack:** React + TypeScript, Firebase Firestore/Storage, Zustand, Tailwind CSS, Framer Motion, Lucide React, Vitest.

---

## Fichiers créés / modifiés

| Fichier | Action |
|---------|--------|
| `src/types/index.ts` | Modifier — ajouter `VisitePreliminaire`, `PointVisite` |
| `firestore.rules` | Modifier — ajouter règles `visites` |
| `storage.rules` | Modifier — ajouter règles `visites/{visiteId}` |
| `src/lib/uploadPhoto.ts` | Modifier — ajouter `uploadVisitePhoto`, `deleteVisitePhoto` |
| `src/services/visiteService.ts` | Créer |
| `src/hooks/useVisites.ts` | Créer |
| `src/lib/generateVisiteHTML.ts` | Créer |
| `src/pages/VisiteFormPage.tsx` | Créer |
| `src/components/client/ClientVisites.tsx` | Créer |
| `src/pages/ClientPage.tsx` | Modifier — ajouter `<ClientVisites>` |
| `src/pages/DemandesPage.tsx` | Modifier — ajouter section visites dans `DemandeModal` |
| `src/App.tsx` | Modifier — ajouter routes `/visites/*` |

---

## Task 1 — Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1 : Ajouter les types à la fin de `src/types/index.ts`**

```typescript
// --- Visites préliminaires ---

export type FaisabiliteVisite = 'ok' | 'difficile' | 'impossible'

export interface PointVisite {
  id: string
  nom: string
  typeEau: NatureEauType
  methode: MethodeType
  faisabilite: FaisabiliteVisite
  securite: string
  notes: string
  photos: string[]
}

export interface VisitePreliminaire {
  id: string
  linkedTo: {
    type: 'client' | 'demande'
    id: string
    nom: string
  }
  date: string           // ISO "YYYY-MM-DD"
  technicienUid: string
  technicienNom: string
  notes: string
  points: PointVisite[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2
npx tsc --noEmit 2>&1 | head -20
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/types/index.ts
git commit -m "feat: types VisitePreliminaire et PointVisite"
```

---

## Task 2 — Règles Firestore et Storage

**Files:**
- Modify: `firestore.rules`
- Modify: `storage.rules`

- [ ] **Step 1 : Ajouter la règle `visites` dans `firestore.rules`**

Après le bloc `// ── bugs` et avant la ligne `// ── clients (V1`, insérer :

```
    // ── visites préliminaires ──────────────────────────────────
    // Création/lecture : tout utilisateur authentifié.
    // Modification/suppression : technicien créateur ou admin.
    match /visites/{visiteId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAuthenticated() &&
        (request.auth.uid == resource.data.technicienUid || isAdmin());
    }
```

- [ ] **Step 2 : Ajouter la règle Storage dans `storage.rules`**

Après le bloc `samplings`, ajouter :

```
    // Photos de visites préliminaires
    // Chemin : visites/{visiteId}/{pointId}/{filename}
    match /visites/{visiteId}/{pointId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
```

- [ ] **Step 3 : Déployer les règles**

```bash
cd /Users/thomaskerfendal/Documents/dev/app-pmc-v2
npx firebase deploy --only firestore:rules,storage
```

Expected : `Deploy complete!`

- [ ] **Step 4 : Commit**

```bash
git add firestore.rules storage.rules
git commit -m "security: règles Firestore et Storage pour visites préliminaires"
```

---

## Task 3 — Upload photos visites

**Files:**
- Modify: `src/lib/uploadPhoto.ts`

- [ ] **Step 1 : Ajouter `uploadVisitePhoto` et `deleteVisitePhoto` à la fin du fichier**

```typescript
/**
 * Upload une photo de visite préliminaire dans Firebase Storage.
 * Chemin : visites/{visiteId}/{pointId}/{timestamp}.{ext}
 */
export async function uploadVisitePhoto(
  file: File,
  visiteId: string,
  pointId: string,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `visites/${visiteId}/${pointId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}

/**
 * Supprime une photo de visite depuis son URL.
 */
export async function deleteVisitePhoto(url: string): Promise<void> {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/)
    if (!match) return
    const path = decodeURIComponent(match[1])
    await deleteObject(ref(storage, path))
  } catch {
    // Fichier déjà supprimé — ignorer silencieusement
  }
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/uploadPhoto.ts
git commit -m "feat: uploadVisitePhoto et deleteVisitePhoto"
```

---

## Task 4 — Service Firestore

**Files:**
- Create: `src/services/visiteService.ts`

- [ ] **Step 1 : Créer `src/services/visiteService.ts`**

```typescript
import { collection, doc, addDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { VisitePreliminaire } from '@/types'

const COLLECTION = 'visites'

export async function createVisite(
  visite: Omit<VisitePreliminaire, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await trackWrite(addDoc(collection(db, COLLECTION), {
    ...visite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return ref.id
}

export async function saveVisite(visite: VisitePreliminaire): Promise<void> {
  await trackWrite(setDoc(doc(db, COLLECTION, visite.id), {
    ...visite,
    updatedAt: serverTimestamp(),
  }))
}

export async function deleteVisite(visiteId: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, COLLECTION, visiteId)))
}
```

- [ ] **Step 2 : Écrire le test**

Créer `src/services/__tests__/visiteService.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import type { VisitePreliminaire } from '@/types'
import { Timestamp } from 'firebase/firestore'

// Test unitaire sur la structure — les appels Firestore sont testés en intégration
describe('visiteService — types', () => {
  it('VisitePreliminaire a les champs requis', () => {
    const visite: VisitePreliminaire = {
      id: 'v1',
      linkedTo: { type: 'client', id: 'c1', nom: 'Plounerin' },
      date: '2026-05-26',
      technicienUid: 'uid1',
      technicienNom: 'Thomas K.',
      notes: '',
      points: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    expect(visite.linkedTo.type).toBe('client')
    expect(visite.points).toHaveLength(0)
  })
})
```

- [ ] **Step 3 : Lancer les tests**

```bash
npx vitest run src/services/__tests__/visiteService.test.ts
```

Expected : `1 passed`

- [ ] **Step 4 : Commit**

```bash
git add src/services/visiteService.ts src/services/__tests__/visiteService.test.ts
git commit -m "feat: visiteService (createVisite, saveVisite, deleteVisite)"
```

---

## Task 5 — Hook useVisites

**Files:**
- Create: `src/hooks/useVisites.ts`

- [ ] **Step 1 : Créer `src/hooks/useVisites.ts`**

```typescript
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { VisitePreliminaire } from '@/types'

export function useVisites(linkedId: string) {
  const [visites, setVisites] = useState<VisitePreliminaire[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!linkedId) {
      setLoading(false)
      return
    }
    const q = query(
      collection(db, 'visites'),
      where('linkedTo.id', '==', linkedId),
      orderBy('date', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setVisites(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VisitePreliminaire)))
      setLoading(false)
    })
    return () => unsub()
  }, [linkedId])

  return { visites, loading }
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/useVisites.ts
git commit -m "feat: hook useVisites — listener Firestore par linkedId"
```

---

## Task 6 — Générateur HTML d'export

**Files:**
- Create: `src/lib/generateVisiteHTML.ts`

- [ ] **Step 1 : Créer `src/lib/generateVisiteHTML.ts`**

```typescript
import type { VisitePreliminaire, FaisabiliteVisite } from '@/types'

function faisabiliteLabel(f: FaisabiliteVisite): string {
  return f === 'ok' ? '✓ OK' : f === 'difficile' ? '⚠ Difficile' : '✗ Impossible'
}

function faisabiliteColor(f: FaisabiliteVisite): string {
  return f === 'ok' ? '#34C759' : f === 'difficile' ? '#FF9F0A' : '#FF3B30'
}

export function generateVisiteHTML(visite: VisitePreliminaire): string {
  const pointsHTML = visite.points.map((p, i) => `
    <div class="point">
      <h3>Point ${i + 1} — ${p.nom}</h3>
      <table>
        <tr><td class="label">Type d'eau</td><td>${p.typeEau}</td></tr>
        <tr><td class="label">Méthode</td><td>${p.methode}</td></tr>
        <tr><td class="label">Faisabilité</td><td style="color:${faisabiliteColor(p.faisabilite)};font-weight:600">${faisabiliteLabel(p.faisabilite)}</td></tr>
        ${p.securite ? `<tr><td class="label">Sécurité</td><td>${p.securite}</td></tr>` : ''}
        ${p.notes ? `<tr><td class="label">Notes</td><td>${p.notes}</td></tr>` : ''}
      </table>
      ${p.photos.length > 0 ? `
        <div class="photos">
          ${p.photos.map(url => `<img src="${url}" alt="photo" />`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Visite préliminaire — ${visite.linkedTo.nom}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; font-size: 13px; color: #1D1D1F; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #6E6E73; margin-bottom: 32px; }
    .point { margin-bottom: 28px; page-break-inside: avoid; border: 1px solid #E5E5EA; border-radius: 8px; padding: 16px; }
    h3 { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #1D1D1F; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    td { padding: 4px 8px; vertical-align: top; font-size: 13px; }
    td.label { width: 140px; color: #6E6E73; font-weight: 500; }
    .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .photos img { width: calc(33% - 6px); max-width: 200px; height: 140px; object-fit: cover; border-radius: 6px; border: 1px solid #E5E5EA; }
    .notes-section { margin-top: 28px; padding: 16px; background: #F5F5F7; border-radius: 8px; }
    .notes-section h2 { font-size: 13px; font-weight: 600; color: #6E6E73; margin-bottom: 6px; }
    @media print {
      body { padding: 20mm; }
      .point { border: 1px solid #ccc; }
      .photos img { max-width: 160px; height: 110px; }
    }
  </style>
</head>
<body>
  <h1>Rapport de visite préliminaire</h1>
  <p class="meta">
    ${visite.linkedTo.nom} &nbsp;·&nbsp; ${new Date(visite.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;·&nbsp; ${visite.technicienNom}
  </p>
  ${pointsHTML}
  ${visite.notes ? `
    <div class="notes-section">
      <h2>Notes générales</h2>
      <p>${visite.notes}</p>
    </div>
  ` : ''}
</body>
</html>`
}
```

- [ ] **Step 2 : Écrire et lancer les tests**

Créer `src/lib/__tests__/generateVisiteHTML.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import { generateVisiteHTML } from '@/lib/generateVisiteHTML'
import type { VisitePreliminaire } from '@/types'
import { Timestamp } from 'firebase/firestore'

const BASE_VISITE: VisitePreliminaire = {
  id: 'v1',
  linkedTo: { type: 'client', id: 'c1', nom: 'Plounerin' },
  date: '2026-05-26',
  technicienUid: 'uid1',
  technicienNom: 'Thomas K.',
  notes: '',
  points: [],
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}

describe('generateVisiteHTML', () => {
  it('contient le nom du client', () => {
    const html = generateVisiteHTML(BASE_VISITE)
    expect(html).toContain('Plounerin')
  })

  it('contient le technicien', () => {
    const html = generateVisiteHTML(BASE_VISITE)
    expect(html).toContain('Thomas K.')
  })

  it('affiche les points avec faisabilité colorée', () => {
    const visite: VisitePreliminaire = {
      ...BASE_VISITE,
      points: [{
        id: 'p1', nom: 'P1 regard aval', typeEau: 'Eau usée',
        methode: 'Ponctuel', faisabilite: 'ok',
        securite: 'Bottes requises', notes: '', photos: [],
      }],
    }
    const html = generateVisiteHTML(visite)
    expect(html).toContain('P1 regard aval')
    expect(html).toContain('#34C759')
    expect(html).toContain('✓ OK')
  })

  it('affiche les notes générales si présentes', () => {
    const visite: VisitePreliminaire = { ...BASE_VISITE, notes: 'Accès difficile' }
    const html = generateVisiteHTML(visite)
    expect(html).toContain('Accès difficile')
  })

  it('n\'affiche pas la section notes si vide', () => {
    const html = generateVisiteHTML(BASE_VISITE)
    expect(html).not.toContain('Notes générales')
  })
})
```

```bash
npx vitest run src/lib/__tests__/generateVisiteHTML.test.ts
```

Expected : `5 passed`

- [ ] **Step 3 : Commit**

```bash
git add src/lib/generateVisiteHTML.ts src/lib/__tests__/generateVisiteHTML.test.ts
git commit -m "feat: generateVisiteHTML — export HTML imprimable"
```

---

## Task 7 — Page VisiteFormPage (création + édition)

**Files:**
- Create: `src/pages/VisiteFormPage.tsx`

Cette page gère deux modes :
- **Création** : `/visites/nouveau?type=client&id=xxx` ou `?type=demande&id=xxx`
- **Édition** : `/visites/:visiteId` (charge la visite existante depuis Firestore)

- [ ] **Step 1 : Créer `src/pages/VisiteFormPage.tsx`**

```typescript
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Camera, Loader2, FileText, X } from 'lucide-react'
import { collection, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { createVisite, saveVisite, deleteVisite } from '@/services/visiteService'
import { uploadVisitePhoto, deleteVisitePhoto } from '@/lib/uploadPhoto'
import { generateVisiteHTML } from '@/lib/generateVisiteHTML'
import type { VisitePreliminaire, PointVisite, NatureEauType, MethodeType, FaisabiliteVisite } from '@/types'
import { Timestamp } from 'firebase/firestore'

const NATURE_EAU: NatureEauType[] = ['Eau usée', 'Rivière', 'Souterraine', 'Eau pluviale', 'Eau saline', 'Boues', 'Autre']
const METHODES: MethodeType[] = ['Ponctuel', 'Composite', 'Automatique']

function newPoint(): PointVisite {
  return {
    id: crypto.randomUUID(),
    nom: '',
    typeEau: 'Eau usée',
    methode: 'Ponctuel',
    faisabilite: 'ok',
    securite: '',
    notes: '',
    photos: [],
  }
}

export default function VisiteFormPage() {
  const { visiteId } = useParams<{ visiteId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const isNew = !visiteId
  const linkedType = searchParams.get('type') as 'client' | 'demande' | null
  const linkedId = searchParams.get('id') ?? ''
  const linkedNom = searchParams.get('nom') ?? ''

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [technicienNom, setTechnicienNom] = useState('')
  const [technicienUid, setTechnicienUid] = useState('')
  const [notes, setNotes] = useState('')
  const [points, setPoints] = useState<PointVisite[]>([newPoint()])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [uploadingPointId, setUploadingPointId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [linkedNomState, setLinkedNomState] = useState(linkedNom)
  const [linkedTypeState, setLinkedTypeState] = useState<'client' | 'demande'>(linkedType ?? 'client')
  const [linkedIdState, setLinkedIdState] = useState(linkedId)

  // Pré-remplir technicien avec l'utilisateur connecté
  useEffect(() => {
    if (user && isNew) {
      setTechnicienUid(user.uid)
      setTechnicienNom(`${user.prenom} ${user.nom}`)
    }
  }, [user, isNew])

  // Charger la visite existante en mode édition
  useEffect(() => {
    if (!visiteId) return
    getDoc(doc(db, 'visites', visiteId)).then((snap) => {
      if (!snap.exists()) { navigate(-1); return }
      const v = { id: snap.id, ...snap.data() } as VisitePreliminaire
      setDate(v.date)
      setTechnicienNom(v.technicienNom)
      setTechnicienUid(v.technicienUid)
      setNotes(v.notes)
      setPoints(v.points.length > 0 ? v.points : [newPoint()])
      setLinkedNomState(v.linkedTo.nom)
      setLinkedTypeState(v.linkedTo.type)
      setLinkedIdState(v.linkedTo.id)
      setLoading(false)
    })
  }, [visiteId, navigate])

  function updatePoint(pointId: string, field: keyof PointVisite, value: unknown) {
    setPoints(ps => ps.map(p => p.id === pointId ? { ...p, [field]: value } : p))
  }

  function movePoint(idx: number, dir: -1 | 1) {
    setPoints(ps => {
      const next = [...ps]
      const tmp = next[idx]
      next[idx] = next[idx + dir]
      next[idx + dir] = tmp
      return next
    })
  }

  function removePoint(pointId: string) {
    setPoints(ps => ps.filter(p => p.id !== pointId))
  }

  async function handlePhotoAdd(pointId: string, file: File) {
    if (!visiteId && isNew) {
      // En mode création, on a besoin d'un visiteId pour stocker les photos.
      // On sauvegarde d'abord la visite pour obtenir l'id.
      const tempId = await handleSave(true)
      if (!tempId) return
      setUploadingPointId(pointId)
      const url = await uploadVisitePhoto(file, tempId, pointId)
      setPoints(ps => ps.map(p => p.id === pointId ? { ...p, photos: [...p.photos, url] } : p))
      setUploadingPointId(null)
      return
    }
    const id = visiteId!
    setUploadingPointId(pointId)
    const url = await uploadVisitePhoto(file, id, pointId)
    setPoints(ps => ps.map(p => p.id === pointId ? { ...p, photos: [...p.photos, url] } : p))
    setUploadingPointId(null)
  }

  async function handlePhotoDelete(pointId: string, url: string) {
    setPoints(ps => ps.map(p => p.id === pointId ? { ...p, photos: p.photos.filter(u => u !== url) } : p))
    await deleteVisitePhoto(url)
  }

  async function handleSave(silent = false): Promise<string | null> {
    if (!date || points.some(p => !p.nom.trim())) return null
    setSaving(true)
    try {
      const payload = {
        linkedTo: { type: linkedTypeState, id: linkedIdState, nom: linkedNomState },
        date,
        technicienUid,
        technicienNom,
        notes,
        points,
      }
      if (isNew) {
        const newId = await createVisite(payload)
        if (!silent) navigate(`/visites/${newId}`, { replace: true })
        return newId
      } else {
        await saveVisite({ id: visiteId!, ...payload, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
        if (!silent) navigate(-1)
        return visiteId!
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!visiteId) return
    await deleteVisite(visiteId)
    navigate(-1)
  }

  function handleExport() {
    const visite: VisitePreliminaire = {
      id: visiteId ?? '',
      linkedTo: { type: linkedTypeState, id: linkedIdState, nom: linkedNomState },
      date, technicienUid, technicienNom, notes, points,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    }
    const html = generateVisiteHTML(visite)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.print()
  }

  const backPath = linkedTypeState === 'client'
    ? `/missions/${linkedIdState}`
    : `/demandes`

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(backPath)} className="p-1.5 rounded-lg"
          style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isNew ? 'Nouvelle visite préliminaire' : 'Visite préliminaire'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{linkedNomState}</p>
        </div>
        {!isNew && (
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <FileText size={14} />
            Exporter
          </button>
        )}
      </div>

      {/* Champs généraux */}
      <div className="rounded-xl p-5 mb-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date de visite</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="field-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Technicien</label>
            <input value={technicienNom} onChange={e => setTechnicienNom(e.target.value)}
              className="field-input w-full" placeholder="Prénom Nom" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes générales</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className="field-input w-full resize-none"
              placeholder="Remarques générales sur le site…" />
          </div>
        </div>
      </div>

      {/* Points */}
      <div className="space-y-4 mb-6">
        {points.map((point, idx) => (
          <PointCard
            key={point.id}
            point={point}
            idx={idx}
            total={points.length}
            uploading={uploadingPointId === point.id}
            onChange={(field, value) => updatePoint(point.id, field, value)}
            onMove={(dir) => movePoint(idx, dir)}
            onRemove={() => removePoint(point.id)}
            onPhotoAdd={(file) => handlePhotoAdd(point.id, file)}
            onPhotoDelete={(url) => handlePhotoDelete(point.id, url)}
          />
        ))}
      </div>

      <button
        onClick={() => setPoints(ps => [...ps, newPoint()])}
        className="flex items-center gap-2 w-full py-3 rounded-xl text-sm font-medium mb-6"
        style={{ border: '1.5px dashed var(--color-border)', color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}
      >
        <Plus size={16} />
        Ajouter un point
      </button>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {!isNew && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={handleDelete} className="text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-danger)', color: 'white' }}>
                Confirmer la suppression
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm px-2 py-1.5 rounded-lg"
                style={{ color: 'var(--color-text-secondary)' }}>
                Annuler
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-sm px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--color-danger)' }}>
              <Trash2 size={14} className="inline mr-1" />
              Supprimer
            </button>
          )
        )}
        {isNew && <div />}
        <button
          onClick={() => handleSave()}
          disabled={saving || !date || points.some(p => !p.nom.trim())}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: 'white', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ── PointCard ─────────────────────────────────────────────────

interface PointCardProps {
  point: PointVisite
  idx: number
  total: number
  uploading: boolean
  onChange: (field: keyof PointVisite, value: unknown) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onPhotoAdd: (file: File) => void
  onPhotoDelete: (url: string) => void
}

function PointCard({ point, idx, total, uploading, onChange, onMove, onRemove, onPhotoAdd, onPhotoDelete }: PointCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const FAISABILITE: { key: FaisabiliteVisite; label: string; color: string }[] = [
    { key: 'ok', label: '✓ OK', color: 'var(--color-success)' },
    { key: 'difficile', label: '⚠ Difficile', color: 'var(--color-warning)' },
    { key: 'impossible', label: '✗ Impossible', color: 'var(--color-danger)' },
  ]

  return (
    <div className="rounded-xl p-5"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* Header point */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
          P{idx + 1}
        </span>
        <input
          value={point.nom}
          onChange={e => onChange('nom', e.target.value)}
          placeholder="Nom du point (ex: Regard aval station)"
          className="field-input flex-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          {idx > 0 && (
            <button onClick={() => onMove(-1)} className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Monter">↑</button>
          )}
          {idx < total - 1 && (
            <button onClick={() => onMove(1)} className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Descendre">↓</button>
          )}
          {total > 1 && (
            <button onClick={onRemove} className="p-1 rounded"
              style={{ color: 'var(--color-danger)' }} title="Supprimer">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Type d'eau</label>
          <select value={point.typeEau} onChange={e => onChange('typeEau', e.target.value as NatureEauType)}
            className="field-input w-full">
            {NATURE_EAU.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Méthode</label>
          <select value={point.methode} onChange={e => onChange('methode', e.target.value as MethodeType)}
            className="field-input w-full">
            {METHODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Faisabilité */}
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Faisabilité</label>
        <div className="flex gap-2">
          {FAISABILITE.map(f => (
            <button
              key={f.key}
              onClick={() => onChange('faisabilite', f.key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: point.faisabilite === f.key ? f.color : 'var(--color-bg-tertiary)',
                color: point.faisabilite === f.key ? 'white' : 'var(--color-text-secondary)',
                border: `1.5px solid ${point.faisabilite === f.key ? f.color : 'var(--color-border)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Sécurité</label>
        <input value={point.securite} onChange={e => onChange('securite', e.target.value)}
          className="field-input w-full" placeholder="EPI requis, risques, accès…" />
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
        <input value={point.notes} onChange={e => onChange('notes', e.target.value)}
          className="field-input w-full" placeholder="Remarques spécifiques…" />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Photos</label>
        {point.photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {point.photos.map(url => (
              <div key={url} className="relative rounded-lg overflow-hidden shrink-0"
                style={{ width: 80, height: 80, border: '1px solid var(--color-border)' }}>
                <img src={url} alt="photo" className="w-full h-full object-cover" loading="lazy" />
                <button onClick={() => onPhotoDelete(url)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}>
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
        <label
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: uploading ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
          }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? 'Envoi en cours…' : 'Ajouter une photo'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoAdd(f) }}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected : aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add src/pages/VisiteFormPage.tsx
git commit -m "feat: VisiteFormPage — création et édition de visites préliminaires"
```

---

## Task 8 — Composant ClientVisites

**Files:**
- Create: `src/components/client/ClientVisites.tsx`
- Modify: `src/pages/ClientPage.tsx`

- [ ] **Step 1 : Créer `src/components/client/ClientVisites.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useVisites } from '@/hooks/useVisites'

interface Props {
  clientId: string
  clientNom: string
}

const FAISABILITE_COLORS: Record<string, string> = {
  ok: 'var(--color-success)',
  difficile: 'var(--color-warning)',
  impossible: 'var(--color-danger)',
}

export default function ClientVisites({ clientId, clientNom }: Props) {
  const navigate = useNavigate()
  const { visites, loading } = useVisites(clientId)

  function handleNew() {
    navigate(`/visites/nouveau?type=client&id=${clientId}&nom=${encodeURIComponent(clientNom)}`)
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Visites préliminaires
        </h2>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          <Plus size={14} />
          Nouvelle visite
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
        </div>
      ) : visites.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
          Aucune visite préliminaire enregistrée
        </p>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          {visites.map((v, idx) => (
            <button
              key={v.id}
              onClick={() => navigate(`/visites/${v.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ borderBottom: idx < visites.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Visite du {new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {v.points.length} point{v.points.length > 1 ? 's' : ''} · {v.technicienNom}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {v.points.slice(0, 4).map(p => (
                  <span key={p.id} className="w-2 h-2 rounded-full"
                    style={{ background: FAISABILITE_COLORS[p.faisabilite] ?? 'var(--color-neutral)' }} />
                ))}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Ajouter `<ClientVisites>` dans `src/pages/ClientPage.tsx`**

Après l'import existant `ClientPlans`, ajouter :

```typescript
import ClientVisites from '@/components/client/ClientVisites'
```

Dans le JSX, après `<ClientPlans ... />` et avant `{pdfPreview && ...}` :

```tsx
      <ClientVisites
        clientId={client.id}
        clientNom={client.nom}
      />
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/client/ClientVisites.tsx src/pages/ClientPage.tsx
git commit -m "feat: ClientVisites — section visites dans la fiche client"
```

---

## Task 9 — Section visites dans DemandeModal

**Files:**
- Modify: `src/pages/DemandesPage.tsx`

La section visites s'affiche dans `DemandeModal` uniquement pour les demandes existantes (`!isNew`), entre les notes et les actions.

- [ ] **Step 1 : Ajouter les imports dans `src/pages/DemandesPage.tsx`**

En haut du fichier, ajouter :

```typescript
import { useVisites } from '@/hooks/useVisites'
import { useNavigate } from 'react-router-dom'
```

- [ ] **Step 2 : Ajouter le composant inline `DemandeVisites` juste avant `function DemandeModal`**

```typescript
function DemandeVisites({ demandeId, demandeNom, onNavigate }: { demandeId: string; demandeNom: string; onNavigate: () => void }) {
  const { visites, loading } = useVisites(demandeId)

  function handleNew() {
    onNavigate()
    // La navigation se fait après fermeture de la modal
    setTimeout(() => {
      window.location.href = `/visites/nouveau?type=demande&id=${demandeId}&nom=${encodeURIComponent(demandeNom)}`
    }, 50)
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>
          Visites préliminaires
        </span>
        <button onClick={handleNew} className="text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
          style={{ background: 'var(--color-accent)', color: 'white' }}>
          <Plus size={12} />
          Nouvelle
        </button>
      </div>
      {loading ? null : visites.length === 0 ? (
        <p className="text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>Aucune visite enregistrée</p>
      ) : (
        <div className="flex flex-col gap-1">
          {visites.map(v => (
            <button key={v.id}
              onClick={() => { onNavigate(); setTimeout(() => { window.location.href = `/visites/${v.id}` }, 50) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
              <span className="flex-1 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' — '}{v.points.length} pt{v.points.length > 1 ? 's' : ''}
              </span>
              <ChevronRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

Ajouter `ChevronRight` aux imports Lucide existants.

- [ ] **Step 3 : Utiliser `DemandeVisites` dans `DemandeModal`**

Dans `DemandeModal`, après le bloc `<Field label="Notes internes">...</Field>` (ligne ~155) et avant `{/* Actions */}`, ajouter :

```tsx
          {!isNew && demande.id && (
            <>
              <Sec label="Visites préliminaires" />
              <DemandeVisites
                demandeId={demande.id}
                demandeNom={form.contactSociete || form.contactNom || 'Demande'}
                onNavigate={onClose}
              />
            </>
          )}
```

- [ ] **Step 4 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/DemandesPage.tsx
git commit -m "feat: section visites dans DemandeModal"
```

---

## Task 10 — Routes App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1 : Ajouter les imports lazy**

Après la ligne `const AidePage = lazy(...)`, ajouter :

```typescript
const VisiteFormPage    = lazy(() => import('@/pages/VisiteFormPage'))
```

- [ ] **Step 2 : Ajouter les routes**

Dans la section `<Route element={<RequireAuth>...}>`, après la route `/demandes`, ajouter :

```tsx
        <Route path="/visites/nouveau" element={
          <Suspense fallback={<PageSpinner />}><VisiteFormPage /></Suspense>
        } />
        <Route path="/visites/:visiteId" element={
          <Suspense fallback={<PageSpinner />}><VisiteFormPage /></Suspense>
        } />
```

- [ ] **Step 3 : Vérifier la compilation complète**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected : aucune erreur.

- [ ] **Step 4 : Lancer tous les tests**

```bash
npx vitest run
```

Expected : tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx
git commit -m "feat: routes /visites — navigation vers VisiteFormPage"
```

---

## Task 11 — Build et déploiement staging

- [ ] **Step 1 : Build de production**

```bash
npm run build 2>&1 | tail -20
```

Expected : `built in Xs` sans erreur.

- [ ] **Step 2 : Déployer sur staging**

```bash
bash deploy-dev.sh
```

Expected : `Deployed to labocea-pmc-dev.tomkerf.workers.dev`

- [ ] **Step 3 : Vérifier sur staging**

Ouvrir `labocea-pmc-dev.tomkerf.workers.dev` :
1. Aller sur une fiche client → vérifier que la section "Visites préliminaires" apparaît
2. Créer une nouvelle visite, ajouter 2 points, enregistrer
3. Rouvrir la visite, cliquer "Exporter" → vérifier le rapport HTML s'ouvre et est imprimable
4. Aller sur une demande existante → vérifier la section visites dans la modal
5. Tester sur mobile : bouton caméra sur les photos de points

- [ ] **Step 4 : Commit final**

```bash
git add -A
git commit -m "feat: visites préliminaires — déploiement staging"
```
