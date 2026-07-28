# Planification rapide — date plus lisible + heure optionnelle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dans la modale journalière du Planning, rendre le champ date de planification plus lisible (pleine largeur, police agrandie) et ajouter un champ heure optionnel (`plannedTime`), toujours visible, cohérent avec le pattern déjà utilisé dans `SamplingForm.tsx`.

**Architecture:** Le champ heure remonte via un 3ᵉ paramètre optionnel `time?: string` ajouté à la chaîne de callback existante `onValidatePool` / `handleValidatePool` (4 fichiers touchés : `DayModalPoolTab.tsx` → `DayModal.tsx` → `PlanningModals.tsx` → `usePlanningActions.ts`). Aucun changement de schéma de données : `Sampling.plannedTime?: string` existe déjà.

**Tech Stack:** React + TypeScript, Vitest (tests hooks), inputs HTML natifs (`type="date"`, `type="time"`).

Référence : spec `docs/superpowers/specs/2026-07-28-planifier-heure-pool-design.md`.

---

### Task 1: Étendre `handleValidatePool` dans `usePlanningActions.ts` pour accepter et sauvegarder l'heure

**Files:**
- Modify: `src/hooks/usePlanningActions.ts:184-205`
- Test: `src/hooks/__tests__/usePlanningActions.test.ts:233-255`

- [ ] **Step 1: Écrire le test qui échoue — planification avec heure**

Dans `src/hooks/__tests__/usePlanningActions.test.ts`, remplacer le bloc `describe('handleValidatePool', ...)` (lignes 233-255) par :

```typescript
  describe('handleValidatePool', () => {
    const poolItem = {
      clientId: 'c1',
      planId: 'p1',
      sampling: { id: 's1' },
    } as unknown as PoolItem

    it('planifie le prélèvement à la date déposée', async () => {
      const actions = setup()
      await actions.handleValidatePool(poolItem, '2026-08-20')

      const s = savedSampling()
      expect(s.plannedDay).toBe(20)
      expect(s.plannedMonth).toBe(7) // août (0-based)
      expect(s.plannedTime).toBeUndefined()
    })

    it('planifie le prélèvement avec une heure', async () => {
      const actions = setup()
      await actions.handleValidatePool(poolItem, '2026-08-20', '09:30')

      const s = savedSampling()
      expect(s.plannedDay).toBe(20)
      expect(s.plannedMonth).toBe(7)
      expect(s.plannedTime).toBe('09:30')
    })

    it('refuse de planifier sur un jour férié', async () => {
      const actions = setup({ holidays: { '2026-07-14': 'Fête nationale' } })
      await actions.handleValidatePool(poolItem, '2026-07-14')

      expect(saveClient).not.toHaveBeenCalled()
    })
  })
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run --project unit src/hooks/__tests__/usePlanningActions.test.ts`
Expected: FAIL sur `'planifie le prélèvement avec une heure'` — `handleValidatePool` ne prend actuellement que 2 paramètres, `s.plannedTime` sera `undefined` alors qu'on attend `'09:30'`.

- [ ] **Step 3: Implémenter — ajouter le paramètre `time` et le sauvegarder**

Dans `src/hooks/usePlanningActions.ts`, remplacer la fonction `handleValidatePool` (lignes 184-205) par :

```typescript
  async function handleValidatePool(item: PoolItem, date: string, time?: string) {
    if (!uid) return
    if (holidays[date]) return
    const client = clients.find((c: Client) => c.id === item.clientId)
    if (!client) return
    const poolDateObj  = new Date(date + 'T12:00:00')
    const plannedDay   = poolDateObj.getDate()
    const plannedMonth = poolDateObj.getMonth()
    try {
      await saveClient({
        ...client,
        plans: client.plans.map(plan => plan.id !== item.planId ? plan : {
          ...plan,
          samplings: plan.samplings.map((s: Sampling) =>
            s.id !== item.sampling.id ? s : { ...s, plannedDay, plannedMonth, plannedTime: time || undefined }
          )
        })
      }, uid)
    } catch {
      addToast('error', 'Erreur lors de la validation du prélèvement')
    }
  }
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run --project unit src/hooks/__tests__/usePlanningActions.test.ts`
Expected: PASS — les 3 tests du bloc `handleValidatePool` passent (13 tests au total dans le fichier).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePlanningActions.ts src/hooks/__tests__/usePlanningActions.test.ts
git commit -m "feat(planning): handleValidatePool accepte une heure optionnelle"
```

---

### Task 2: Propager le paramètre `time` à travers `PlanningModals.tsx` et `DayModal.tsx`

**Files:**
- Modify: `src/components/planning/PlanningModals.tsx:22`
- Modify: `src/components/planning/DayModal.tsx:15`

Ces deux fichiers ne font que déclarer le type de la prop et la faire transiter — aucune logique, donc pas de test dédié (couvert indirectement par le typecheck `tsc -b`).

- [ ] **Step 1: Mettre à jour le type de prop dans `PlanningModals.tsx`**

Dans `src/components/planning/PlanningModals.tsx:22`, remplacer :

```typescript
  handleValidatePool:   (item: PoolItem, date: string) => Promise<void>
