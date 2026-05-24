# Design — Météo intégrée sur la Carte des Tournées

**Date :** 2026-05-24  
**Scope :** Affichage des prévisions de précipitations dans la sidebar de MapView  
**Status :** Approuvé

---

## Objectif

Afficher un bandeau de prévisions météo (précipitations) en haut de la sidebar de la Carte des Tournées, calculé au barycentre des points GPS de la journée, via l'API Open-Meteo (gratuite, sans clé).

---

## Architecture

### Nouveau fichier : `src/hooks/useWeather.ts`

Hook isolé avec signature :

```ts
useWeather(lat: number | null, lng: number | null, date: Date): WeatherResult
```

**Retourne :**
```ts
type WeatherResult = {
  loading: boolean
  error: boolean
  maxProba: number        // probabilité max de pluie sur la journée (0-100)
  maxMm: number           // cumul max horaire en mm
  rainWindows: RainWindow[] // créneaux avec probabilité > 30%
}

type RainWindow = {
  hour: number      // ex: 14
  proba: number     // ex: 70
  mm: number        // ex: 1.2
}
```

**Logique interne :**
- Fetch `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=precipitation_probability,precipitation&timezone=Europe%2FParis&forecast_days=3`
- Filtrer les heures correspondant à `date` (comparaison date ISO)
- `rainWindows` = heures où `precipitation_probability > 30`, triées chronologiquement
- Re-fetch si `lat`, `lng` ou `date` changent
- Si `lat` ou `lng` est `null` → renvoie `loading: false, rainWindows: []` sans fetch

### Modifications : `MapView.tsx`

1. **Calculer le barycentre** des `mappedEvts` (moyenne lat/lng) — `useMemo` → `centroid: {lat, lng} | null`
2. **Appeler `useWeather`** avec `centroid?.lat`, `centroid?.lng`, `selectedDate`
3. **Afficher le bandeau** en haut de la sidebar, au-dessus de la liste des points, si `mappedEvts.length > 0`

---

## UI du bandeau

**Cas nominal — pluie prévue :**
```
🌧️ Pluie probable 14h–16h (70%) · max 3 mm
```

**Cas nominal — pas de pluie :**
```
☀️ Pas de précipitations prévues
```

**Plusieurs créneaux :**
```
🌧️ Pluie probable 9h–10h, 14h–16h · max 5 mm
```

**Loading :**
Squelette animé (barre grise pulsante, hauteur 20px, largeur 80%)

**Erreur réseau :**
Pas de bandeau affiché (fail silencieux — la météo est un bonus, pas bloquante)

**Style :**
- Background `var(--color-bg-tertiary)`, border-radius `var(--radius-sm)`, padding `8px 12px`
- Icône ☀️ ou 🌧️ selon `maxProba >= 30`
- Font-size 12px, color `var(--color-text-secondary)`
- Mention discrète "Open-Meteo" en gris clair (attribution requise)

---

## Contraintes

- Pas de clé API — Open-Meteo est gratuit et open
- Attribution obligatoire (mention dans le bandeau ou tooltip)
- Pas de cache persistant — le fetch se refait à chaque changement de date (le volume est négligeable)
- Si aucun point GPS → `centroid` est `null` → pas de fetch, pas de bandeau
- Fail silencieux sur erreur réseau (pas de toast d'erreur)

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `src/hooks/useWeather.ts` | Créer |
| `src/components/planning/MapView.tsx` | Modifier (barycentre + appel hook + bandeau) |

---

## Hors scope

- Météo par point individuel
- Température, vent
- Cache persistant
- Notifications météo
