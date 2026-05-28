# Spec — Alignement de l'App sur le fichier Excel de Cindy

**Date :** 2026-05-28  
**Statut :** En cours de validation / Prêt pour le dev  

---

## Contexte

Cindy (chargée de mission, rôle `charge_mission`) utilise historiquement un classeur Excel très complet (`PMC- Planning 2026.xlsx`) composé de 4 feuilles principales (*Base de travail*, *Liste clients*, *Planning Brest*, *Planning Quimper*). 

Pour que l'équipe puisse **abandonner complètement le fichier Excel** au profit de l'application Labocea PMC V2, nous devons combler les quelques écarts de données identifiés entre la structure de l'Excel et l'application.

---

## 1. Données à intégrer dans le modèle de données (Types & Firestore)

### 📋 Partie Administrative & Facturation (Niveau `Client`)

Nous devons ajouter de nouveaux champs optionnels dans la structure `Client` (dans `src/types/index.ts`) et dans les documents de la collection Firestore `clients-v2` :

* **`numBC`** (`string`) : Numéro du Bon de Commande (très suivi par Cindy pour le suivi budgétaire).
* **`modeFacturation`** (`string`) : Modalités et type de facturation (ex: "Facturation mensuelle", "A la prestation", "Facture unique en fin d'année").
* **`situationActuelle`** (`string`) : Commentaire libre sur la situation administrative ou l'avancement global du dossier (ex: *"Convention envoyée"*, *"En attente signature"*, *"Ne pas relancer"*).
* **`contactPrevenance`** (`string`) : Coordonnées (nom, téléphone, email) de la personne ou du service à appeler chez le client pour les prévenir d'une intervention sur le terrain (ex: *"Prévenir M. Dupont 24h avant"*).

### 📐 Partie Agrément & Opérationnelle (Niveau `Plan`)

Chaque point de prélèvement (plan de prélèvement) possède des attributs clés qui doivent être enrichis au niveau de l'objet `Plan` (dans `src/types/index.ts`) :

* **`cofrac`** (`boolean`) : Indicateur déterminant si le prélèvement sur ce point est sous accréditation COFRAC ou non (très critique pour la traçabilité réglementaire).
* **`contraintesParticulieres`** (`string`) : Zone de texte libre pour l'accès terrain, codes barrières ou contraintes d'échantillonnage particulières (ex: *"Botte de rigueur, clef n°4 requise"*).

---

## 2. Intégrations Visuelles (Interface Utilisateur)

### ✍️ Édition des données (`ClientPage` / `PlanPage`)

1. **Fiche Client (`ClientInfoForm.tsx`)** :
   - Ajouter une nouvelle section **"Facturation & Suivi"** contenant les champs éditables :
     - *N° Bon de commande (BC)* (input texte)
     - *Mode de facturation* (input texte)
     - *Situation actuelle / Avancement* (input texte)
   - Ajouter un champ **"Contact Prévenance Client"** dans la section *Contact*.

2. **Formulaire de Plan (`PlanForm.tsx` ou modal de configuration de plan dans `ClientPlans.tsx`)** :
   - Ajouter un switch (ou checkbox) **"Prélèvement accrédité COFRAC"** (styles Apple-style sobres).
   - Ajouter un champ **"Contraintes d'accès / Remarques terrain"** (textarea ou input texte).

### 📋 Affichages ergonomiques

1. **Dashboard & Planning (Vues Calendrier et Timelines)** :
   - Afficher un badge **`COFRAC`** très sobre et lisible (par exemple, texte gris foncé sur fond gris clair, ou bleu très clair/bleu roi discret) à côté des plans de prélèvement accrédités COFRAC dans les timelines et les plannings quotidiens.
   
2. **Listes détaillées** :
   - Afficher l'indicateur COFRAC sous forme de petite puce dans les widgets d'alertes ou dans la liste des clients.

---

## 3. Éléments non retenus pour le moment (Hors Scope V2)

* **Les colonnes de paramètres ultra-détaillés** (`MPR1` à `MPR6`, `Collecte`, `Boues/sdt`, `coquillages`, `Débit`, `Autres`) : Ces données techniques de facturation restent documentées de façon libre dans le grand champ de description textuelle **"Mission"** de la fiche client pour ne pas surcharger la base de données.
