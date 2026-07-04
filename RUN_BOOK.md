# RUN_BOOK — Labocea PMC V2

> Procédures opérationnelles pour préparer et exécuter le déploiement production, gérer les secrets, les backups et les rollbacks.
> Ce document est **actionnable** : commandes exactes, dans l'ordre. À garder à jour.
>
> ⚠️ Un run book plus narratif existe déjà : [`docs/run-book-prod.md`](./docs/run-book-prod.md). Ce fichier-ci est la version corrigée/priorisée pour la bascule prod. En cas de divergence, **ce fichier fait foi** (chemins backup et clés VAPID notamment).

---

## 1. Stack et où gérer quoi

| Composant | Service | Console |
|---|---|---|
| Frontend + API (proxy FCM, feed iCal) | Cloudflare Workers | dash.cloudflare.com → Workers & Pages |
| Base de données / Auth / Storage | Firebase (projet `labocea-pmc`) | console.firebase.google.com |
| Backup Firestore | Cloud Scheduler → GCS `gs://labocea-pmc-backups` | console.cloud.google.com |
| Erreurs JS | Sentry (`labocea-pmc-v2`) | sentry.io |
| Push notifications | Firebase FCM (via le Worker) | idem Firebase |

**Workers :**
- Staging : `labocea-pmc-v2-dev` → https://labocea-pmc-v2-dev.tomkerf.workers.dev
- Production : `labocea-pmc-v2` → https://labocea-pmc-v2.tomkerf.workers.dev

**Projet Firebase (staging ET prod) : `labocea-pmc`.** ⚠️ À ce jour, staging et prod partagent la **même** base Firestore. Voir §8 (blocages / risques).

---

## 2. Secrets et variables d'environnement

### 2.1 Variables de build (côté client, préfixe `VITE_`)

Injectées au moment du `vite build` depuis `.env.local` (**non versionné**). Elles finissent dans le bundle JS servi au navigateur — ce ne sont **pas** des secrets serveur (les clés Firebase Web sont publiques par conception ; la sécurité repose sur les règles Firestore/Storage).

| Variable | Rôle | Source |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Clé API Web Firebase | Console Firebase → Paramètres du projet → Vos applications |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domaine Auth | idem |
| `VITE_FIREBASE_PROJECT_ID` | `labocea-pmc` | idem |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket Storage photos | idem |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID FCM | idem |
| `VITE_FIREBASE_APP_ID` | App ID | idem |
| `VITE_FIREBASE_VAPID_KEY` | Clé **publique** VAPID pour le Web Push (`getToken({ vapidKey })`) | Console Firebase → Cloud Messaging → Configuration Web → Certificats push web |
| `VITE_SENTRY_DSN` | DSN Sentry (remontée erreurs) | sentry.io → Settings → Client Keys |
| `VITE_APP_VERSION` | Version taguée dans les releases Sentry | Injectée au build |

Modèle : `.env.example`. Créer/mettre à jour : copier `.env.example` → `.env.local` et renseigner les valeurs.
Stockage recommandé des valeurs réelles : gestionnaire de secrets (1Password coffre Labocea) ou auprès de Tom. **Ne jamais committer `.env.local`.**

> Note VAPID : seule la clé **publique** est utilisée (côté client, `usePushNotifications.ts`). L'envoi des push se fait via l'API FCM v1 avec le **service account** (voir §2.2), **pas** avec une clé VAPID privée. Il n'y a donc pas de secret `VAPID_PRIVATE_KEY` à gérer côté Worker.

### 2.2 Secrets du Worker Cloudflare (côté serveur)

Le Worker (`worker/index.js`) lit ses secrets via `env.*`. Seul secret réellement consommé par le code :

| Secret | Rôle dans le code | Utilisé par |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON complet du compte de service Google. Sert à (a) obtenir un access token OAuth2 pour l'API FCM v1 (envoi push), (b) lire Firestore côté serveur pour les tokens FCM et le feed iCal, (c) récupérer `project_id`. | `/api/send-notification`, `/api/calendar/:uid/:token.ics` |

**Lister les secrets configurés (lecture seule) :**
```bash
npx wrangler secret list --name labocea-pmc-v2-dev   # staging
npx wrangler secret list --name labocea-pmc-v2        # prod
```