```

par :

```typescript
  handleValidatePool:   (item: PoolItem, date: string, time?: string) => Promise<void>
```

- [ ] **Step 2: Mettre à jour le type de prop dans `DayModal.tsx`**

Dans `src/components/planning/DayModal.tsx:15`, remplacer :

```typescript
  onValidatePool: (item: PoolItem, date: string) => Promise<void>
```

par :

```typescript
  onValidatePool: (item: PoolItem, date: string, time?: string) => Promise<void>
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `npx tsc -b`
Expected: pas d'erreur (les deux fichiers ne font que déclarer/relayer le type ; `DayModalPoolTab.tsx` n'est pas encore modifié à ce stade, donc son appel `onValidatePool={onValidatePool}` reste compatible car `time` est optionnel).

- [ ] **Step 4: Commit**

```bash
git add src/components/planning/PlanningModals.tsx src/components/planning/DayModal.tsx
git commit -m "feat(planning): propage le paramètre heure optionnel dans la chaîne de props DayModal"
```

---

### Task 3: Ajouter le champ heure et agrandir le champ date dans `DayModalPoolTab.tsx`

**Files:**
- Modify: `src/components/planning/DayModalPoolTab.tsx`

- [ ] **Step 1: Étendre les props et l'état du composant parent**

Dans `src/components/planning/DayModalPoolTab.tsx`, ligne 161, remplacer :

```typescript
  onValidatePool: (item: PoolItem, date: string) => Promise<void>
```

par :

```typescript
  onValidatePool: (item: PoolItem, date: string, time?: string) => Promise<void>
```

- [ ] **Step 2: Ajouter l'état `poolTime` et le passer à `handleValidatePool`**

Ligne 166, juste après `const [poolDate, setPoolDate] = useState(dateStr)`, ajouter :

```typescript
  const [poolTime,    setPoolTime]    = useState('')
```

Ligne 172-177, remplacer `handleValidatePool` :

```typescript
  async function handleValidatePool(item: PoolItem) {
    if (poolSaving) return
    setPoolSaving(true)
    try { await onValidatePool(item, poolDate, poolTime || undefined); setPoolValidId(null) }
    finally { setPoolSaving(false) }
  }
```

- [ ] **Step 3: Passer `poolTime`/`setPoolTime` à `PoolItemRow` et pré-remplir à l'ouverture**

Dans l'interface `PoolItemRowProps` (lignes 17-28), ajouter deux champs après `poolDate: string` :

```typescript
interface PoolItemRowProps {
  item: PoolItem
  isLast: boolean
  poolValidId: string | null
  poolDate: string
  poolTime: string
  poolSaving: boolean
  dateStr: string
  holidays: Record<string, string>
  setPoolValidId: (id: string | null) => void
  setPoolDate: (d: string) => void
  setPoolTime: (t: string) => void
  onValidate: (item: PoolItem) => void
}
```

Ligne 30, mettre à jour la signature de `PoolItemRow` :

```typescript
function PoolItemRow({ item, isLast, poolValidId, poolDate, poolTime, poolSaving, dateStr, holidays, setPoolValidId, setPoolDate, setPoolTime, onValidate }: PoolItemRowProps) {
```

Lignes 50-53, dans le `onClick` du bouton principal, pré-remplir `poolTime` depuis `item.sampling.plannedTime` à l'ouverture :

```typescript
        onClick={() => isValidating
          ? setPoolValidId(null)
          : (setPoolValidId(item.sampling.id), setPoolDate(dateStr), setPoolTime(item.sampling.plannedTime ?? ''))
        }>
```

- [ ] **Step 4: Remplacer la disposition du bloc de validation (date pleine largeur + heure + bouton en pleine largeur)**

