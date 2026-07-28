# Fréquence hebdomadaire pour les plans de prélèvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une fréquence `'Hebdomadaire'` aux plans de prélèvement, avec génération automatique
d'environ 52 occurrences/an sur un jour de semaine configurable, et affichage adapté dans la vue
planning annuelle (`YearMatrixView`).

**Architecture:** Extension du modèle existant (`FrequenceType`, `Plan.defaultWeeklyDay`) sans
toucher `Sampling`. `generateSamplings` reçoit désormais l'année (nécessaire pour calculer les
dates réelles d'un jour de semaine donné) avec une valeur par défaut pour ne pas casser les tests
existants. La vue annuelle généralise le mécanisme d'agrégation par mois déjà utilisé pour
`Bimensuel` (`pairsByMonth`) et la modale de drill-down mensuel existante (`IssueListModal`) gagne
un filtre optionnel par plan.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind v4 (voir `CLAUDE.md` à la racine du projet
pour les conventions).

**Spec de référence :** `docs/superpowers/specs/2026-07-26-frequence-hebdomadaire-design.md`
(inclut deux amendements du 27/07/2026 déjà intégrés dans ce plan).

---

### Task 1: Modèle de données — `FrequenceType` et `Plan.defaultWeeklyDay`

**Files:**
- Modify: `src/types/index.ts:36` (FrequenceType), `src/types/index.ts:96-118` (Plan)
- Modify: `src/lib/planningUtils.ts:86` (exporter JOURS_LONG)
- Modify: `src/pages/ClientPage.tsx:142`, `src/pages/ClientPage.tsx:154`
- Modify: `src/pages/VisiteFormPage.tsx:156`
- Modify: `src/lib/__tests__/samplings.test.ts:27-46` (helper `makePlan`)

- [ ] **Step 1: Ajouter `'Hebdomadaire'` à `FrequenceType` et `defaultWeeklyDay` à `Plan`**

Dans `src/types/index.ts`, ligne 36 :

```ts
export type FrequenceType = 'Hebdomadaire' | 'Mensuel' | 'Bimensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel' | 'Personnalisé'
```

Dans `src/types/index.ts`, ajouter le champ après `customDays` (ligne 110) :

```ts
  customDays: Record<string, number>
  /** Jour de la semaine pour frequence === 'Hebdomadaire'. 0 = lundi … 6 = dimanche. Ignoré sinon. */
  defaultWeeklyDay: number
```

- [ ] **Step 2: Exporter `JOURS_LONG` depuis `planningUtils.ts`**

Dans `src/lib/planningUtils.ts`, ligne 86, retirer `const` au profit de `export const` :

```ts
export const JOURS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
```

- [ ] **Step 3: Mettre à jour les 3 sites de construction d'un `Plan`**

Dans `src/pages/ClientPage.tsx`, ligne 142 (fonction `addPlan`) ET ligne 154 (fonction
`addSeparator`) — même remplacement aux deux endroits :

```ts
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {}, defaultWeeklyDay: 0,
```

Dans `src/pages/VisiteFormPage.tsx`, ligne 156 (fonction `handleCreatePlan`) — même remplacement :

```ts
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {}, defaultWeeklyDay: 0,
```

- [ ] **Step 4: Mettre à jour le helper `makePlan` des tests**

Dans `src/lib/__tests__/samplings.test.ts`, la fonction `makePlan` (lignes 27-46) construit un
objet `Plan` complet — ajouter le nouveau champ requis pour que le fichier compile toujours :

```ts
function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    nom: 'Plan test',
    siteNom: 'Site A',
    frequence: 'Mensuel',
    meteo: '',
    nature: 'Rivière',
    methode: 'Ponctuel',
    lat: '',
    lng: '',
    gpsApprox: false,
    customMonths: [],
    bimensuelMonths: [],
    defaultDay: 15,
    customDays: {},
    defaultWeeklyDay: 0,
    samplings: [],
    ...overrides,
  }
}
```

