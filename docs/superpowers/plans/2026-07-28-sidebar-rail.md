# Sidebar repliable en rail d'icônes — Plan d'implémentation

## Contexte

Tom voulait remplacer la sidebar par un dock flottant style macOS (discussion Gemini). Après analyse — 19 destinations, 3 badges temps réel, libellés nécessaires pour l'équipe, timing pré-validation Brest — le dock a été écarté au profit d'un **rail d'icônes repliable** (pattern Linear/Notion) : la sidebar peut se réduire à ~64px (icônes seules + badges + tooltips natifs), toggle cliquable, préférence persistée. Toutes les destinations restent visibles, zéro réapprentissage, ~156px de largeur gagnée pour le contenu. Mobile (BottomTabBar) intouché.

## Périmètre — 2 fichiers

- **Modifier** : `src/components/layout/Sidebar.tsx` (seul fichier de prod touché)
- **Créer** : `src/components/layout/__tests__/Sidebar.test.tsx`

## Design

### État & persistance
- `const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')` — idiome lazy-init de `PlanningPage.tsx:56-57`, clé device-level (non-uid), défaut déplié.
- `toggleCollapsed` écrit `localStorage.setItem('sidebar_collapsed', String(next))`.
- `collapsedSections` (sections repliables existantes) : jamais muté en mode rail — le rail court-circuite en lecture (`const showItems = collapsed || !section.collapsible || isExpanded`), l'état est restauré intact au dépliage.

### Largeur (piège purge Tailwind v4 évité)
- Retirer `w-[220px]` du className ; largeur en style inline : `style={{ width: collapsed ? 64 : 220, transition: 'width 200ms ease' }}`. Transition CSS gratuite, AppLayout est en flex — aucun impact ailleurs (largeur référencée nulle part d'autre, vérifié).
- Toutes les classes conditionnelles = ternaires entre deux littéraux complets (jamais de classes composées dynamiquement).

### Header
- Replié : colonne centrée, logo seul (titre + badge DEV masqués), toggle en dessous.
- Toggle : un seul `<button>` toujours monté, icônes `PanelLeftClose`/`PanelLeftOpen` (lucide), `aria-expanded={!collapsed}`, `aria-label`/`title` « Réduire/Développer la barre latérale ».

### Nav en mode rail
- Titres de sections masqués (`{!collapsed && ...}`), remplacés par un séparateur fin (`role="separator"`, `border-t`) entre sections (sauf la première) — sections aplaties, tout visible, scrollable.
- NavLink : `justify-center` sans label ; `title={label}` + `aria-label={label}` (le span texte est démonté, sinon nom accessible vide). Pour `/missions`, `/chat`, `/actus` : title enrichi `${label} (${count})` si count > 0.
- **Badges dédupliqués** : remplacer les 3 conditionnels inline par un `badge = { count, danger }` calculé ; mode déplié = pilule existante, mode rail = compteur overlay `absolute -top-1.5 -right-2` sur l'icône (`99+` au-delà de 99).
- `m.div layoutId="active-sidebar-bg"` inchangé — arbre unique, la pastille active s'anime au toggle (comportement voulu).
- Item « Mon compte » : `UserAvatar` sert d'icône, fonctionne tel quel.

### Footer en mode rail
- `SyncBadge` : déjà icône-seule avec son propre title — juste centrer le wrapper.
- 3 boutons (Rechercher/Nouveautés/Signaler) : `justify-center`, texte masqué, `title` ajouté (« Rechercher (⌘K) », etc.). Kbd ⌘K masqué. Le point pulse `hasNew` de Nouveautés passe en overlay sur l'icône Sparkles.

## Tests (`Sidebar.test.tsx`, 5 tests)

Wrapper : `<LazyMotion features={domAnimation}><MemoryRouter><Sidebar /></MemoryRouter></LazyMotion>`. `localStorage.clear()` en `beforeEach` ; badges via `useChatNotificationStore.setState({ unreadCount: 3 })` (store Zustand réel, reset après).

1. Défaut déplié + toggle présent (`aria-expanded="true"`, label « Planning » visible)
2. Replier masque labels, titres de sections et titre app ; liens accessibles par `aria-label`
3. Persistance : toggle → localStorage `'true'` ; re-render → toujours replié
4. Badge visible en rail (compteur 3 sur Messagerie + title enrichi)
5. `collapsedSections` survit à l'aller-retour rail (Matériel visible après round-trip, Asservissement absent)

## Exécution (TDD, ~1h30)

1. **Red** : écrire les 5 tests, vérifier échec (`npx vitest run --project unit src/components/layout/__tests__/Sidebar.test.tsx`)
2. **Green 1** : état + toggle + largeur inline → tests 1 et 3
3. **Green 2** : nav rail (titres/séparateurs, showItems, classes NavLink, titles, badge overlay) → tests 2, 4, 5
4. **Green 3** : header logo-seul + footer icônes-seules
5. **Vérif** : `npx tsc -b && npx vitest run --project unit && npm run lint`, contrôle visuel `npm run dev` (alignement badges, spring de la pastille active, scroll rail), puis `bash deploy-dev.sh`

Workflow : worktree `feature/sidebar-rail` + subagent-driven (comme les features du jour), spec/plan archivés dans `docs/superpowers/` au moment de l'exécution.

## Références réutilisées
- `src/pages/PlanningPage.tsx:56-57` — idiome localStorage lazy-init
- `src/components/ui/SyncBadge.tsx` — pattern title/aria-label icône-seule
- `src/components/planning/__tests__/DayView.test.tsx` — convention de test MemoryRouter
- `src/components/planning/MapSidebar.tsx` — précédent local de sidebar repliable (largeur inline)
