---
name: tester-app
description: Use when preparing to deploy or validate a change on staging for Labocea PMC V2 — covers golden path per module, edge cases, and deploy command.
---

# Tester l'app — Labocea PMC V2

**URL staging :** https://labocea-pmc-v2-dev.tomkerf.workers.dev  
**Deploy staging :** `bash deploy-dev.sh`  
**Tests unitaires :** `npm test`

---

## Checklist avant deploy

### 1. Build + tests

```bash
npm test          # 66 tests — doit être tout vert
npm run build     # doit compiler sans erreur
bash deploy-dev.sh
```

### 2. Authentification

- [ ] Login avec un compte valide → redirige vers dashboard
- [ ] Login avec mauvais mot de passe → message d'erreur visible
- [ ] Déconnexion → retour sur `/login`
- [ ] Accès direct à `/missions` sans être connecté → redirige sur `/login`

### 3. Dashboard (`/`)

- [ ] KPIs s'affichent (missions ce mois, conformité, alertes, à calibrer)
- [ ] Planning du jour présent (ou vide si rien aujourd'hui)
- [ ] Donut chart parc matériel visible
- [ ] Section alertes : métrologie + maintenances urgentes

### 4. Missions (`/missions`)

- [ ] Liste des clients charge correctement
- [ ] Recherche filtre les résultats
- [ ] Clic sur un client → ouvre la fiche
- [ ] Modification d'un champ → auto-save (indicateur "Enregistré")
- [ ] Clic sur un plan → ouvre la fiche plan
- [ ] Saisie d'un prélèvement : changement de statut → s'enregistre
- [ ] Export PDF fiche de vie fonctionne (pas de `document.write` natif)

### 5. Matériel (`/materiel`)

- [ ] Liste des équipements avec filtres catégorie / état
- [ ] Anneau métrologie coloré (vert/orange/rouge)
- [ ] Fiche équipement : modification + auto-save
- [ ] Ajout d'un équipement → apparaît dans la liste

### 6. Métrologie (`/metrologie`)

- [ ] Tableau des vérifications avec statuts colorés
- [ ] Filtre par statut (à jour / à prévoir / en retard)
- [ ] Création d'une vérification → mise à jour `prochainEtalonnage` sur l'équipement

### 7. Maintenances (`/maintenances`)

- [ ] Liste des interventions
- [ ] Création d'une maintenance → statut équipement passe à `en_maintenance`
- [ ] Passage à "réalisée" → équipement repasse à `operationnel`

### 8. Planning (`/planning`)

- [ ] Vue semaine : pills prélèvements + événements
- [ ] Navigation ← → fonctionne
- [ ] Vue mois : points colorés sur les jours actifs
- [ ] Vue jour mobile : swipe gauche/droite

### 9. Mobile (375px)

- [ ] Menu burger s'ouvre et se ferme
- [ ] Formulaires saisissables au touch (targets ≥ 44px)
- [ ] Pas de scroll horizontal parasite

### 10. Admin (`/admin`) — connexion avec compte admin

- [ ] Liste des bugs signalés visible
- [ ] Création d'un compte utilisateur fonctionne

---

## Edge cases à vérifier après chaque grosse feature

| Scénario | Où tester |
|----------|-----------|
| Client avec 0 plans | `/missions/:id` |
| Équipement sans vérification | `/materiel/:id` |
| Prélèvement en retard (status overdue) | Dashboard alertes |
| Deux onglets ouverts sur la même fiche | Bandeau conflit orange |
| Offline (couper le réseau) | Mutations en attente, pas de crash |

---

## Commandes utiles

```bash
bash deploy-dev.sh          # staging
npx wrangler deploy         # PROD — uniquement après validation staging
firebase deploy --only firestore:rules  # règles Firestore seules
npm test                    # tests unitaires
npm run build               # vérif build
```
