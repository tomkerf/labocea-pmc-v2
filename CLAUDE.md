# CLAUDE.md — Labocea PMC V2

> Référence rapide. Pour le détail, voir les liens en bas de fichier.

---

## Commandes

```bash
npm run dev          # serveur de développement local (Vite)
npm run build        # TypeScript + build Vite → dist/
npm run lint         # ESLint
npm run test         # Vitest (unit tests, run once)
npm run test:watch   # Vitest en mode watch
npm run doctor       # react-doctor (score qualité React)
npm run storybook    # Storybook sur :6006

bash deploy-dev.sh   # build + déploiement staging
bash deploy-prod.sh  # build + déploiement production (demande confirmation)
```

### Slash Commands (Claude Code)
*   `/plan` : Planification d'implémentation étape par étape avec validation de l'utilisateur.
*   `/code-review` : Revue locale de sécurité, qualité, et conformité.
*   `/learn` : Extraction et capitalisation des apprentissages de la session dans la mémoire globale.

**Automatisation IA** : L'assistant doit appliquer d'office les workflows de `/plan` (avant tout dev complexe), `/code-review` (avant de commiter ou déployer) et `/learn` (en fin de tâche pour enrichir la mémoire) sans attendre que l'utilisateur le demande.


Lancer un seul fichier de test :
```bash
npx vitest run src/lib/__tests__/overdue.test.ts
```

Deux projets Vitest : `unit` (jsdom) et `storybook` (Playwright/Chromium). `npm run test` lance uniquement `unit`.

## Variables d'environnement

Copier `.env.example` → `.env.local` et renseigner les 6 clés `VITE_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

---

## Architecture

**Alias `@/`** → `src/`

### Flux de données

```
Firestore (onSnapshot) → hook useXxx → store Zustand → composants
```

- **Hooks** (`src/hooks/`) : abonnements `onSnapshot`. Écrivent dans le store via ses setters.
- **Stores** (`src/stores/`) : état en mémoire. Un store par domaine. Les stores n'accèdent jamais à Firestore directement.
- **Services** (`src/services/`) : toutes les **écritures** Firestore passent par les services. Chaque écriture est wrappée dans `trackWrite()` (`src/lib/trackWrite.ts`) pour incrémenter `useSyncStore.pendingWrites`.
- **Pages** (`src/pages/`) : chargées en lazy via `React.lazy()`. Chaque page a un sous-répertoire éponyme dans `src/components/`.

### Constantes importantes

`src/lib/constants.ts` :
- `COLLECTIONS` — noms de toutes les collections Firestore (**toujours utiliser ce const, jamais une string en dur**)
- `COLORS` — références aux tokens CSS (`var(--color-*)`)
- `Z_INDEX` — niveaux d'empilement standardisés

### Auth

`useAuthInit()` s'abonne à `onAuthStateChanged`. Peuple `useAuthStore` avec `firebaseUser` (Firebase Auth) et `appUser` (profil Firestore enrichi).

Utiliser les **sélecteurs nommés** exportés depuis `authStore.ts` (`selectUid`, `selectRole`, etc.) — jamais de lambdas inline.

Routes protégées : `<RequireAuth>` / `<RequireAdmin>` (vérifie `appUser.role === 'admin'`).

### Firebase secondaire

`authSecondary` / `dbSecondary` (`src/lib/firebase.ts`) : instance séparée pour créer des comptes depuis l'admin sans déconnecter l'admin courant.

### Offline / sync

Firestore initialisé avec `persistentLocalCache` + `persistentMultipleTabManager` (IndexedDB).  
`useSyncStore` expose `pendingWrites` et `isOnline`. `getSyncStatus()` dérive `synced` / `syncing` / `offline`.

---

## État du projet et dette technique

L'application est fonctionnellement complète (phases 1-7 done). En attente des retours équipe Brest avant déploiement production.

**À consulter avant de coder :** [TODO_REFACTORING.md](./TODO_REFACTORING.md)

Score react-doctor actuel : **43/100** avec react-doctor v0.6 (barème durci — l'ancien barème donnait 71/100 sur le même code). Les 2 « erreurs » sécurité et les warnings restants sont documentés comme faux positifs dans `.react-doctor/false-positives.md`.

---

## Documentation détaillée

| Sujet | Fichier |
|-------|---------|
| Design system (tokens, composants, règles) | [.claude/docs/design-system.md](.claude/docs/design-system.md) |
| Schéma base de données Firestore | [.claude/docs/database-schema.md](.claude/docs/database-schema.md) |
| Architecture des pages et routes | [.claude/docs/pages-architecture.md](.claude/docs/pages-architecture.md) |
| Contexte projet et stack technique | [.claude/docs/project-context.md](.claude/docs/project-context.md) |
| Avancement et journal de sessions | [ROADMAP.md](./ROADMAP.md) |
| Dette technique priorisée | [TODO_REFACTORING.md](./TODO_REFACTORING.md) |
