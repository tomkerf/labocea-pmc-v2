# Plan d'implémentation — Carte Interactive des Tournées (Feature 1)

Ce document décrit le plan technique pour concevoir et intégrer une carte interactive premium (style Apple Maps) au sein de la page **Planning**, permettant de visualiser et d'organiser géographiquement les tournées de prélèvement du jour.

---

## Architecture & Concept UI

La carte sera accessible comme un 4ème mode de vue sur la page Planning : **Jour / Semaine / Mois / Carte**. 

### Composition de l'interface en mode "Carte"
En mode carte, la vue se divisera en deux parties (responsive) :
1. **La Carte (2/3 de l'écran ou plein écran sur mobile)** :
   - Fond de carte sobre et épuré (CartoDB Positron / OpenStreetMap).
   - Marqueurs interactifs pour chaque point de prélèvement programmé le jour sélectionné.
   - Les marqueurs porteront un numéro de séquence et la couleur du technicien assigné.
   - Clic sur un marqueur $\rightarrow$ ouverture d'un popup premium affichant les détails (Client, Nature de l'eau, Heure prévue) et un bouton d'action rapide vers Google Maps / Waze pour le guidage GPS.
2. **Le Panneau de Tournée (1/3 de l'écran ou tiroir rétractable sur mobile)** :
   - Liste ordonnée chronologiquement des prélèvements du jour sélectionné.
   - Clic sur une carte $\rightarrow$ centrage automatique et zoom sur le marqueur correspondant.
   - Case à cocher ou statut rapide pour marquer comme fait (`done`) ou reporter, avec mise à jour temps réel de la carte.
   - Notification discrète si certains points de prélèvement n'ont pas de coordonnées GPS renseignées (avec un bouton d'édition rapide).

---

## Modifications Techniques Proposées

### 1. Dépendances & Librairies
Nous utiliserons **Leaflet** en version vanilla couplé à un hook React standard (`useRef`/`useEffect`). Cela évite les conflits majeurs de compatibilité avec React 19 rencontrés avec `react-leaflet`, tout en garantissant un contrôle total sur le cycle de vie de la carte.

- **Installation** :
  ```bash
  npm install leaflet
  npm install -D @types/leaflet
  ```

---

### 2. Modèle de données & Types

#### [MODIFY] [planningUtils.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/lib/planningUtils.ts)
* Ajouter `'carte'` au type `ViewMode` :
  ```typescript
  export type ViewMode = 'jour' | 'semaine' | 'mois' | 'carte'
  ```
* Ajouter les propriétés `lat` et `lng` optionnelles à l'interface `PlanningEvent` :
  ```typescript
  export interface PlanningEvent {
    // ... existant
    lat?: string
    lng?: string
  }
  ```

#### [MODIFY] [usePlanningData.ts](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/hooks/usePlanningData.ts)
* Lors de la construction des `PlanningEvent` de type `'prelevement'`, extraire `lat` et `lng` depuis l'objet `plan` d'origine pour les injecter directement dans l'événement :
  ```typescript
  const common = {
    // ... existant
    lat: plan.lat || '',
    lng: plan.lng || '',
  }
  ```

---

### 3. Composants UI & Pages

#### [NEW] [MapView.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/components/planning/MapView.tsx)
Création d'un composant de carte interactif et responsive :
* **Initialisation** : Instancier la carte Leaflet dans un conteneur HTML avec un `useEffect` s'exécutant au montage du composant ou au changement de date.
* **Marqueurs personnalisés** : Créer des icônes SVG Leaflet personnalisées aux couleurs du technicien assigné (`getTechColor`), arborant un numéro ou une icône de gouttelette.
* **Barre Latérale de Tournée** : 
  - Liste de gauche épurée (style Apple) avec les détails de chaque prélèvement de la journée.
  - Comportement réactif : centrer la carte au clic sur un élément.
  - Intégrer les filtres actifs (Technicien, Retards) pour filtrer dynamiquement les marqueurs affichés.
* **Fallbacks GPS** : Section élégante listant les prélèvements de la journée n'ayant pas de coordonnées valides (ex: latitude/longitude vide) afin que le technicien puisse les localiser ou les configurer.

#### [MODIFY] [PlanningHeader.tsx](file:///Users/thomaskerfendal/components/planning/PlanningHeader.tsx)
* Ajouter l'option `'carte'` dans le sélecteur de vue (Ligne 82) :
  ```typescript
  {(['jour','semaine','mois','carte'] as ViewMode[]).map(m => ( ... ))}
  ```

#### [MODIFY] [PlanningPage.tsx](file:///Users/thomaskerfendal/documents/dev/app-pmc-v2/src/pages/PlanningPage.tsx)
* Intégrer la vue `MapView` sous la condition `viewMode === 'carte'` :
  ```tsx
  {viewMode === 'carte' && (
    <MapView
      selectedDate={selectedDate}
      today={today}
      eventsByDate={eventsByDate}
      filterTech={filterTech}
      filterRetard={filterRetard}
      preleveurs={preleveurs}
      handleSelectEvent={handleSelectEvent}
    />
  )}
  ```

---

## Plan de Vérification

### 1. Validation Technique & Build
* Lancement de `tsc --noEmit` et de `npm run build` pour valider l'absence d'erreurs TypeScript avec React 19 et Leaflet.
* Exécution des tests unitaires existants (`npm test`) pour s'assurer d'aucune régression.

### 2. Validation Manuelle
* Renseigner des coordonnées GPS de test sur un plan de prélèvement (ex: `48.3903`, `-4.4860` pour Brest ou des coordonnées locales).
* Planifier ce prélèvement sur la journée en cours.
* Basculer en vue **Carte** et vérifier :
  - L'affichage correct du marqueur à l'endroit exact.
  - La couleur du marqueur assortie au technicien connecté/assigné.
  - L'ouverture du popup d'information au clic sur le marqueur ou sur l'élément de liste.
  - Le fonctionnement du bouton d'itinéraire Google Maps.
  - Le comportement responsive sur mobile (tiroir rétractable ou disposition flex-col).
