# Walkthrough — Carte Interactive des Tournées (Feature 1)

Ce document résume l'implémentation et fournit les instructions pour valider et déployer la nouvelle vue **Carte des Tournées** dans le module Planning.

---

## 🛠️ Ce qui a été accompli

### 1. Modèle de données & Types
* **Coordonnées GPS** : Les propriétés `lat?: string` et `lng?: string` ont été ajoutées à l'interface `PlanningEvent` dans [planningUtils.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/lib/planningUtils.ts).
* **Population automatique** : Dans [usePlanningData.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/hooks/usePlanningData.ts), les coordonnées GPS configurées sur chaque plan de prélèvement sont désormais indexées et intégrées en temps réel dans les événements du planning.
* **Option de vue** : `'carte'` a été ajouté à l'union de types `ViewMode` pour structurer la navigation.

### 2. Interface Utilisateur & Intégration
* **En-tête de navigation** : Intégration d'un 4ème onglet **"Carte"** dans le sélecteur de vue de [PlanningHeader.tsx](file:///Users/thomaskerfendal/components/planning/PlanningHeader.tsx) (**Jour / Semaine / Mois / Carte**).
* **Composant MapView** ([MapView.tsx](file:///Users/thomaskerfendal/components/planning/MapView.tsx)) :
  - **Carte Leaflet** interactive fluide utilisant les tuiles épurées *CartoDB Voyager* (cohérentes avec le design system minimaliste Apple).
  - **Épingles personnalisées** en SVG dynamique : colorées aux couleurs attribuées au technicien (et vertes si l'intervention est réalisée) avec affichage du numéro de séquence de la tournée.
  - **Panneau de tournée (Desktop)** : Barre latérale gauche listant les interventions ordonnées du jour. Cliquer sur un élément centre la carte et ouvre le popup.
  - **Panneau de tournée (Mobile)** : Défilement horizontal fluide de cartes d'intervention en overlay au bas de l'écran (style natif Apple Maps).
  - **Popup intelligent** : Affiche les détails de l'intervention avec un bouton d'action directe pour lancer le guidage GPS (itinéraire Google Maps/Waze) et un bouton d'accès à la fiche détaillée.
  - **Fallback GPS** : Section dédiée listant les points planifiés n'ayant pas de coordonnées GPS afin de pouvoir les configurer facilement (lien d'édition directe).
* **Page Principale** : Intégration conditionnelle et masquage automatique des autres grilles de calendrier sur [PlanningPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/PlanningPage.tsx).

---

## 🧪 Guide de Validation Locale

Pour lancer l'application localement et tester la carte :

1. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```
2. **Ajouter des coordonnées GPS de test** :
   * Va sur l'onglet **Missions** $\rightarrow$ Sélectionne un client.
   * Modifie ou configure un point de prélèvement en y renseignant des coordonnées de test (ex: Latitude `48.39` et Longitude `-4.48` pour Brest, ou des coordonnées réelles de ton choix).
3. **Planifier le point** :
   * Assigne un prélèvement de ce point sur la journée courante sur le planning.
4. **Tester la carte** :
   * Bascule sur la vue **Carte** depuis l'en-tête du Planning.
   * Vérifie le bon centrage, la couleur de l'épingle (bleu/orange/vert), le popup de détails et le bouton GPS.
   * Teste le comportement responsive en redimensionnant ton navigateur en largeur mobile.

---

## 🚀 Commande de Déploiement Staging

Une fois que tu as validé localement, déploie sur l'environnement de staging avec la commande habituelle :

```bash
bash deploy-dev.sh
```

Staging sera mis à jour avec les nouveaux packages et le composant MapView :
👉 [https://labocea-pmc-v2-dev.tomkerf.workers.dev](https://labocea-pmc-v2-dev.tomkerf.workers.dev)
