# Visites Préliminaires — Design Spec

**Date :** 2026-05-26  
**Statut :** validé

---

## Contexte

Avant le démarrage de certains marchés, l'équipe terrain effectue une visite préliminaire des futurs points de prélèvement pour évaluer type d'eau, méthode, faisabilité et sécurité. Cette visite peut intervenir avant ou après la signature du devis (liée à une Demande ou un Client). Le résultat est un mémo interne exportable en PDF via HTML imprimable.

---

## 1. Modèle de données

### Collection Firestore : `visites/{id}`

```typescript
interface VisitePreliminaire {
  id: string
  linkedTo: {
    type: 'client' | 'demande'
    id: string
    nom: string          // dénormalisé pour affichage
  }
  date: string           // ISO date "YYYY-MM-DD"
  technicienUid: string
  technicienNom: string  // dénormalisé
  notes: string          // remarques générales
  points: PointVisite[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface PointVisite {
  id: string             // uuid local
  nom: string            // ex: "P1 — Regard aval station"
  typeEau: 'Eau usée' | 'Rivière' | 'Souterraine' | 'AEP' | 'Marine'
  methode: 'Ponctuel' | 'Composite' | 'Automatique'
  faisabilite: 'ok' | 'difficile' | 'impossible'
  securite: string       // texte libre
  notes: string          // optionnel
  photos: string[]       // URLs Firebase Storage
}
```

### Firebase Storage

Chemin photos : `visites/{visiteId}/{pointId}/{timestamp}.{ext}`  
Règles : auth requise, max 10 Mo, `image/*` uniquement.

---

## 2. Navigation

### Accès

La visite est accessible depuis deux points d'entrée :

- **Fiche client** (`/missions/:clientId`) — section "Visites préliminaires" avec liste + bouton "Nouvelle visite"
- **Fiche demande** (`/demandes/:demandeId`) — même section

Pas de page listant toutes les visites (hors scope V1).

### Routes

| Route | Composant | Description |
|-------|-----------|-------------|
| `/visites/nouveau?type=client&id=xxx` | `VisiteFormPage` | Création liée à un client |
| `/visites/nouveau?type=demande&id=xxx` | `VisiteFormPage` | Création liée à une demande |
| `/visites/:visiteId` | `VistePage` | Fiche détail, édition, export |

---

## 3. Formulaire de saisie (`VisiteFormPage`)

### Champs généraux

| Champ | Type | Détail |
|-------|------|--------|
| Date de visite | date picker | Requis |
| Technicien | texte | Pré-rempli avec l'utilisateur connecté, éditable |
| Notes générales | textarea | Optionnel |

### Champs par point (`PointVisite`)

| Champ | Type | Détail |
|-------|------|--------|
| Nom | texte libre | Requis. Ex : "P1 — Regard aval" |
| Type d'eau | sélecteur | Eau usée / Rivière / Souterraine / AEP / Marine |
| Méthode | sélecteur | Ponctuel / Composite / Automatique |
| Faisabilité | 3 boutons radio visuels | ✓ OK (vert) / ⚠ Difficile (orange) / ✗ Impossible (rouge) |
| Sécurité | texte libre | Optionnel. Ex : "Accès glissant, EPI obligatoire" |
| Notes | texte libre | Optionnel |
| Photos | bouton caméra | Même mécanisme que `SamplingForm` — `uploadVisitePhoto()` |

### Comportement

- Bouton "+ Ajouter un point" pour ajouter des points dynamiquement
- Chaque point a un bouton "Supprimer" (avec confirmation)
- Points réordonnables via flèches haut/bas
- Sauvegarde manuelle (bouton "Enregistrer") — pas d'auto-save pour cette feature

---

## 4. Export HTML

### Déclenchement

Bouton "Exporter" sur la fiche visite (`VistePage`) → `window.open()` + `document.write()` + `window.print()` sur le nouvel onglet.

### Contenu du rapport

1. **En-tête** : titre "Rapport de visite préliminaire", nom du client/demande, date, technicien
2. **Points** : tableau — une section par point avec nom, type d'eau, méthode, faisabilité (colorée), sécurité, notes
3. **Photos** : grille 3 colonnes sous chaque point (intégrées en `<img src="url">`)
4. **Notes générales** en pied de rapport

### Implémentation

Fonction pure `generateVisiteHTML(visite: VisitePreliminaire): string` dans `src/lib/generateVisiteHTML.ts`.  
CSS embarqué avec `@media print` : marges 2cm, pas de fond coloré à l'impression, photos max 30% de largeur.  
Pas de lib externe.

---

## 5. Règles Firestore

```
match /visites/{visiteId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null
    && (request.auth.uid == resource.data.technicienUid
        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
}
```

---

## 6. Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `src/types/index.ts` | Ajouter `VisitePreliminaire`, `PointVisite` |
| `src/lib/uploadPhoto.ts` | Ajouter `uploadVisitePhoto()` |
| `src/lib/generateVisiteHTML.ts` | Créer — fonction export |
| `src/services/visiteService.ts` | Créer — `saveVisite`, `deleteVisite`, `getVisitesByLinked` |
| `src/stores/visitesStore.ts` | Créer — store Zustand |
| `src/hooks/useVisites.ts` | Créer — listener Firestore |
| `src/pages/VisiteFormPage.tsx` | Créer — formulaire création/édition |
| `src/pages/VistePage.tsx` | Créer — fiche détail + export |
| `src/pages/ClientPage.tsx` | Modifier — section "Visites préliminaires" |
| `src/pages/DemandesPage.tsx` | Modifier — section "Visites préliminaires" |
| `src/App.tsx` | Modifier — ajouter routes `/visites/*` |
| `firestore.rules` | Modifier — ajouter règles `visites` |
| `storage.rules` | Modifier — ajouter règles `visites/{visiteId}` |