Lignes 117-150 (le bloc `{isValidating && (...)}`), remplacer entièrement par :

```typescript
      {isValidating && (
        <div className="px-4 py-3 flex flex-col gap-3"
          style={{ background: COLORS.BG_TERTIARY, borderTop: '1px solid var(--color-border-subtle)' }}>
          <div>
            <label htmlFor="dm-pool-date" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Planifier le
            </label>
            <input id="dm-pool-date" type="date" value={poolDate} onChange={e => setPoolDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-base"
              style={{
                background: COLORS.BG_SECONDARY,
                border: `1px solid ${poolHoliday ? COLORS.DANGER : COLORS.BORDER}`,
                color: COLORS.TEXT_PRIMARY,
              }} />
          </div>
          <div>
            <label htmlFor="dm-pool-time" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Heure (optionnel)
            </label>
            <input id="dm-pool-time" type="time" value={poolTime} onChange={e => setPoolTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-base"
              style={{
                background: COLORS.BG_SECONDARY,
                border: `1px solid ${COLORS.BORDER}`,
                color: COLORS.TEXT_PRIMARY,
              }} />
          </div>
          <button type="button" onClick={() => onValidate(item)} disabled={poolSaving || !poolDate || !!poolHoliday}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: poolHoliday ? COLORS.BG_TERTIARY : COLORS.SUCCESS,
              color: poolHoliday ? 'var(--color-text-tertiary)' : 'white',
              opacity: poolSaving ? 0.6 : 1,
              cursor: poolHoliday ? 'not-allowed' : 'pointer',
            }}>
            {poolSaving ? '…' : 'Confirmer'}
          </button>
          {poolHoliday && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: COLORS.DANGER }}>
              <span>⛔</span>
              <span>{poolHoliday} — planification impossible sur un jour férié.</span>
            </p>
          )}
        </div>
      )}
```

- [ ] **Step 5: Mettre à jour l'appel à `PoolItemRow` dans le rendu principal**

Ligne 231-238 (`group.items.map(...)`), ajouter `poolTime={poolTime}` et `setPoolTime={setPoolTime}` :

```typescript
                    {group.items.map((item, i) => (
                      <PoolItemRow key={item.sampling.id}
                        item={item} isLast={i === group.items.length - 1}
                        poolValidId={poolValidId} poolDate={poolDate} poolTime={poolTime} poolSaving={poolSaving}
                        dateStr={dateStr} holidays={holidays}
                        setPoolValidId={setPoolValidId} setPoolDate={setPoolDate} setPoolTime={setPoolTime}
                        onValidate={handleValidatePool}
                      />
                    ))}
```

- [ ] **Step 6: Vérifier le typecheck et les tests**

Run: `npx tsc -b && npx vitest run --project unit`
Expected: 0 erreur TypeScript, tous les tests passent (aucun test de rendu existant sur `DayModalPoolTab` à ce jour — la couverture reste celle de `usePlanningActions.test.ts` mise à jour en Task 1).

- [ ] **Step 7: Vérifier le lint**

Run: `npm run lint`
Expected: 0 erreur.

- [ ] **Step 8: Commit**

```bash
git add src/components/planning/DayModalPoolTab.tsx
git commit -m "feat(planning): champ heure optionnel + date agrandie dans la validation du pool"
```

---

### Task 4: Vérification manuelle sur le staging

**Files:** aucun — validation fonctionnelle.

- [ ] **Step 1: Build de contrôle**

Run: `npm run build`
Expected: build réussi, aucune erreur TypeScript.

- [ ] **Step 2: Déployer sur staging**

Run: `bash deploy-dev.sh`
Expected: `✅ Staging déployé : https://labocea-pmc-v2-dev.tomkerf.workers.dev`

- [ ] **Step 3: Test manuel**

Sur https://labocea-pmc-v2-dev.tomkerf.workers.dev/planning, ouvrir un jour, onglet "Interventions à planifier", cliquer sur un item "À planifier" :
- Vérifier que le champ date est lisible en pleine largeur.
- Vérifier que le champ "Heure (optionnel)" est visible, vide par défaut.
- Renseigner une heure, cliquer Confirmer, rouvrir l'item planifié : vérifier que l'heure ressaisie est bien pré-remplie (`item.sampling.plannedTime`).
- Confirmer sans heure : vérifier que ça fonctionne toujours (heure réellement optionnelle).
