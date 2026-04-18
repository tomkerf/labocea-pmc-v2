# CLAUDE.md — Labocea PMC V2

> Document de référence pour le développement de la V2 de l'application Labocea PMC.
> À lire intégralement avant toute action de développement.

---

## 1. Contexte et objectif de l'app

**Labocea PMC** est une application web interne pour l'équipe mesures de Labocea (bureau d'études environnementales, spécialité eau). Elle centralise la gestion opérationnelle quotidienne de l'équipe terrain : suivi des clients/missions, planification et traçabilité des prélèvements, gestion du parc matériel, métrologie des instruments et suivi des maintenances.

**Utilisateurs cibles V2 :** toute l'équipe mesures (techniciens terrain, chargés de mission) — pas seulement Tom. Connexion individuelle par utilisateur.

**Problème résolu :** remplacer les fichiers Excel, carnets papier et emails épars par un outil unique, structuré, accessible depuis le terrain (mobile) et le bureau (desktop).

**URL de référence V1 :**
- Staging : `labocea-pmc-dev.tomkerf.workers.dev`
- Production : `labocea-pmc.tomkerf.workers.dev`

---

## 2. Ce qui est conservé de la V1

### Fonctionnalités maintenues

- Gestion des clients et missions (création, édition, archivage)
- Gestion des plans de prélèvement par client et par site
- Planification et suivi des échantillonnages (statut, dates, rapport)
- Gestion du parc matériel (équipements, instruments de terrain)
- Métrologie (suivi des vérifications et étalonnages des instruments)
- Suivi des maintenances (interventions planifiées et correctives)
- Auto-save (sauvegarde automatique à chaque modification)
- Cache local (fonctionnement hors connexion partielle)

### Structure de données conservée

Toute la structure Firestore V2 (`clients-v2/{clientId}`) est reprise telle quelle. Pas de migration de données supplémentaire.

### Stack technique conservée

- **Backend :** Cloudflare Workers (serverless)
- **Base de données :** Firebase Firestore
- **Déploiement :** Wrangler CLI (`npx wrangler deploy`)
- **Script staging :** `bash deploy-dev.sh`

---

## 3. Ce qui change en V2

### Multi-utilisateurs

| Aspect | V1 | V2 |
|--------|----|----|
| Authentification | Aucune (accès libre) | Firebase Auth (email/password) |
| Utilisateurs | Tom uniquement | Toute l'équipe mesures |
| Attribution | Préleveur codé en dur ("THK") | Utilisateur connecté |
| Logs de modification | Champ `by` saisi manuellement | Uid Firebase automatique |
| Firestore rules | Peu restrictives | Règles par utilisateur authentifié |

### Design system — refonte complète (Apple-style)

Le design V1 est fonctionnel mais visuellement dense et non cohérent. La V2 adopte un design system inspiré des applications Apple (macOS/iOS) : épuré, aéré, typographie claire, composants natifs-looking, palette neutre avec accents sobres.

Voir section 6 pour les tokens et composants détaillés.

### Framework frontend

| V1 | V2 |
|----|-----|
| Vue.js (SPA vanilla dans index.html) | React + Vite avec composants modulaires |
| JavaScript | TypeScript strict |
| CSS ad hoc | Tailwind CSS (utility-first) |
| Pas de routing client | React Router v6 |
| Pas d'état global | Zustand (store léger) |

**Raison du changement :** React + Vite offre un meilleur écosystème de composants Apple-style, un routing natif, et une architecture scalable pour l'équipe. TypeScript est ajouté pour la maintenabilité à plusieurs développeurs.

### Librairies UI autorisées

- **shadcn/ui** — composants copy-paste (pas de lock-in, pas de bundle imposé). À utiliser pour les composants complexes : Dialog, Select, Popover, Toast, Command. Ne pas surcharger : les composants simples (boutons, inputs, badges) restent en Tailwind maison.
- **Framer Motion** — animations de transition entre pages et micro-interactions (entrée de cartes, ouverture de modals). Usage **limité** : max 3-4 animations par page, durées 150-300ms, pas d'effets décoratifs gratuits.
- **Lucide React** — icônes uniquement. Pas d'autre bibliothèque d'icônes.