- [ ] **Step 5: Vérifier que le projet compile**

Run: `npx tsc -b` (pas `npx tsc --noEmit` — voir note en Task 7)
Expected: aucune erreur (si une erreur apparaît sur un autre site de construction de `Plan` non
listé ci-dessus, l'ajouter avec `defaultWeeklyDay: 0` et documenter le fichier ici avant de
continuer).

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/planningUtils.ts src/pages/ClientPage.tsx src/pages/VisiteFormPage.tsx src/lib/__tests__/samplings.test.ts
git commit -m "feat(types): ajoute la fréquence Hebdomadaire et Plan.defaultWeeklyDay"
```

---

### Task 2: Génération des samplings hebdomadaires

**Files:**
- Modify: `src/lib/samplings.ts:33` (signature `generateSamplings`)
- Modify: `src/lib/__tests__/samplings.test.ts` (nouveaux tests)

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `src/lib/__tests__/samplings.test.ts`, juste avant la fermeture du `describe('generateSamplings', ...)` (avant la ligne `})` qui suit le bloc `describe('Champs par défaut', ...)`, soit après la ligne 206 :

```ts
  describe('Hebdomadaire', () => {
    it('génère 52 occurrences pour 2026 avec jour = lundi (0)', () => {
      // 2026 commence un jeudi ; vérifié manuellement : 52 lundis en 2026
      const result = generateSamplings(makePlan({ frequence: 'Hebdomadaire', defaultWeeklyDay: 0 }), 2026)
      expect(result).toHaveLength(52)
    })

    it('génère 53 occurrences pour 2026 avec jour = jeudi (3)', () => {
      // 2026 commence un jeudi ET finit un jeudi (365 jours, année non bissextile) → 53 jeudis
      const result = generateSamplings(makePlan({ frequence: 'Hebdomadaire', defaultWeeklyDay: 3 }), 2026)
      expect(result).toHaveLength(53)
    })

    it('toutes les occurrences tombent bien sur le jour de semaine demandé', () => {
      const result = generateSamplings(makePlan({ frequence: 'Hebdomadaire', defaultWeeklyDay: 0 }), 2026)
      for (const s of result) {
        const d = new Date(2026, s.plannedMonth, s.plannedDay)
        const weekday = (d.getDay() + 6) % 7
        expect(weekday).toBe(0)
      }
    })

    it('la première occurrence de 2026 (lundi) est le 5 janvier', () => {
      const result = generateSamplings(makePlan({ frequence: 'Hebdomadaire', defaultWeeklyDay: 0 }), 2026)
      expect(result[0].plannedMonth).toBe(0)
      expect(result[0].plannedDay).toBe(5)
    })

    it('la dernière occurrence de 2026 (lundi) est le 28 décembre', () => {
      const result = generateSamplings(makePlan({ frequence: 'Hebdomadaire', defaultWeeklyDay: 0 }), 2026)
      const last = result[result.length - 1]
      expect(last.plannedMonth).toBe(11)
      expect(last.plannedDay).toBe(28)
    })

    it('les numéros (num) sont consécutifs à partir de 1', () => {
      const result = generateSamplings(makePlan({ frequence: 'Hebdomadaire', defaultWeeklyDay: 0 }), 2026)
      expect(result.map((s) => s.num)).toEqual(Array.from({ length: 52 }, (_, i) => i + 1))
    })

    it('chaque prélèvement a le statut "planned" et un id unique', () => {
      const result = generateSamplings(makePlan({ frequence: 'Hebdomadaire', defaultWeeklyDay: 0 }), 2026)
      expect(result.every((s) => s.status === 'planned')).toBe(true)
      expect(new Set(result.map((s) => s.id)).size).toBe(52)
    })
  })

  describe('year non fourni', () => {
    it('les fréquences non-hebdomadaires ignorent le paramètre year (comportement inchangé)', () => {
      const result = generateSamplings(makePlan({ frequence: 'Mensuel' }))
      expect(result).toHaveLength(12)
    })
  })
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run --project unit src/lib/__tests__/samplings.test.ts`
Expected: FAIL — soit erreur de compilation (`generateSamplings` n'accepte pas de 2ᵉ argument),
soit assertions fausses (aucun cas `'Hebdomadaire'` dans `generateSamplings` aujourd'hui, il tombe
dans le `else` → `months = [plan.customMonths[0] ?? 0]`, donc 1 seul résultat au lieu de 52/53).

- [ ] **Step 3: Implémenter `generateWeeklySamplings` et brancher `generateSamplings`**

Dans `src/lib/samplings.ts`, changer la signature (ligne 33) :

```ts
export function generateSamplings(plan: Plan, year: number = new Date().getFullYear()): Sampling[] {
```

Juste après la fonction `blankSampling` (donc avant le bloc `// Bimensuel — 2 prélèvements / mois...`),
ajouter :

```ts
  // Hebdomadaire — une occurrence par semaine sur le jour choisi, calculée sur l'année réelle
  // (contrairement aux autres fréquences, "tous les lundis" dépend du calendrier de l'année).
  if (plan.frequence === 'Hebdomadaire') {
    const result: Sampling[] = []
    const end = new Date(year, 11, 31)
    let num = 1
    for (const d = new Date(year, 0, 1); d <= end; d.setDate(d.getDate() + 1)) {
      const weekday = (d.getDay() + 6) % 7 // JS: dim=0..sam=6 → lun=0..dim=6
      if (weekday === plan.defaultWeeklyDay) {
        result.push(blankSampling(num++, d.getMonth(), d.getDate()))
      }
    }
    return result
  }
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run --project unit src/lib/__tests__/samplings.test.ts`
Expected: PASS — tous les tests (existants + nouveaux) verts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/samplings.ts src/lib/__tests__/samplings.test.ts
git commit -m "feat(samplings): génère les occurrences hebdomadaires sur l'année du plan"
```

---

### Task 3: Brancher l'année réelle du client sur la génération

**Files:**
- Modify: `src/hooks/usePlanActions.ts:114-118`

- [ ] **Step 1: Passer `client.annee` à `generateSamplings`**

Dans `src/hooks/usePlanActions.ts`, remplacer la fonction `generateSamplingsForPlan` (lignes
114-118) :

```ts
  function generateSamplingsForPlan() {
    if (!client || !plan) return
    const year = Number(client.annee) || new Date().getFullYear()
    const updated = { ...plan, samplings: generateSamplings(plan, year) }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
  }
```

- [ ] **Step 2: Vérifier la compilation et les tests existants du hook**

Run: `npx tsc -b && npx vitest run --project unit src/hooks/__tests__/usePlanActions.test.ts`
Expected: PASS (aucun test existant ne devrait dépendre du comportement précis de l'année passée
à `generateSamplings`, seulement de l'appel).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePlanActions.ts
git commit -m "fix(samplings): passe l'année du client à generateSamplingsForPlan"
```

---

### Task 4: UI de configuration — sélection de fréquence et jour de semaine

**Files:**
- Modify: `src/components/plan/PlanConfigSection.tsx:10` (liste FREQUENCES), `:68-72` (nouveau champ)
- Modify: `src/components/demandes/demandesConfig.ts:26` (liste FREQUENCES du module Demandes)

- [ ] **Step 1: Ajouter `'Hebdomadaire'` à la liste des fréquences du plan**

Dans `src/components/plan/PlanConfigSection.tsx`, ligne 10 :

```ts
const FREQUENCES: FrequenceType[] = ['Hebdomadaire', 'Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Personnalisé']
```

- [ ] **Step 2: Ajouter le sélecteur "Jour de la semaine" conditionnel**

Dans `src/components/plan/PlanConfigSection.tsx`, ajouter l'import de `JOURS_LONG` en haut du
fichier (à côté des imports existants) :

```ts
import { JOURS_LONG } from '@/lib/planningUtils'
```

Juste après le bloc `<PlanField label="Fréquence">...</PlanField>` (lignes 68-72), ajouter :

```tsx
        {plan.frequence === 'Hebdomadaire' && (
          <PlanField label="Jour de la semaine">
            <select
              aria-label="Jour de la semaine"
              value={plan.defaultWeeklyDay}
              onChange={(e) => onUpdate('defaultWeeklyDay', parseInt(e.target.value))}
              className="field-input"
            >
              {JOURS_LONG.map((jour, i) => <option key={jour} value={i}>{jour}</option>)}
            </select>
          </PlanField>
        )}
```

- [ ] **Step 3: Contrôle visuel**

Run: `npm run dev`, ouvrir un plan existant, changer la fréquence sur "Hebdomadaire" dans la
Configuration : le champ "Jour de la semaine" doit apparaître avec "Lundi" sélectionné par défaut ;
le changer doit persister (indicateur "Sauvegarde…" visible brièvement).

- [ ] **Step 4: Ajouter `'Hebdomadaire'` à la liste des fréquences du module Demandes**

Dans `src/components/demandes/demandesConfig.ts`, ligne 26 :

```ts
export const FREQUENCES = ['', 'Hebdomadaire', 'Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Ponctuel']
```

- [ ] **Step 5: Lint et tests**

Run: `npm run lint && npm run test`
Expected: 0 erreur, tous les tests verts.

- [ ] **Step 6: Commit**

```bash
git add src/components/plan/PlanConfigSection.tsx src/components/demandes/demandesConfig.ts
git commit -m "feat(plan): UI de sélection du jour de semaine pour la fréquence Hebdomadaire"
```

---

### Task 5: Modale de drill-down mensuel filtrable par plan

**Files:**
- Modify: `src/components/planning/IssueListModal.tsx:15-53`

- [ ] **Step 1: Ajouter la prop `planId` optionnelle**

Dans `src/components/planning/IssueListModal.tsx`, modifier l'interface (lignes 15-22) :

```ts
interface IssueListModalProps {
  onClose: () => void
  type: 'overdue' | 'non_effectue' | 'month' | null
  month?: number
  planId?: string
  rows: { client: Client; plan: Plan; samplingsByMonth?: (Sampling | null)[]; pairsByMonth?: (Sampling | null)[][] }[]
  year: number
  preleveurs?: Preleveur[]
}
```

Et la signature du composant (ligne 24) :

```ts
export default function IssueListModal({ onClose, type, month, planId, rows, year, preleveurs = [] }: IssueListModalProps) {
```

- [ ] **Step 2: Filtrer par `planId` dans le calcul de `issues`**

Dans le `useMemo` (lignes 26-47), remplacer la condition `type === 'month'` (ligne 38) :

```ts
        } else if (type === 'month' && s.plannedMonth === month && (!planId || plan.id === planId)) {
          list.push({ client, plan, sampling: s, planYear })
        }
```

Et ajouter `planId` aux dépendances du `useMemo` (ligne 47) :

```ts
  }, [type, month, planId, rows, year])
```

- [ ] **Step 3: Adapter le titre quand `planId` est fourni**

Remplacer le calcul de `title` (lignes 51-53) :

```ts
  const planNom = planId ? rows.find(r => r.plan.id === planId)?.plan.nom : undefined
  const title = type === 'overdue' ? 'Prélèvements en retard'
    : type === 'non_effectue' ? 'Prélèvements non effectués'
    : planNom ? `${planNom} — ${MOIS_LONG[month ?? 0]} ${year}`
    : `Prélèvements — ${MOIS_LONG[month ?? 0]} ${year}`
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc -b`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add src/components/planning/IssueListModal.tsx
git commit -m "feat(planning): IssueListModal filtrable par plan en mode 'month'"
```

---

### Task 6: Agrégation mensuelle des occurrences hebdomadaires dans YearMatrixView

**Files:**
- Modify: `src/components/planning/YearMatrixView.tsx:23`, `:41-62`, `:182-188`, `:265-273`, `:291-300`

- [ ] **Step 1: Généraliser `pairsByMonth` aux plans Hebdomadaire**

Dans `src/components/planning/YearMatrixView.tsx`, remplacer le bloc de construction (lignes
44-62) :

```ts
        p.samplings.forEach(s => {
          if (!s) return
          if (s.plannedMonth >= 0 && s.plannedMonth < 12) {
            samplingsByMonth[s.plannedMonth] = s
            if (p.frequence === 'Bimensuel' || p.frequence === 'Hebdomadaire') {
              pairsByMonth[s.plannedMonth].push(s)
            }
          }
        })

        if (p.frequence === 'Bimensuel' || p.frequence === 'Hebdomadaire') {
          for (let m = 0; m < 12; m++) {
            const pair = pairsByMonth[m]
            if (pair.length > 0 && pair.every(s => s?.status === 'non_effectue')) {
              pairsByMonth[m] = []
              samplingsByMonth[m] = null
            }
          }
        }
```

- [ ] **Step 2: Remplacer l'état `monthModal` par un objet incluant un `planId` optionnel**

Remplacer la ligne 23 :

```ts
  const [monthModal, setMonthModal] = useState<{ month: number; planId?: string } | null>(null)
```

Mettre à jour l'ouverture depuis l'en-tête de mois (ligne 188, clic sur le libellé du mois — pas de
`planId`, comportement global inchangé) :

```ts
                        onClick={() => { setMonthModal({ month: i }); setFocusedMonth(i) }}
```

- [ ] **Step 3: Ajouter le callback `onOpenMonthModal` passé à chaque ligne de plan**

Dans le `.map` qui rend `YearMatrixPlanRow` (lignes 265-273), ajouter la prop :

```tsx
                    ...(!isCollapsed ? plans.map((row) => (
                      <YearMatrixPlanRow
                        key={`${row.client.id}-${row.plan.id}`}
                        row={row}
                        planYear={planYear}
                        onOpenIssueModal={setIssueModalType}
                        onOpenMonthModal={(month, planId) => setMonthModal({ month, planId })}
                        activeMonth={focusedMonth}
                      />
                    )) : [])
```

- [ ] **Step 4: Adapter le rendu de la modale au nouvel état**

Remplacer le bloc `{monthModal !== null && (...)}` (lignes 291-300) :

```tsx
      {monthModal !== null && (
        <IssueListModal
          type="month"
          month={monthModal.month}
          planId={monthModal.planId}
          rows={rows}
          year={year}
          preleveurs={preleveurs}
          onClose={() => setMonthModal(null)}
        />
      )}
```

- [ ] **Step 5: Vérifier la compilation (échec attendu à ce stade)**

Run: `npx tsc -b`
Expected: FAIL — `YearMatrixPlanRow` n'accepte pas encore la prop `onOpenMonthModal` (corrigé à la
Task 7). Confirmer que l'erreur pointe bien vers `YearMatrixPlanRow.tsx` / l'appel dans
`YearMatrixView.tsx`, pas ailleurs.

- [ ] **Step 6: Commit**

```bash
git add src/components/planning/YearMatrixView.tsx
git commit -m "feat(planning): agrège les occurrences hebdomadaires par mois dans YearMatrixView"
```

(Le commit se fait malgré l'échec de compilation transitoire — la Task 7 le corrige immédiatement
après. Si tu préfères ne jamais commiter un état rouge, fusionne les Tasks 6 et 7.)

---

### Task 7: Badge de synthèse pour les plans Hebdomadaire dans YearMatrixPlanRow

**Files:**
- Modify: `src/components/planning/YearMatrixPlanRow.tsx`

- [ ] **Step 1: Ajouter la prop `onOpenMonthModal` à l'interface**

Dans `src/components/planning/YearMatrixPlanRow.tsx`, modifier l'interface (lignes 6-12) :

```ts
interface YearMatrixPlanRowProps {
  row: RowData
  planYear: number
  onOpenIssueModal: (type: 'overdue' | 'non_effectue') => void
  onOpenMonthModal: (month: number, planId: string) => void
  isFirstInSite?: boolean
  activeMonth?: number | null
}
```

Et la signature du composant (ligne 60) :

```ts
export default function YearMatrixPlanRow({ row, planYear, onOpenIssueModal, onOpenMonthModal, isFirstInSite, activeMonth = null }: YearMatrixPlanRowProps) {
```

- [ ] **Step 2: Ajouter la branche `isHebdomadaire` dans le rendu des cellules**

Dans le `.map` sur `row.samplingsByMonth` (à partir de la ligne 80), ajouter la constante à côté de
`isBimensuel` (ligne 81) :

```ts
        const isBimensuel = row.plan.frequence === 'Bimensuel'
        const isHebdomadaire = row.plan.frequence === 'Hebdomadaire'
```

Puis, juste après le bloc `{isBimensuel ? ( ... ) : (` (qui se termine à la ligne 126 par le `) : (`
menant au rendu par défaut), insérer une branche intermédiaire — remplacer la structure
`{isBimensuel ? (...) : (...)}`  (lignes 90-154) par :

```tsx
            {isBimensuel ? (
              pair.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 mx-auto" style={{ width: 34 }}>
                  {(() => {
                    const priority = (ps: Sampling) => isSamplingOverdue(ps, planYear, isAuto) ? 3 : ps.status === 'planned' ? 2 : ps.status === 'done' ? 1 : 0
                    const sorted = [...pair].filter(Boolean).sort((a, b) => priority(b!) - priority(a!))
                    return sorted.slice(0, 2).map((ps, pi) => {
                      if (!ps) return null
                      const style = getSamplingBadgeStyle(ps, planYear, isAuto)
                      const isClickable = isSamplingOverdue(ps, planYear, isAuto) || ps.status === 'non_effectue'
                      return (
                        <button
                          type="button"
                          key={ps.id}
                          onClick={() => {
                            if (isSamplingOverdue(ps, planYear, isAuto)) onOpenIssueModal('overdue');
                            else if (ps.status === 'non_effectue') onOpenIssueModal('non_effectue')
                          }}
                          className={`${dotSize} rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm border ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-help'}`}
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            borderColor: style.border.split(' ')[2] || style.border
                          }}
                          title={`${MOIS_LONG[mIdx]} #${pi + 1} - ${getStatusLabel(ps, planYear, isAuto)}${ps.doneDate ? ` le ${ps.doneDate}` : ''}${isClickable ? ' — cliquer pour voir la liste' : ''}`}
                          aria-label={`${MOIS_LONG[mIdx]} #${pi + 1} - ${getStatusLabel(ps, planYear, isAuto)}`}
                        >
                          <span className={`${iconSize} font-bold leading-none`}>
                            {style.icon}
                          </span>
                        </button>
                      )
                    })
                  })()}
                </div>
              )
            ) : isHebdomadaire ? (
              pair.length > 0 && (() => {
                const occurrences = pair.filter((ps): ps is Sampling => ps !== null)
                const total = occurrences.length
                const doneCount = occurrences.filter(ps => ps.status === 'done').length
                const hasOverdue = occurrences.some(ps => isSamplingOverdue(ps, planYear, isAuto))
                const tone = hasOverdue ? 'danger' : doneCount === total ? 'success' : 'warning'
                const toneStyle = {
                  success: { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
                  warning: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
                  danger:  { bg: 'var(--color-danger-light)',  text: 'var(--color-danger)' },
                }[tone]
                return (
                  <button
                    type="button"
                    onClick={() => onOpenMonthModal(mIdx, row.plan.id)}
                    className="mx-auto flex items-center justify-center rounded-full text-[10px] font-bold leading-none transition-all hover:scale-110 shadow-sm cursor-pointer active:scale-95"
                    style={{ width: 34, height: 20, backgroundColor: toneStyle.bg, color: toneStyle.text }}
                    title={`${MOIS_LONG[mIdx]} — ${doneCount}/${total} fait${doneCount > 1 ? 's' : ''} — cliquer pour voir le détail`}
                    aria-label={`${MOIS_LONG[mIdx]} — ${doneCount} sur ${total} fait`}
                  >
                    {doneCount}/{total}
                  </button>
                )
              })()
            ) : (
              s && (
                (() => {
                  const style = getSamplingBadgeStyle(s, planYear, isAuto)
                  const isClickable = isSamplingOverdue(s, planYear, isAuto) || s.status === 'non_effectue'
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSamplingOverdue(s, planYear, isAuto)) onOpenIssueModal('overdue');
                        else if (s.status === 'non_effectue') onOpenIssueModal('non_effectue')
                      }}
                      className={`mx-auto ${dotSize} rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm border ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-help'}`}
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        borderColor: style.border.split(' ')[2] || style.border
                      }}
                      title={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s, planYear, isAuto)}${s.doneDate ? ` le ${s.doneDate}` : ''}${isClickable ? ' — cliquer pour voir la liste' : ''}`}
                      aria-label={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s, planYear, isAuto)}`}
                    >
                      <span className={`${iconSize} font-bold leading-none`}>
                        {style.icon}
                      </span>
                    </button>
                  )
                })()
              )
            )}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc -b` (⚠️ pas `npx tsc --noEmit` — le `tsconfig.json` racine a `"files": []` avec des
project references, donc `--noEmit` seul ne type-check rien du tout ; `-b` est la commande utilisée
par `npm run build` et la seule qui vérifie réellement le projet)
Expected: aucune erreur.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add src/components/planning/YearMatrixPlanRow.tsx
git commit -m "feat(planning): badge de synthèse + drill-down pour les plans Hebdomadaire"
```