**(Ré)injecter le service account :**
```bash
# Le contenu est le fichier JSON du compte de service (Console GCP → IAM → Comptes de service → Clés)
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --name labocea-pmc-v2-dev   # staging
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --name labocea-pmc-v2        # prod
# → coller le JSON à l'invite, puis Entrée
```

**Régénérer le service account** (si compromis ou expiré) : Console GCP → IAM & Admin → Comptes de service → sélectionner le compte → Clés → « Ajouter une clé » → JSON → réinjecter avec `wrangler secret put` sur les deux Workers → révoquer l'ancienne clé.

⚠️ **À vérifier avant prod** : une observation ancienne (2026-06-01) indiquait `FIREBASE_SERVICE_ACCOUNT` absent des secrets Wrangler. Confirmer sa présence sur **staging ET prod** avec `wrangler secret list` avant toute bascule (sinon push + feed iCal cassés).

> `docs/run-book-prod.md` mentionne aussi `VAPID_PRIVATE_KEY` et `SENTRY_DSN` comme secrets Worker : **le code ne les lit pas**. Sentry est côté client (`VITE_SENTRY_DSN`), et il n'y a pas de clé VAPID privée. Ne pas les recréer.

---

## 3. Procédure de redéploiement

### 3.1 Staging (sans risque)
```bash
bash deploy-dev.sh
# = npm run build  → copie roadmap*.html + ROADMAP.md dans dist/  → npx wrangler deploy --name labocea-pmc-v2-dev
# URL : https://labocea-pmc-v2-dev.tomkerf.workers.dev
```

### 3.2 Production
```bash
# Pré-requis : avoir validé sur staging (voir la checklist §7)
bash deploy-prod.sh
# → demande une confirmation interactive ("oui") avant de déployer
# = npm run build  →  npx wrangler deploy --name labocea-pmc-v2
# URL : https://labocea-pmc-v2.tomkerf.workers.dev
```
> ⛔ Ne pas exécuter tant que les blocages organisationnels du §8 ne sont pas levés (accord DSIN, plan bascule Brest).

### 3.3 Règles Firestore et Storage (déploiement SÉPARÉ)

`deploy-dev.sh` / `deploy-prod.sh` ne déploient **QUE** l'app Cloudflare. Les règles se déploient à part avec la CLI Firebase, projet `labocea-pmc` :

```bash
# Règles Firestore uniquement
firebase deploy --only firestore:rules --project labocea-pmc

# Règles Storage uniquement
firebase deploy --only storage --project labocea-pmc

# Les deux d'un coup
firebase deploy --only firestore:rules,storage --project labocea-pmc
```
⚠️ À faire **manuellement** après **toute** modification de `firestore.rules` ou `storage.rules`. Symptôme d'oubli : « Missing or insufficient permissions » dans l'app.
Config utilisée : `firebase.json` (`firestore.rules`, `storage.rules`). Aucun `.firebaserc` dans le repo → toujours passer `--project labocea-pmc` explicitement.

---

## 4. Backup et restauration Firestore

### 4.1 Backup automatique
- **Job** : Cloud Scheduler `firestore-monthly-backup` (malgré le nom, il tourne **chaque lundi ~9h Europe/Paris**).
- **Cible** : `gs://labocea-pmc-backups/exports/<TIMESTAMP>` (bucket créé en `europe-west1`, accès public bloqué).
- **Rotation** : le script garde les **12 exports les plus récents** et supprime les plus anciens.
- **Script** : `backup-firestore.sh` (prérequis : `gcloud` installé + `gcloud auth login`).

### 4.2 Backup manuel (à la demande, ex. juste avant la bascule prod)
```bash
./backup-firestore.sh --dry-run   # affiche la commande sans l'exécuter
./backup-firestore.sh             # export réel + rotation
```

### 4.3 Vérifier les exports
```bash
gcloud storage ls gs://labocea-pmc-backups/exports/ --project labocea-pmc
```

### 4.4 Restauration (perte de données)
⚠️ `import` **écrase** les données actuelles des collections concernées. À faire **hors heures** et après avoir prévenu l'équipe.
```bash
# 1. Identifier l'export à restaurer
gcloud storage ls gs://labocea-pmc-backups/exports/ --project labocea-pmc

# 2. (Recommandé) faire un export "de sécurité" de l'état courant avant d'écraser
./backup-firestore.sh

# 3. Importer l'export choisi
gcloud firestore import gs://labocea-pmc-backups/exports/<TIMESTAMP> --project labocea-pmc
```

---

## 5. Rollback

