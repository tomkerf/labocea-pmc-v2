# Labocea PMC V2

> Application web interne de gestion opérationnelle pour l'équipe mesures de Labocea — bureau d'études environnementales spécialisé en analyses d'eau.

[![React](https://img.shields.io/badge/React_19-TypeScript-blue?logo=react)](https://react.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Deployed_on-Cloudflare_Workers-orange?logo=cloudflare)](https://workers.cloudflare.com)
[![Firebase](https://img.shields.io/badge/Backend-Firebase_Firestore-yellow?logo=firebase)](https://firebase.google.com)

**[→ Demo staging](https://labocea-pmc-dev.tomkerf.workers.dev)**

---

## Contexte

L'équipe mesures de Labocea gère quotidiennement des dizaines de missions terrain : prélèvements d'eau (réseaux AEP, eaux usées, rivières, nappes), suivi métrologique des instruments de mesure, maintenance du parc matériel. Tout cela était géré via des fichiers Excel, carnets papier et emails.

PMC V2 centralise l'ensemble dans un outil unique, accessible depuis le terrain (mobile) et le bureau (desktop).

## Fonctionnalités principales

| Module | Description |
|--------|-------------|
| **Missions** | Plans de prélèvement par client/site, calendrier annuel, matrice annuelle avec groupement par client |
| **Planning** | Vues jour/semaine/mois, tournée du jour GPS, overlay météo et jours fériés, export iCal |
| **Matériel** | Inventaire parc terrain, fiches équipement avec galerie photo et GPS |
| **Métrologie** | Tableau de bord étalonnages, alertes automatiques d'échéance |
| **Maintenances** | Interventions préventives et correctives, historique par équipement |
| **Rapports** | Suivi des rapports à rédiger, widget dashboard, export PDF/XLSX |
| **Tâches** | Todo list style Apple Reminders avec priorités et liaison missions |
| **Dashboard** | KPIs journaliers, planning du jour, alertes, suivi équipe (CM/admin) |

### Missions & planification
- Suivi des clients et missions (création, édition, archivage)
- Plans de prélèvement par client et par site (fréquence, méthode, GPS)
- Calendrier des prélèvements avec statuts (planifié / fait / en retard / non effectué)
- Vues planning : jour, semaine, mois — avec overlay météo et jours fériés
- Suivi des rapports et historique des reports
- Auto-save (debounce 800ms)

### Matériel
- Inventaire du parc terrain (multiparamètres, turbidimètres, préleveurs automatiques, débitmètres…)
- Suivi état et localisation de chaque équipement
- Liaison avec métrologie et maintenances

### Métrologie
- Tableau de bord des vérifications périodiques et étalonnages
- Calcul automatique du statut (à jour / à prévoir / en retard)
- Traçabilité des certificats et techniciens

### Maintenances
- Interventions préventives et correctives
- Suivi statut (planifiée / en cours / réalisée)
- Historique par équipement

### Tableau de bord
- KPIs journaliers (missions, conformité métrologique, alertes)
- Planning du jour en vue timeline
- Alertes métrologie et maintenance urgentes
- Activité récente de l'équipe

### Administration
- Gestion des utilisateurs (rôles : technicien / chargé de mission / admin)
- Signalement de bugs in-app

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router v7 |
| State | Zustand |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Icônes | Lucide React |
| Backend | Firebase Auth + Firestore |
| Déploiement | Cloudflare Workers (Wrangler) |
| Exports | jsPDF, XLSX |

## Architecture

```
src/
├── components/       # Composants UI réutilisables
├── hooks/            # Custom hooks (Firestore, auth, métier)
├── pages/            # Pages par module
│   ├── PlanningPage/ # Planning + vues jour/semaine/mois
│   ├── ClientPage/   # Fiche client + plans
│   ├── PlanPage/     # Fiche plan + prélèvements
│   ├── EquipementPage/
│   ├── MetrologiePage/
│   ├── MaintenancePage/
│   └── AdminPage/
├── services/         # Accès Firestore
├── stores/           # Zustand stores (auth, missions…)
├── types/            # Interfaces TypeScript (Firestore)
└── lib/              # Utilitaires
```

## Sécurité

- Authentification Firebase Auth (email/password)
- Firestore rules : accès restreint aux utilisateurs authentifiés
- Route guards : `RequireAuth` + `RequireAdmin`
- Détection d'écriture concurrente (bandeau d'alerte si un autre utilisateur modifie simultanément)

## Environnements

| Env | URL |
|-----|-----|
| Staging | `labocea-pmc-dev.tomkerf.workers.dev` |
| Production | `labocea-pmc.tomkerf.workers.dev` |

## Installation (développement local)

```bash
npm install
cp .env.example .env          # renseigner les clés Firebase
npm run dev
```

## Déploiement

```bash
bash deploy-dev.sh            # staging
npx wrangler deploy           # production (après validation staging)
```

## Conventions

- Langue UI : **français**
- Dates : `DD/MM/YYYY` à l'affichage, ISO 8601 en base
- TypeScript strict — pas de `any`
- Toujours tester sur staging avant prod
- Ne jamais supprimer la collection `clients` (archive V1)

---

*Développé par Tom Kerfendal — Labocea, 2026*
