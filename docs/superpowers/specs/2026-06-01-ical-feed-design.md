# Design — Feed iCal Google Agenda

**Date :** 2026-06-01  
**Statut :** approuvé

---

## Objectif

Permettre à chaque technicien de s'abonner à un feed iCal (.ics) dans Google Agenda (ou Apple Calendrier) contenant tous ses prélèvements planifiés, filtrés par son identifiant de préleveur.

---

## Architecture

### Endpoint Worker Cloudflare

```
GET /api/calendar/:uid.ics
```

- L'uid Firebase est utilisé comme identifiant du feed (token implicite, usage interne)
- Pas d'authentification OAuth — suffisant pour un usage interne équipe
- Retourne `Content-Type: text/calendar; charset=utf-8`
- Le feed devient invalide automatiquement si le compte Firebase est supprimé

### Flux de données

1. Worker lit `users/{uid}` dans Firestore → récupère les initiales (ex: `THK`)
2. Worker scanne tous les documents `clients-v2` via Firestore REST API
3. Pour chaque client → chaque plan → chaque sampling :
   - Filtre : `plan.preleveur === initiales`
   - Génère un événement VEVENT
4. Retourne le fichier `.ics` complet

---

## Format iCal

### En-tête calendrier

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Labocea PMC V2//FR
X-WR-CALNAME:Planning PMC – [Prénom]
X-WR-TIMEZONE:Europe/Paris
CALSCALE:GREGORIAN
METHOD:PUBLISH
```

### Événement (VEVENT)

```
BEGIN:VEVENT
UID:[samplingId]@labocea-pmc
DTSTART;VALUE=DATE:[YYYYMMDD]  ← plannedDay/plannedMonth de l'année en cours
DTEND;VALUE=DATE:[YYYYMMDD+1]  ← journée entière, lendemain exclusif
SUMMARY:[nomClient] — [siteNom]
DESCRIPTION:Statut: [label] · Nature: [nature] · Méthode: [méthode][· Nappe: haute/basse si renseignée]
STATUS:[CONFIRMED|TENTATIVE|CANCELLED]
LAST-MODIFIED:[updatedAt en UTC]
END:VEVENT
```

### Mapping des statuts

| status Firestore | STATUS iCal | Description affichée |
|-----------------|-------------|----------------------|
| `planned`       | TENTATIVE   | Planifié             |
| `done`          | CONFIRMED   | Effectué             |
| `overdue`       | TENTATIVE   | En retard            |
| `non_effectue`  | CANCELLED   | Non effectué         |

---

## Page Mon compte — Section "Agenda Google"

Nouvelle section dans `/compte` sous les informations de profil :

- Titre : "Synchronisation agenda"
- URL du feed affichée (lecture seule)
- Bouton "Copier le lien"
- Instructions courtes :
  > Dans Google Agenda → Autres agendas → Via une URL → coller le lien

---

## Fichiers à créer / modifier

| Fichier | Action |
|--------|--------|
| `worker/index.js` | Ajouter handler `GET /api/calendar/:uid.ics` |
| `src/pages/ComptePage.tsx` | Ajouter section "Agenda Google" |

---

## Contraintes techniques

- Le Worker doit lire tous les `clients-v2` via Firestore REST API (même pattern que la notification push existante)
- L'année des événements : année courante extraite au moment de la requête
- Les samplings sans `plannedDay` valide sont ignorés
- Encodage iCal : les virgules et points-virgules dans les champs texte sont échappés (`\,` et `\;`)
- Header de cache : `Cache-Control: public, max-age=3600` (fraîcheur 1h, cohérent avec les abonnements Google Agenda)