### 5.1 Application (Cloudflare Workers) — le plus rapide
1. dash.cloudflare.com → Workers & Pages → `labocea-pmc-v2` → onglet **Deployments**
2. Repérer le déploiement précédent → **Rollback to this deployment**
3. Vérifier sur la prod (pas de rebuild nécessaire — instantané)

### 5.2 Application via git (si besoin de rebuild)
```bash
git log --oneline -10                 # trouver le bon commit
git checkout <sha> -- .               # restaurer les fichiers de ce commit
npm run build
npx wrangler deploy --name labocea-pmc-v2
```

### 5.3 Règles Firestore
```bash
git show HEAD~1:firestore.rules > firestore.rules   # version précédente
firebase deploy --only firestore:rules --project labocea-pmc
```

---

## 6. Monitoring

- **Sentry** (`labocea-pmc-v2`) : surveiller les JS errors et chunk load failures après chaque déploiement. Un spike juste après un déploiement → corréler avec la release taguée (`VITE_APP_VERSION`).
- **Firebase Usage** : console.firebase.google.com → onglet Usage (voir §8 quota).

---

## 7. Checklist pré-prod (à cocher avant `deploy-prod.sh`)

**Code / qualité**
- [ ] `npm run lint` → 0 erreur
- [ ] `npm run test` → tous verts
- [ ] `npm run build` → succès (le warning « chunk > 500 kB » sur `heic-to` est connu/accepté)
- [ ] Changement validé sur **staging** (`bash deploy-dev.sh` puis test du golden path)

**Secrets / config**
- [ ] `wrangler secret list --name labocea-pmc-v2` → `FIREBASE_SERVICE_ACCOUNT` présent
- [ ] `.env.local` de build complet (6 clés `VITE_FIREBASE_*` + VAPID + Sentry DSN + APP_VERSION)
- [ ] `VITE_APP_VERSION` incrémentée (traçabilité Sentry)

**Données / règles**
- [ ] Règles Firestore et Storage à jour et déployées (`firebase deploy --only firestore:rules,storage --project labocea-pmc`)
- [ ] Backup manuel frais réalisé (`./backup-firestore.sh`) et vérifié dans le bucket
- [ ] Décision prise sur le partage staging/prod de la base Firestore (voir §8)

**Firebase / quota**
- [ ] Plan Firebase vérifié (Spark vs Blaze) et alerte budget configurée si Blaze
- [ ] Consommation Firestore reads/jour sous le seuil Spark (50 000/j) au vu de l'usage équipe

**Organisationnel**
- [ ] Accord DSIN Labocea obtenu
- [ ] Plan de bascule Brest défini (date, référent, formation)
- [ ] Run book connu de l'équipe ; référent Brest désigné

---

## 8. Blocages et risques restants