**Pas autorisé :** MUI, Ant Design, Chakra, Radix standalone, React Spring, GSAP.

---

## 4. Architecture des pages V2

### Navigation principale

Sidebar fixe (desktop) / Tab bar bottom (mobile) avec 5 sections :

```
📋 Missions      → Clients, plans, prélèvements
🔧 Matériel      → Parc équipements terrain
📐 Métrologie    → Vérifications et étalonnages
🔨 Maintenances  → Interventions planifiées et correctives
👤 Mon compte    → Profil utilisateur, préférences
```

---

### Page : Missions (`/missions`)

**Objectif :** vue centrale de toutes les missions clients en cours, planification des prélèvements.

**Contenu :**
- Liste des clients actifs (nom, segment, technicien assigné, prochaine intervention)
- Filtres : par technicien, par statut, par mois, par site
- Indicateurs visuels : prélèvements en retard, rapports dus
- Bouton "Nouveau client"

**Sous-pages :**

- **`/missions/:clientId`** — Fiche client complète
  - Informations administratives (interlocuteur, contrat, devis, budget)
  - Liste des plans de prélèvement
  - Historique des prélèvements

- **`/missions/:clientId/plan/:planId`** — Fiche plan de prélèvement
  - Configuration du plan (fréquence, nature eau, méthode, GPS)
  - Calendrier des prélèvements de l'année
  - Statut par prélèvement (planifié / fait / en retard / non effectué)
  - Suivi des rapports

---

### Page : Matériel (`/materiel`)

**Objectif :** inventaire et suivi du parc matériel terrain.

**Contenu :**
- Liste des équipements (nom, marque, modèle, numéro de série, état)
- Filtres : par catégorie, par état (disponible / en mission / en maintenance)
- Indicateurs : équipements dont la vérification métrologique approche
- Bouton "Ajouter équipement"

**Sous-pages :**