---

### Task 8: Vérification finale et contrôle visuel

**Files:** aucun changement de code — vérification uniquement.

- [ ] **Step 1: Suite de tests complète**

Run: `npm run test`
Expected: tous les tests verts (415+ existants + les 8 nouveaux tests `Hebdomadaire` de la Task 2).

- [ ] **Step 2: Lint et build**

Run: `npm run lint && npm run build`
Expected: 0 erreur ESLint, build Vite réussi.

- [ ] **Step 3: react-doctor sur le diff**

Run: `npx react-doctor@latest --verbose --scope changed`
Expected: revoir chaque finding — corriger les vrais positifs, documenter les faux positifs
(cf. `.react-doctor/false-positives.md`) avant de continuer.

- [ ] **Step 4: Contrôle visuel dans le navigateur**

Run: `npm run dev`, puis dans l'app :
1. Ouvrir un plan existant → Configuration → changer la fréquence en "Hebdomadaire" → vérifier
   que le sélecteur "Jour de la semaine" apparaît, choisir "Lundi".
2. Cliquer "Générer" dans la section Prélèvements → vérifier ~52 lignes générées, toutes sur un
   lundi (colonne Date).
3. Aller dans Missions → Vue annuelle → repérer ce plan → vérifier que chaque case de mois affiche
   un badge `"N/N"` (pas des pastilles individuelles) coloré selon la conformité.
4. Cliquer sur un badge → vérifier que la modale s'ouvre, titrée avec le nom du plan et le mois,
   et ne liste que les occurrences de ce plan pour ce mois (pas celles des autres plans/clients).
5. Cliquer sur l'en-tête d'un mois (comportement existant) → vérifier que la modale globale
   (tous plans confondus) s'ouvre toujours normalement — non-régression du drill-down existant.

- [ ] **Step 5: Commit final si des ajustements ont eu lieu pendant le contrôle visuel**

```bash
git add -A
git commit -m "fix(planning): ajustements post contrôle visuel — fréquence Hebdomadaire"
```

(Ne committer que s'il y a effectivement eu des changements du Step 4 — sinon, rien à faire.)
