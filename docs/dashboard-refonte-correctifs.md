# Correctifs post-refonte Dashboard — bon de travail

> Créé le 26/07/2026 après revue du commit `df5d222` (« feat(dashboard): refonte esthétique complète »).
> La refonte est globalement réussie ; il reste **1 bug bloquant** et **3 défauts de finition**.
> Le plan d'origine est dans [dashboard-refonte-plan.md](./dashboard-refonte-plan.md).

---

## Contexte

La refonte du dashboard est implémentée et committée (`df5d222`), lint vert, working tree propre.
La revue a trouvé quatre problèmes. Le premier est bloquant : la carte « À traiter », qui est la
pièce maîtresse de la refonte, ne s'affiche jamais en conditions réelles.

Un test de régression existe déjà : `src/components/dashboard/__tests__/ATraiterWidget.test.tsx`
(3 cas). Le 3ᵉ cas — « s'affiche quand les données arrivent après le montage » — **doit échouer
avant correctif**. Le vérifier d'abord, ça confirme le diagnostic :

```bash
npx vitest run --project unit src/components/dashboard/__tests__/ATraiterWidget.test.tsx
```

---

## Problème 1 — BLOQUANT : `ATraiterWidget` ne s'affiche jamais

**Fichier :** `src/components/dashboard/ATraiterWidget.tsx:61-72`

```tsx
const defaultTab = useMemo((): TabKey | null => {
  if (retards.length > 0) return 'retards'
  ...
  return tabs[0]?.key ?? null
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])                                              // ← deps vides

const [activeTab, setActiveTab] = useState<TabKey | null>(defaultTab)
...
if (tabs.length === 0 || !activeTab) return null
```

**Cause.** Au premier rendu, les stores Zustand sont vides : les données Firestore arrivent via
`onSnapshot` *après* le montage. `defaultTab` vaut donc `null`, `useState` le gèle, et aucun
`useEffect` ne le resynchronise. La garde ligne 72 renvoie `null` à tous les rendus suivants.

Simulation de la sémantique React sur 3 rendus successifs :

| rendu | données | onglets calculés | `activeTab` | résultat |
|---|---|---|---|---|
| 1 (montage) | `retards=0` | 0 | `null` | `return null` |
| 2 (onSnapshot) | `retards=2` | 2 | `null` | `return null` |
| 3 | `retards=2` | 2 | `null` | `return null` |

Le `eslint-disable-next-line react-hooks/exhaustive-deps` de la ligne 66 est ce qui a masqué
l'avertissement qui aurait attrapé le bug. **Il doit disparaître, pas être déplacé.**

Si la carte semble s'afficher en staging, c'est que le cache IndexedDB
(`persistentLocalCache`) avait servi les données assez tôt. Ce sera faux au premier chargement
ou après vidage du cache.

**Correctif attendu.** Remplacer le `useMemo` figé + `useState` par un **état dérivé** : l'onglet
automatique se recalcule à chaque rendu, et le choix explicite de l'utilisateur prend le relais
quand il existe.

```tsx
const autoTab = useMemo((): TabKey | null => {
  if (retards.length > 0) return 'retards'
  if (rapports.some(r => r.enRetard)) return 'rapports'
  if (metrologie.some(eq => eq.prochainEtalonnage && daysDiff(eq.prochainEtalonnage.split('T')[0]) < 0)) return 'metrologie'
  return tabs[0]?.key ?? null
}, [retards, rapports, metrologie, tabs])

const [userPickedTab, setUserPickedTab] = useState<TabKey | null>(null)

// Le choix utilisateur ne vaut que si son onglet existe toujours :
// s'il coche le dernier rapport, l'onglet Rapports disparaît → retour sur autoTab.
const activeTab = userPickedTab && tabs.some(t => t.key === userPickedTab)
  ? userPickedTab
  : autoTab
```

Et brancher les boutons d'onglet sur `setUserPickedTab(tab.key)` au lieu de `setActiveTab`.

Aucun `useEffect` n'est nécessaire — si la solution proposée en réclame un, c'est qu'elle est
plus compliquée que nécessaire.

**Critère de réussite :** les 3 cas du test passent, dont celui du `rerender`.

---

## Problème 2 — Le contraste n'a pas été corrigé

**Fichier :** `src/components/dashboard/SectionTitle.tsx`

Le composant est bien passé de styles inline à Tailwind, mais **la couleur n'a pas changé** :

```tsx
className="... text-[var(--color-text-tertiary)]"   // #AEAEB2 sur #F2F2F7 → 1.9:1
```