- **`/materiel/:equipementId`** — Fiche équipement
  - Informations techniques (marque, modèle, N° série, date acquisition)
  - Catégorie (multiparamètre, turbidimètre, préleveur automatique, débitmètre, pH-mètre, conductimètre, autre)
  - Localisation actuelle (labo, terrain, prêt à un tiers)
  - Historique des maintenances
  - Historique des vérifications métrologiques
  - Documents associés (notice, certificat d'étalonnage)

---

### Page : Métrologie (`/metrologie`)

**Objectif :** suivi des vérifications périodiques et étalonnages des instruments de mesure (conformité COFRAC et interne).

**Contenu :**
- Tableau de tous les équipements métrологisables
- Colonnes : équipement, type de vérification, dernière date, prochaine date, statut (à jour / à prévoir / en retard)
- Filtre par statut, par mois d'échéance
- Vue calendrier (optionnelle)

**Sous-pages :**

- **`/metrologie/nouveau`** — Saisir une vérification
  - Équipement concerné (sélection)
  - Type (étalonnage interne / vérification externe / contrôle terrain)
  - Date, résultat (conforme / non-conforme), remarques
  - Prochain contrôle prévu

- **`/metrologie/:verificationId`** — Fiche vérification
  - Détail complet de la vérification
  - Document PDF associé (certificat)
  - Technicien ayant réalisé la vérification

---

### Page : Maintenances (`/maintenances`)

**Objectif :** planifier et tracer les interventions de maintenance préventive et corrective sur les équipements.

**Contenu :**
- Liste des interventions (planifiées et réalisées)
- Colonnes : équipement, type (préventive/corrective), date prévue, date réalisée, statut, technicien
- Filtres : par équipement, par type, par statut
- Bouton "Nouvelle intervention"

**Sous-pages :**

- **`/maintenances/:maintenanceId`** — Fiche intervention
  - Équipement concerné
  - Type (préventive / corrective / panne)
  - Date et durée d'intervention
  - Description du problème / travaux réalisés
  - Pièces remplacées (liste libre)
  - Technicien responsable
  - Statut (planifiée / en cours / réalisée / abandonnée)
  - Coût (optionnel)

---

### Page : Mon compte (`/compte`)

**Objectif :** gestion du profil utilisateur.

**Contenu :**
- Nom, prénom, initiales (utilisées comme "préleveur" dans les plans)
- Email (lecture seule, depuis Firebase Auth)
- Rôle (technicien / chargé de mission / admin) — affiché, géré par admin
- Préférences (affichage, vue par défaut)
- Bouton déconnexion

---

### Page : Tableau de bord (`/` → redirect selon rôle)

**Objectif :** vue synthétique à l'ouverture de l'app. Premier écran vu chaque matin par le technicien.

**Contenu :**

*En-tête personnalisée*
- Salutation dynamique : "Bonjour [Prénom] 👋" + date du jour
- Sous-titre contextuel : "X interventions prévues aujourd'hui"

*Bloc KPIs (4 chiffres en ligne)*
- Missions réalisées ce mois (avec delta vs mois précédent)
- Taux de conformité métrologique (%)
- Alertes actives (nombre)
- Équipements à calibrer cette semaine

*Planning du jour (liste timeline)*
- Interventions du jour triées par heure
- Chaque ligne : heure — client/site — type — badge statut (En cours / À faire / Validé)
- Lien vers la fiche mission concernée
- Bouton flottant (+) pour ajouter une intervention

*État du matériel (résumé 4 compteurs)*
- En service / À calibrer / En panne / SAV
- Lien "Voir tout" → `/materiel`

*Alertes importantes*
- Métrologie : équipements dont l'étalonnage est dû dans les 7 jours
- Maintenance : interventions en attente ou en cours
- Chaque alerte : icône couleur + description + lien vers la ressource concernée

*Activité récente*
- 5 dernières actions de l'équipe (qui, quoi, quand)

---

## 5. Structure de la base de données

### Firebase Firestore — Collections V2

#### `users/{uid}`
```
uid           string    (Firebase Auth uid)
prenom        string    "Thomas"
nom           string    "Kerfendal"
initiales     string    "THK"
email         string    "tom@labocea.fr"
role          string    "technicien" | "charge_mission" | "admin"
createdAt     timestamp
lastLoginAt   timestamp
```

#### `clients-v2/{clientId}`
```
id            string    (auto-generated)
annee         string    "2026"
nom           string    "Plounerin"
numClient     string
nouvelleDemande string  "Annuelle" | "Avenant" | "Ponctuelle"
interlocuteur string
telephone     string
mobile        string
email         string
fonction      string
mission       string    (description libre)
segment       string    "Réseaux de mesure" | "AEP" | "Eaux usées" | ...
numDevis      string
numConvention string
preleveur     string    (initiales technicien assigné)
dureeContrat  string    "12 mois" | ...
periodeIntervention string
sites         string[]  ["Quimper", "Kerambris", ...]
montantTotal  number
partPMC       number
partSousTraitance number
plans         Plan[]
_v2ts         timestamp (migration marker)
createdBy     string    (uid)
updatedBy     string    (uid)
updatedAt     timestamp
```

#### Plan (objet imbriqué dans `clients-v2/{clientId}.plans[]`)
```
id            string
nom           string
siteNom       string
frequence     string    "Mensuel" | "Bimensuel" | "Semestriel" | "Trimestriel" | "Annuel"
meteo         string    "pluie" | ""
nature        string    "Eau usée" | "Rivière" | "Souterraine" | "AEP" | "Marine"
methode       string    "Ponctuel" | "Composite" | "Automatique"
lat           string
lng           string
gpsApprox     boolean
customMonths  number[]
bimensuelMonths number[]
defaultDay    number
customDays    object    { "0": 15, "3": 22, ... }
samplings     Sampling[]
```

#### Sampling (objet imbriqué dans `Plan.samplings[]`)
```
id            string
num           number
plannedMonth  number    (0-11)
plannedDay    number
status        string    "planned" | "done" | "overdue" | "non_effectue"
doneDate      string    "2026-03-25" | ""
comment       string
nappe         string    "haute" | "basse" | ""
rapportPrevu  boolean
rapportDate   string
tente         boolean
reportHistory ReportHistory[]
doneBy        string    (uid du technicien ayant effectué le prélèvement)
```

#### ReportHistory (objet imbriqué dans `Sampling.reportHistory[]`)
```
from    string
to      string
by      string    (uid)
reason  string
at      string    (ISO timestamp)
```

---

#### `equipements/{equipementId}` ← NOUVELLE COLLECTION
```
id            string
nom           string    "YSI Pro30"
marque        string    "YSI"
modele        string    "Pro30"
numSerie      string    "A123456"
categorie     string    "multiparametre" | "turbidimetre" | "preleveur_auto" | "debitmetre" | "ph_metre" | "conductimetre" | "autre"
dateAcquisition date
etat          string    "operationnel" | "en_maintenance" | "hors_service" | "prete"
localisation  string    "labo" | "terrain" | "externe"
notes         string
prochainEtalonnage date
createdBy     string    (uid)
updatedAt     timestamp
```

#### `verifications/{verificationId}` ← NOUVELLE COLLECTION
```
id                string
equipementId      string    (ref → equipements)
equipementNom     string    (dénormalisé pour affichage)
type              string    "etalonnage_interne" | "verification_externe" | "controle_terrain"
date              date
resultat          string    "conforme" | "non_conforme" | "a_reprendre"
remarques         string
prochainControle  date
technicienUid     string    (uid)
technicienNom     string    (dénormalisé)
documentUrl       string    (URL PDF certificat, optionnel)
createdAt         timestamp
```

#### `maintenances/{maintenanceId}` ← NOUVELLE COLLECTION
```
id                string
equipementId      string    (ref → equipements)
equipementNom     string    (dénormalisé)
type              string    "preventive" | "corrective" | "panne"
statut            string    "planifiee" | "en_cours" | "realisee" | "abandonnee"
datePrevue        date
dateRealisee      date | null
dureeHeures       number | null
description       string
travauxRealises   string
piecesRemplacees  string
technicienUid     string    (uid)
technicienNom     string    (dénormalisé)
cout              number | null
createdAt         timestamp
updatedAt         timestamp
```

---

## 6. Design system — Apple-style

### Philosophie

Inspiré de macOS Sequoia et iOS 18 : espacement généreux, hiérarchie typographique claire, composants sans surcharge décorative, feedbacks d'état subtils. Zéro bruit visuel. Chaque élément à l'écran doit justifier sa présence.

### Palette de couleurs (tokens CSS)

```css
/* Fonds */
--color-bg-primary:    #F5F5F7;   /* gris très clair — fond app */
--color-bg-secondary:  #FFFFFF;   /* blanc — cartes, panneaux */
--color-bg-tertiary:   #F0F0F2;   /* gris léger — inputs, zones secondaires */

/* Texte */
--color-text-primary:  #1D1D1F;   /* noir Apple */
--color-text-secondary:#6E6E73;   /* gris secondaire */
--color-text-tertiary: #AEAEB2;   /* gris clair — placeholder, hint */

/* Accents */
--color-accent:        #0071E3;   /* bleu Apple — actions primaires */
--color-accent-hover:  #0077ED;
--color-accent-light:  #E8F1FB;   /* fond badge accent */

/* Statuts — sobres */
--color-success:       #34C759;   /* vert Apple */
--color-success-light: #EAF8EE;
--color-warning:       #FF9F0A;   /* orange Apple */
--color-warning-light: #FFF4E3;
--color-danger:        #FF3B30;   /* rouge Apple */
--color-danger-light:  #FFEEED;
--color-neutral:       #8E8E93;   /* gris — statut neutre */

/* Séparateurs */
--color-border:        #D2D2D7;   /* bordure légère */
--color-border-subtle: #E5E5EA;   /* bordure très subtile */

/* Ombres */
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-modal: 0 20px 60px rgba(0,0,0,0.15);
```

### Typographie

```css
/* Stack système — natif sur macOS/iOS */
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;

/* Échelle */
--text-xs:   11px;   /* labels, badges */
--text-sm:   13px;   /* corps secondaire, metadata */
--text-base: 15px;   /* corps principal */
--text-md:   17px;   /* titre section */
--text-lg:   20px;   /* titre page */
--text-xl:   28px;   /* titre grand */

/* Graisse */
--font-regular:  400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;

/* Hauteur de ligne */
--leading-tight:  1.2;
--leading-normal: 1.4;
--leading-relaxed: 1.6;
```

### Espacements

```css
/* Basé sur une grille de 4px */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Rayons de bordure

```css
--radius-sm:  6px;    /* inputs, tags */
--radius-md:  10px;   /* cartes */
--radius-lg:  14px;   /* modals, panneaux */
--radius-xl:  20px;   /* grandes sections */
--radius-full: 9999px; /* pills, badges */
```

### Composants UI clés

#### Bouton primaire
```
Background: var(--color-accent)
Text: white, 15px, font-medium
Padding: 10px 20px
Border-radius: var(--radius-sm)
Hover: légèrement plus clair (--color-accent-hover)
Active: scale 0.98
Pas de box-shadow excessive
```

#### Bouton secondaire
```
Background: var(--color-bg-tertiary)
Text: var(--color-text-primary), 15px, font-medium
Border: 1px solid var(--color-border)
Même géométrie que primaire
```

#### Input / Champ texte
```
Background: var(--color-bg-secondary)
Border: 1px solid var(--color-border)
Border-radius: var(--radius-sm)
Padding: 9px 12px
Font-size: 15px
Focus: border-color var(--color-accent), pas de box-shadow colorée excessive
Placeholder: var(--color-text-tertiary)
```

#### Carte (Card)
```
Background: var(--color-bg-secondary)
Border: 1px solid var(--color-border-subtle)
Border-radius: var(--radius-md)
Box-shadow: var(--shadow-card)
Padding: var(--space-5) var(--space-6)
Pas de header coloré, pas de dégradé
```

#### Badge / Tag statut
```
Display: inline-flex, align-items center, gap 4px
Padding: 3px 10px
Border-radius: var(--radius-full)
Font-size: 12px, font-medium
Icône SF Symbol ou emoji minimaliste (•)

Conforme / Fait :     bg --color-success-light, text --color-success
À prévoir / Planifié : bg --color-warning-light, text --color-warning
En retard / Critique : bg --color-danger-light, text --color-danger
Neutre :              bg --color-bg-tertiary, text --color-text-secondary
```

#### Tableau de données
```
Header: text-secondary, text-xs, font-semibold, uppercase, letter-spacing 0.04em
Lignes: séparées par un border-bottom subtle (--color-border-subtle)
Hover ligne: bg --color-bg-tertiary
Pas de fond coloré sur les headers
Densité : padding-y var(--space-3), padding-x var(--space-4)
```

#### Navigation sidebar (desktop)
```
Largeur: 220px fixe
Background: rgba(255,255,255,0.8) avec backdrop-filter blur(12px)
Border-right: 1px solid var(--color-border-subtle)
Items: icon + label, 14px, padding var(--space-3) var(--space-4)
Item actif: bg --color-accent-light, text --color-accent, border-radius var(--radius-sm)
Logo/titre app: en haut, 17px, font-semibold
```

#### Navigation tab bar (mobile, bottom)
```
5 icônes + labels
Background: rgba(255,255,255,0.9) avec backdrop-filter blur
Border-top: 1px solid var(--color-border-subtle)
Safe area bottom padding
Item actif: icône + label en --color-accent
```

#### Modal / Drawer
```
Overlay: rgba(0,0,0,0.3) (pas noir total)
Panneau: bg white, border-radius --radius-lg en haut
Shadow: var(--shadow-modal)
Header modal: titre 17px semibold, bouton fermer (×) à droite
Animation: slide-up 200ms ease-out (mobile), fade + scale (desktop)
```

#### Anneau de progression métrologique (CircleProgress)
```
Composant SVG — cercle avec stroke-dasharray animé
Taille: 40×40px (liste matériel) / 64×64px (fiche équipement)
Track: --color-border, stroke-width 3
Fill: couleur selon % restant avant échéance
  ≥ 60% : --color-success   (vert — étalonnage récent)
  30–59% : --color-warning  (orange — à surveiller)
  < 30% : --color-danger    (rouge — calibration urgente)
Centre: % affiché en text-xs font-semibold
Usage: liste /materiel (colonne "Prochaine métrologie") et fiche équipement
```

#### Carte KPI (StatCard)
```
Background: --color-bg-secondary
Border: 1px solid --color-border-subtle
Border-radius: --radius-md
Padding: --space-5
Chiffre principal: text-xl, font-bold, --color-text-primary
Label: text-sm, --color-text-secondary
Delta (optionnel): text-xs, vert si positif, rouge si négatif, avec flèche ↑↓
```

#### Ligne timeline planning
```
Heure: text-sm, font-semibold, --color-accent, largeur fixe 50px
Trait vertical: 1px --color-border-subtle, connecte les lignes
Contenu: nom client + site en text-base, type en text-sm --color-text-secondary
Badge statut: à droite, pill coloré
Tap/Click: navigate vers la mission
```

### Règles de design globales

1. **Jamais deux fonds différents côte à côte sans séparateur.** Un seul niveau de fond coloré par vue.
2. **Espacement vertical généreux.** Minimum `--space-5` entre les sections.
3. **Pas de texte en gras partout.** La hiérarchie vient des tailles, pas des graisses.
4. **Les icônes sont monochromes.** Lucide React, stroke-width 1.5, taille 18-20px.
5. **Aucun composant ne doit "crier".** Les actions destructrices sont cachées derrière une confirmation.
6. **Les tableaux n'ont pas de bordures épaisses.** Séparateurs seulement horizontaux.
7. **Les couleurs de statut sont dans des badges, jamais sur fond de ligne entière.**

---

## 7. Roadmap d'implémentation

### Étape 0 — Initialisation du projet
- [ ] `npm create vite@latest labocea-pmc-v2 -- --template react-ts`
- [ ] Installer : `react-router-dom`, `zustand`, `lucide-react`, `tailwindcss`, `framer-motion`
- [ ] Installer et configurer shadcn/ui : `npx shadcn-ui@latest init`
- [ ] Configurer Tailwind avec les tokens CSS du design system (section 6)
- [ ] Mettre en place Firebase SDK (Auth + Firestore)
- [ ] Configurer Wrangler pour Cloudflare Workers (serveur + proxy API)
- [ ] Créer les scripts `deploy-dev.sh` et `deploy-prod.sh`
- [ ] Définir les règles Firestore (auth requise, lecture/écriture propre par rôle)

### Étape 1 — Authentification
- [ ] Page `/login` : email + password, design Apple (pas de surcharge)
- [ ] Firebase Auth integration (signIn, signOut, onAuthStateChanged)
- [ ] Store Zustand `useAuthStore` : user, uid, role, initiales
- [ ] Route guard : redirect vers `/login` si non authentifié
- [ ] Page `/compte` : affichage profil, bouton logout
- [ ] Collection `users/{uid}` : création au premier login, mise à jour initiales/rôle

### Étape 2 — Layout et navigation
- [ ] Composant `AppLayout` : sidebar (desktop) + tab bar (mobile)
- [ ] Composant `Sidebar` avec les 5 sections
- [ ] Composant `TabBar` responsive (visible mobile seulement)
- [ ] Transitions de page (fade simple, 150ms)
- [ ] Composant `TopBar` : titre page + actions contextuelles

### Étape 3 — Module Missions (migration V1)
- [ ] Page `/missions` : liste clients avec filtres
- [ ] Composant `ClientCard` : nom, segment, prochain prélèvement, statuts
- [ ] Page `/missions/:clientId` : fiche client complète
- [ ] Page `/missions/:clientId/plan/:planId` : fiche plan avec calendrier prélèvements
- [ ] Formulaire création/édition client (`ClientForm`)
- [ ] Formulaire création/édition plan (`PlanForm`)
- [ ] Formulaire saisie prélèvement (`SamplingForm`) : date, statut, nappe, rapport
- [ ] Lire depuis `clients-v2/{clientId}` (Firestore Phase 2)
- [ ] Écrire dans `clients-v2/{clientId}` avec `updatedBy` = uid connecté
- [ ] Auto-save (debounce 800ms)

### Étape 4 — Module Matériel
- [ ] Page `/materiel` : liste équipements, filtres par catégorie/état
- [ ] Composant `EquipementCard`
- [ ] Page `/materiel/:equipementId` : fiche détaillée
- [ ] Formulaire ajout/édition équipement (`EquipementForm`)
- [ ] Indicateur visuel étalonnage proche (< 30 jours)
- [ ] Liaison avec vérifications et maintenances (affichage historique)

### Étape 5 — Module Métrologie
- [ ] Page `/metrologie` : tableau de bord vérifications
- [ ] Composant `VerificationRow` : statut coloré, dates, technicien
- [ ] Formulaire saisie vérification (`VerificationForm`)
- [ ] Page `/metrologie/:verificationId` : fiche détail
- [ ] Calcul automatique statut (à jour / à prévoir dans 30j / en retard)
- [ ] Mise à jour `prochainEtalonnage` dans `equipements/{id}` après chaque vérification

### Étape 6 — Module Maintenances
- [ ] Page `/maintenances` : liste interventions
- [ ] Composant `MaintenanceRow`
- [ ] Formulaire création/édition maintenance (`MaintenanceForm`)
- [ ] Page `/maintenances/:maintenanceId` : fiche détail
- [ ] Changement de statut équipement automatique (en_maintenance si maintenance en cours)

### Étape 7 — Tableau de bord
- [ ] Page `/` : synthèse multi-modules
- [ ] Composant `GreetingHeader` : salutation + date + résumé du jour
- [ ] Composant `StatCard` : KPI avec delta vs période précédente
- [ ] Composant `DayTimeline` : planning du jour en vue liste chronologique
- [ ] Composant `EquipementStatusSummary` : 4 compteurs (En service / À calibrer / En panne / SAV)
- [ ] Composant `AlertsSection` : métrologie et maintenance urgentes avec liens
- [ ] Composant `RecentActivity` : flux des 5 dernières actions équipe

### Étape 8 — Responsive mobile & polish
- [ ] Vérifier tous les composants sur mobile (375px → 428px)
- [ ] Optimiser les formulaires pour saisie tactile (touch targets ≥ 44px)
- [ ] Test offline (cache Firestore)
- [ ] Accessibilité de base (focus visible, labels, contrast)
- [ ] Favicon + manifest PWA (optionnel)

### Étape 9 — Déploiement et validation
- [ ] Déployer staging : `bash deploy-dev.sh`
- [ ] Valider avec l'équipe sur staging (1 semaine)
- [ ] Migrer les données V1 restantes si nécessaire
- [ ] Déployer production : `npx wrangler deploy`
- [ ] Archiver V1 (ne pas supprimer)

---

## Notes de développement

- **Toujours tester sur staging avant prod.** Ne jamais déployer directement en prod.
- **Ne jamais supprimer `clients` (collection V1).** Elle reste comme archive permanente.
- **Langue UI : français.** Tous les labels, messages d'erreur, confirmations.
- **Les dates sont en format français** : `DD/MM/YYYY` à l'affichage, ISO 8601 en base.
- **Les montants sont en euros**, sans décimale à l'affichage.
- **TypeScript strict.** Pas de `any`, interfaces explicites pour tous les types Firestore.
- **Icônes : Lucide React uniquement.** Pas de mélange de bibliothèques d'icônes.
- **UI : Tailwind + composants maison + shadcn/ui pour les composants complexes.** Pas de MUI, Ant Design, Chakra.
- **Framer Motion : usage limité.** Transitions de page, entrée de listes, ouverture de modals. Pas d'animations décoratives.
- **Zustand pour l'état global** : un store par domaine (`useAuthStore`, `useMissionsStore`, `useEquipementsStore`).
- **Pas de dark mode en V2.** Reporté à V3 si adoption confirmée par l'équipe.
- **Firestore : lire avec `onSnapshot`** pour les pages principales (temps réel). Lecture simple (`getDoc`) pour les fiches détail.

---

*Document généré le 2026-04-18 — Version de référence pour le développement V2.*
