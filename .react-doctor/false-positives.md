# React Doctor — Faux positifs connus

## react-doctor/only-export-components

- `src/components/infos/EntryCard.tsx` — `TYPE_CONFIG` est co-localisé intentionnellement avec les composants `Badge`/`EntryCard` car ils sont étroitement couplés (config de rendu par type).
- `src/components/ui/UserAvatar.tsx` — `AVATAR_COLORS`, `DEFAULT_AVATAR_COLOR`, `getAvatarColor` sont co-localisés intentionnellement (palette utilisée par AppLayout pour les tokens CSS d'accent).

## react-doctor/no-mutable-in-deps

- `src/components/layout/AppLayout.tsx` — `location.pathname` en deps vient de `useLocation()` (React Router), pas de `window.location`. C'est réactif et correct en deps.

## react-doctor/effect-needs-cleanup

- `src/components/planning/MapView.tsx:153` — `marker.on()` sont des listeners Leaflet. Le cleanup du premier `useEffect` appelle `mapRef.current.remove()` qui détruit la carte et tous ses layers/listeners. Pas de fuite mémoire.

## dist_old/

- Tous les diagnostics dans `dist_old/` sont des artefacts de build archivés — ignorer.
