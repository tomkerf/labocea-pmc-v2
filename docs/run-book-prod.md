# Run Book — Labocea PMC V2 (Production)

> Pour Tom, ou quiconque doit intervenir en urgence sur l'app.

---

## Stack en un coup d'œil

| Composant | Service | Où gérer |
|---|---|---|
| Frontend + API | Cloudflare Workers | dash.cloudflare.com → Workers & Pages → `labocea-pmc-v2` |
| Base de données | Firebase Firestore | console.firebase.google.com → projet `labocea-pmc` |
| Auth utilisateurs | Firebase Auth | idem |
| Photos | Firebase Storage | idem |
| Backup auto | Cloud Scheduler → `gs://labocea-pmc-backups` | console.cloud.google.com |
| Erreurs JS | Sentry | sentry.io → projet labocea-pmc-v2 |
| Notifications push | Firebase FCM | via le Cloudflare Worker (proxy) |

---

## Secrets et variables d'environnement

### En local (`.env.local`)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=labocea-pmc
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Fichier **non versionné** — stocké dans 1Password (coffre Labocea) ou à demander à Tom.

### Dans Wrangler (Cloudflare Workers secrets)
Gérés via `wrangler secret` — visibles dans le dashboard Cloudflare sous "Settings > Variables".

| Secret | Usage |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Envoi notifications push FCM (côté Worker) |
| `VAPID_PRIVATE_KEY` | Web Push (FCM) |
| `SENTRY_DSN` | Remontée erreurs prod |

---

## Déploiement

### Staging (toujours sans risque)
```bash
bash deploy-dev.sh
# → build Vite + wrangler deploy sur labocea-pmc-v2-dev
# URL : https://labocea-pmc-v2-dev.tomkerf.workers.dev
```

### Production
```bash
bash deploy-prod.sh
# → demande confirmation "PROD" avant de déployer
# URL : https://labocea-pmc-v2.tomkerf.workers.dev (ou domaine custom)
```

### Règles Firestore (séparé du déploiement app)
```bash
firebase deploy --only firestore:rules --project labocea-pmc
```
⚠️ `deploy-prod.sh` ne déploie PAS les règles Firestore. À faire manuellement après toute modif de `firestore.rules`.

---

## Rollback

### Rollback applicatif (Cloudflare)
1. Dashboard Cloudflare → Workers → `labocea-pmc-v2` → Deployments
2. Trouver le déploiement précédent → "Rollback to this deployment"
3. Vérifier sur la prod (pas de rebuild nécessaire)

### Rollback via git
```bash
git log --oneline -10          # trouver le bon commit
git checkout <sha> -- .        # restaurer les fichiers
npm run build
wrangler deploy --env production
```

### Rollback règles Firestore
```bash
git show HEAD~1:firestore.rules > firestore.rules  # version précédente
firebase deploy --only firestore:rules --project labocea-pmc
```

---

## Monitoring et alertes

### Sentry
- Tableau de bord : sentry.io → projet `labocea-pmc-v2`
- Alertes configurées sur : JS errors, chunk load failures
- Si spike d'erreurs → regarder la release taguée au déploiement

### Firebase Quota (plan Spark → gratuit)
Limites à surveiller :
- **Firestore reads** : 50 000/jour (gratuit)
- **Storage** : 1 GB stockage / 10 GB téléchargement/jour
- Vérifier : console.firebase.google.com → Usage tab

Si dépassement imminent → migrer vers **plan Blaze** (pay-as-you-go, ~0 coût pour l'usage réel de l'équipe).

---

## Backup

Backup hebdomadaire automatique (Cloud Scheduler, tous les lundis 2h) :
```
gs://labocea-pmc-backups/firestore-backup-YYYY-MM-DD/
```

Vérifier : `gcloud storage ls gs://labocea-pmc-backups/`

Restauration manuelle si besoin :
```bash
gcloud firestore import gs://labocea-pmc-backups/<dossier> --project labocea-pmc
```
⚠️ La restauration écrase les données actuelles. À faire hors-heures.

---

## Gestion des utilisateurs

Comptes créés par un admin dans l'app : `/admin` → "Créer un compte".  
Suppression : Firebase Auth console → Authentication → Users → supprimer l'email.  
Ne pas supprimer le document `users/{uid}` en Firestore sans supprimer le compte Auth (l'utilisateur ne pourrait plus se reconnecter).

---

## Problèmes fréquents

| Symptôme | Cause probable | Action |
|---|---|---|
| "Chunk failed to load" | Cache Cloudflare avec ancien asset | Hard refresh (Ctrl+Shift+R) ou vider le cache KV |
| Données pas à jour après déploiement | onSnapshot encore connecté à l'ancienne version | Fermer et rouvrir l'app |
| Push notifications ne partent pas | Secret FIREBASE_SERVICE_ACCOUNT expiré ou mal configuré | Vérifier dans Cloudflare Workers secrets |
| Firestore : "Missing or insufficient permissions" | Règles pas déployées après modif | `firebase deploy --only firestore:rules --project labocea-pmc` |
| Build échoue (TypeScript) | `npm run build` en local pour diagnostiquer | Corriger les erreurs TS avant de redéployer |

---

## Contacts

| Rôle | Personne | Contact |
|---|---|---|
| Développeur / Admin app | Tom Kerfendal | tomkerf@gmail.com |
| Référent Brest | À désigner | — |
| DSIN Labocea | À confirmer | — |

---

*Dernière mise à jour : 2026-06-30*
