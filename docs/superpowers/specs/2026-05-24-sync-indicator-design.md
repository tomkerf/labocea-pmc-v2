# Design — Indicateur de synchronisation cloud

**Date :** 2026-05-24  
**Scope :** Badge nuage discret dans TopBar (mobile) et Sidebar (desktop) indiquant l'état de sync Firestore  
**Status :** Approuvé

---

## Objectif

Donner aux techniciens terrain une visibilité sur l'état de synchronisation de leurs données : sont-elles sauvegardées dans le cloud ou en attente de réseau ?

---

## 3 États

| État | Icône Lucide | Couleur | Condition |
|------|-------------|---------|-----------|
| `synced` | `Cloud` + coche | Vert discret (`--color-success`) | Online + 0 écriture en attente |
| `syncing` | `CloudUpload` animé | Gris (`--color-text-tertiary`) | Online + ≥1 écriture en attente |
| `offline` | `CloudOff` | Gris (`--color-text-tertiary`) | `!navigator.onLine` |

---

## Architecture

### Nouveau : `src/stores/syncStore.ts`

Store Zustand minimal :

```ts
interface SyncState {
  pendingWrites: number
  isOnline: boolean
  increment: () => void
  decrement: () => void
  setOnline: (v: boolean) => void
}
```

Dérivé calculé (hors store) :
```ts
type SyncStatus = 'synced' | 'syncing' | 'offline'
function getSyncStatus(state: SyncState): SyncStatus {
  if (!state.isOnline) return 'offline'
  if (state.pendingWrites > 0) return 'syncing'
  return 'synced'
}
```

### Nouveau : `src/lib/trackWrite.ts`

Helper qui wrap une Promise Firestore :

```ts
export function trackWrite<T>(promise: Promise<T>): Promise<T> {
  useSyncStore.getState().increment()
  return promise.finally(() => useSyncStore.getState().decrement())
}
```

### Nouveau : `src/hooks/useNetworkStatus.ts`

Hook React qui écoute `online`/`offline` sur `window` et synchronise `syncStore.isOnline` :

```ts
export function useNetworkStatus() {
  useEffect(() => {
    const store = useSyncStore.getState()
    store.setOnline(navigator.onLine)
    const onOnline  = () => store.setOnline(true)
    const onOffline = () => store.setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])
}
```

Appelé une seule fois dans `AppLayout.tsx`.

### Nouveau : `src/components/ui/SyncBadge.tsx`

Composant pur (pas de fetch, pas de state) :

```ts
interface SyncBadgeProps { className?: string }
```

- Lit `syncStore` via `useStore`
- Calcule `getSyncStatus`
- Affiche l'icône + tooltip (title HTML natif)
- Animation CSS `animate-spin` sur `CloudUpload` en état `syncing`
- Taille icône : 16px, `strokeWidth={1.5}`

### Modifications : `src/services/*.ts` (6 fichiers)

Chaque appel `setDoc`/`addDoc`/`updateDoc`/`deleteDoc` wrappé dans `trackWrite()` :

```ts
// Avant
await setDoc(ref, data)

// Après
await trackWrite(setDoc(ref, data))
```

Fichiers concernés :
- `clientService.ts` — `saveClient`, `deleteClient`, `createClient`
- `equipementService.ts` — `saveEquipement`, `createEquipement`
- `verificationService.ts` — toutes les fonctions write
- `maintenanceService.ts` — toutes les fonctions write
- `evenementService.ts` — toutes les fonctions write
- `userService.ts` — toutes les fonctions write

Fichiers NON touchés (writes secondaires, pas critiques) :
- `useAuth.ts` — écriture one-shot au login
- `BugReportModal.tsx` — signalement de bug
- `RequireAuth.tsx` — sync login timestamp
- `useTuyaux.ts`, `useDemandes.ts` — wrappés directement dans leurs hooks

### Modifications : `src/components/layout/AppLayout.tsx`

1. Appeler `useNetworkStatus()` au montage
2. Ajouter `<SyncBadge>` dans la TopBar mobile (à gauche du burger, à droite du logo)

### Modifications : `src/components/layout/Sidebar.tsx`

Ajouter `<SyncBadge>` en bas de la sidebar desktop, au-dessus du lien "Mon compte".

---

## UI détail

**TopBar mobile :**
```
[🖼 Logo] [Labocea PMC]        [☁️] [≡]
```
Le badge est juste avant le burger, taille réduite.

**Sidebar desktop :**
```
[nav items...]
─────────────
[☁️ Synchronisé]   ← petit, discret, en bas
[👤 Mon compte]
```

**Tooltip (title natif) :**
- synced : "Données synchronisées"
- syncing : "Synchronisation en cours..."
- offline : "Hors connexion — modifications sauvegardées localement"

---

## Ce qui N'est PAS dans le scope

- Persistance de l'état entre sessions
- Comptage des octets en attente
- Notification toast au retour en ligne
- Retry automatique (Firestore le gère nativement)
- Wrapping de `useTuyaux` et `useDemandes` (writes peu fréquents, non critiques)

---

## Fichiers créés/modifiés

| Fichier | Action |
|---------|--------|
| `src/stores/syncStore.ts` | Créer |
| `src/lib/trackWrite.ts` | Créer |
| `src/hooks/useNetworkStatus.ts` | Créer |
| `src/components/ui/SyncBadge.tsx` | Créer |
| `src/services/clientService.ts` | Modifier |
| `src/services/equipementService.ts` | Modifier |
| `src/services/verificationService.ts` | Modifier |
| `src/services/maintenanceService.ts` | Modifier |
| `src/services/evenementService.ts` | Modifier |
| `src/services/userService.ts` | Modifier |
| `src/components/layout/AppLayout.tsx` | Modifier |
| `src/components/layout/Sidebar.tsx` | Modifier |