C'était le point 6 du diagnostic et l'étape 1 du plan. Le ratio minimum WCAG AA est de 4.5:1.

**Correctif :** `text-[var(--color-text-secondary)]` (#6E6E73 → **5.1:1**).

Vérifier au passage les autres usages de `--color-text-tertiary` sur fond `--color-bg-primary`
dans le périmètre dashboard : le token reste légitime sur fond blanc
(`--color-bg-secondary`, ratio 2.3:1 — toujours insuffisant pour du texte, acceptable pour un
élément décoratif type « équip. » dans le donut ou un chevron). Sur du **texte informatif**,
utiliser `--color-text-secondary`.

---

## Problème 3 — Deux emojis réintroduits dans le nouveau code

**Fichier :** `src/components/dashboard/ATraiterWidget.tsx`

- ligne 129 : `Rédigé ✓` → utiliser l'icône Lucide `Check` (`size={13} strokeWidth={2.5}`)
- ligne 155 : `${r.overdue ? '⚠ ' : ''}` → utiliser `AlertTriangle` (`size={12} strokeWidth={2}`)

C'est le composant censé appliquer la règle n°4 du design system (« les icônes sont monochromes,
Lucide React »), donc autant être cohérent.

Les emojis restants dans `WelcomeModal.tsx:38` (👋) et `EquipeSuiviWidget.tsx:278` (🌧) sont
**hors périmètre** — ne pas y toucher.

---

## Problème 4 — ARIA invalide sur la barre d'onglets

**Fichier :** `src/components/dashboard/ATraiterWidget.tsx:83-104`

`aria-selected` est posé sur des `<button>` nus (ligne 92). Cet attribut n'est valide que sur
`role="tab"`, `role="option"`, `role="row"` ou `role="gridcell"` — sur un bouton ordinaire, les
lecteurs d'écran l'ignorent purement et simplement. Le motif onglets n'est donc pas annoncé.

**Correctif :** implémenter le motif ARIA Tabs complet.

- conteneur de la barre → `role="tablist"` + `aria-label="Catégories à traiter"`
- chaque bouton → `role="tab"`, `id={`tab-${tab.key}`}`, `aria-controls={`panel-${tab.key}`}`,
  `aria-selected={selected}`, et `tabIndex={selected ? 0 : -1}` (roving tabindex)
- conteneur du contenu (le `<div style={{ maxHeight: 320, ... }}>` ligne 106) →
  `role="tabpanel"`, `id={`panel-${activeTab}`}`, `aria-labelledby={`tab-${activeTab}`}`,
  `tabIndex={0}`
- navigation clavier : `←` / `→` pour changer d'onglet, `Home` / `End` pour aller au premier /
  dernier. Un `onKeyDown` sur le `tablist` suffit.

Le `maxHeight: 320` inline de la ligne 106 peut passer en Tailwind (`max-h-80 overflow-y-auto`)
pour rester cohérent avec le reste du fichier.

---

## Contraintes

- **Ne pas toucher** à `EquipeSuiviWidget.tsx` ni `WelcomeModal.tsx` — hors périmètre de la
  refonte (l'onglet « Suivi équipe » fera l'objet d'un chantier séparé). Ils gardent leurs
  `COLORS.X` inline, leurs hovers JS et leurs emojis pour l'instant.
- **Ne rien changer aux flux de données** : Firestore → hook → store Zustand → composants.
  Toutes les écritures continuent de passer par `src/services/` wrappées dans `trackWrite()`.
- Pas de nouveau `eslint-disable`. Si la règle `react-hooks/exhaustive-deps` proteste, c'est
  le code qu'il faut corriger.
- Utiliser `COLLECTIONS` de `src/lib/constants.ts` pour tout nom de collection Firestore
  (aucun ne devrait être nécessaire ici).

---

## Vérification avant commit

```bash
npx vitest run --project unit src/components/dashboard/__tests__/ATraiterWidget.test.tsx
npm run lint
npm run test
npm run doctor
npm run dev      # contrôle visuel : la carte « À traiter » doit apparaître,
                 # onglet Retards présélectionné s'il y a des retards
```

Contrôle visuel à faire explicitement — **recharger avec le cache vidé** (DevTools →
Application → Clear site data), c'est la condition qui révélait le bug 1.

Puis, conformément au workflow du projet :

```bash
bash deploy-dev.sh
```

Et mettre à jour `DEV_LOG.md` + `ROADMAP.md` avec la session.