| Sujet | Statut | Détail / action |
|---|---|---|
| **Accord DSIN Labocea** | 🔴 Bloquant | Validation formelle non obtenue. Prérequis absolu à la mise en prod. |
| **Plan de bascule équipe Brest** | 🔴 Bloquant | Date, référent local et plan de formation à définir. |
| **Quota / plan Firebase** | 🟡 À vérifier | Confirmer Spark vs Blaze en console, poser une alerte budget si Blaze. Spark = 50 000 reads/j, 1 Go Storage, 10 Go download/j. Migrer vers Blaze si dépassement imminent (coût ~nul à l'usage réel). |
| **Base Firestore partagée staging/prod** | 🔴 Critique | Les deux Workers pointent sur le même projet `labocea-pmc`. Un test staging écrit dans la vraie base. **Action requise avant prod** : Créer nouveau projet GCP `labocea-pmc-dev`, reconfigurer staging vers ce projet (`wrangler.toml`), puis redéployer. Risque inacceptable sans cette séparation. |
| **Secret `FIREBASE_SERVICE_ACCOUNT`** | 🟡 À confirmer | Vérifier sa présence sur staging ET prod (§2.2). |
| **Bundle `heic-to` (~3 Mo)** | 🟢 Accepté | Warning build connu, chargé en lazy. Dette documentée, non bloquant. |

---

## 9. Problèmes fréquents

| Symptôme | Cause probable | Action |
|---|---|---|
| Filtre "Site" vide sur MissionsPage malgré préleveurs configurés | `usePreleveursListener()` non monté sur la page (listener local par page, pas global) | Vérifier que la page consommatrice monte bien son listener (session 152, commit `60589a1`) |
| Cartouche/toggle UI qui s'étire pleine largeur ou « Chunk failed to load » après déploiement | Service Worker sert l'ancien bundle (`CACHE_VERSION` inchangée en cache) | Hard refresh (Cmd/Ctrl+Shift+R) ; vérifier que `public/sw.js` `CACHE_VERSION` a été incrémentée au déploiement (session 149) |
| Classe Tailwind (`flex`, `w-fit`...) absente du rendu malgré le code source correct | Oxide scanner ne détecte pas les classes dans un template literal conditionnel complexe | Utiliser des classNames statiques ou des styles inline pour les layouts critiques (pattern documenté session 149) |
| Erreur Sentry "send was called before connect" en dev uniquement | Faux positif : interaction Sentry ↔ Vite HMR sur warning Firestore transitoire | Aucune action — Sentry désactivé en dev depuis session 151 (`import.meta.env.DEV`) |
| Deux utilisateurs écrasent les mêmes données sans avertissement | Écriture Firestore sans vérification de conflit (`setDoc` simple) | Le pattern `runTransaction` + bandeau "modifié depuis votre ouverture" est la norme (clientService, equipementService) — à répliquer sur tout nouveau service d'écriture |
| Plan de Charge affiche tout en orange (surcharge) alors qu'il ne devrait pas | `nbActiveTechs = 0` (store préleveurs vide) → capacité max = 0 → tout dépasse | Vérifier que le document `preleveurs-v1/data` est chargé ; voir fix session 146 (`maxCapacityPerMonth > 0 &&`) |
| Upload photo échoue sans message d'erreur visible | `catch` manquant autour de l'appel d'upload | Vérifier que tout point d'upload utilise `ImageValidationError` + toast (pattern session 148, `VisiteFormPage`) |
| Conversion HEIC (photos iPhone) échoue ou timeout | Format HEIC récent (iOS 17+/iPhone 15+) non supporté par l'ancienne lib | Vérifier que `heic-to` (pas `heic2any`) est bien utilisé (migration session 128) |
| Consommation Firestore approche/dépasse le quota Spark (50k reads/j) | Listener global sans `limit()`, ou navigation qui refetch en boucle | Vérifier `limit(200)` sur les listeners haut-volume (verifications, maintenances) ; consulter Firebase Console → Usage |
| « Missing or insufficient permissions » | Règles non déployées après modif | `firebase deploy --only firestore:rules --project labocea-pmc` |
| Push notifications ne partent pas | `FIREBASE_SERVICE_ACCOUNT` absent/expiré côté Worker | `wrangler secret list` puis `wrangler secret put` |
| Feed iCal renvoie 500 | idem (service account) ou `calendarToken` invalide | Vérifier le secret + le token dans `users/{uid}.calendarToken` |
| Build échoue (TypeScript) | Erreur TS | `npm run build` en local, corriger avant de redéployer |

---

## 10. Logs et debugging

- **Console navigateur (dev)** : `F12` → Console. Filtrer par pattern applicatif si des préfixes de log existent.
- **Sentry** : sentry.io → projet `labocea-pmc-v2` → Issues. Filtrer par `environment:production` pour exclure le bruit dev. Chaque issue a une stack trace + breadcrumbs (utile pour reconstituer une chaîne causale, cf. investigation session 151).
- **Firebase Console** : console.firebase.google.com → projet `labocea-pmc` → Firestore Database (données brutes) et onglet Usage (lectures/écritures/quota).
- **Logs du Worker Cloudflare (temps réel)** :
  ```bash
  npx wrangler tail --name labocea-pmc-v2       # prod
  npx wrangler tail --name labocea-pmc-v2-dev   # staging
  ```
  Utile pour déboguer `/api/send-notification` ou le feed iCal.
- **CI / GitHub Actions** : github.com → repo → onglet Actions, pour les échecs de build sur push.

---

## Contacts

| Rôle | Personne | Contact |
|---|---|---|
| Développeur / Admin app | Tom Kerfendal | tomkerf@gmail.com |
| Référent Brest | À désigner | — |
| DSIN Labocea | À confirmer | — |

---

*Généré le 2026-07-02. Sources : `deploy-*.sh`, `wrangler.toml`, `worker/index.js`, `firebase.json`, `firestore.rules`, `storage.rules`, `backup-firestore.sh`, `.env.example`, `DEV_LOG.md`.*
