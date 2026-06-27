# Audit Clean Code automatisé — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire un collecteur de métriques Clean Code déterministe (`node scripts/clean-code-audit.mjs` → `audit-data.json`) plus un fichier de prompt et une routine `/schedule` hebdomadaire qui fait juger les points chauds par un agent Claude et committe un rapport de tendance.

**Architecture :** Un script Node ESM agrège react-doctor (`--json`), ESLint (config audit dédiée, JSON), une marche des fichiers `src/` (LOC) et jscpd (duplication) en un seul `audit-data.json` contenant des métriques globales + une liste de hotspots. Un score global 0-100 est calculé par formule déterministe. Un agent Claude programmé (lundi 8h) lance le script, juge le top des hotspots, calcule le delta vs l'audit précédent et committe `docs/audits/YYYY-MM-DD-clean-code.md`.

**Tech Stack :** Node ESM, `node:test` (tests du tooling, séparés de Vitest), ESLint flat config, jscpd, react-doctor, `/schedule` (agent cloud Claude Code).

Spec de référence : `docs/superpowers/specs/2026-06-27-audit-clean-code-design.md`

---

## Structure de fichiers

| Fichier | Rôle |
|---------|------|
| `scripts/audit/score.mjs` (create) | Pur. `computeScore(metrics)` → `{ score, subScores }`. |
| `scripts/audit/parsers.mjs` (create) | Pur. Parse les sorties JSON de react-doctor / ESLint / jscpd → métriques + hotspots. |
| `scripts/audit/collect.mjs` (create) | IO. Lance les outils, lit les fichiers `src/`, appelle parsers + score. |
| `scripts/clean-code-audit.mjs` (create) | Entrée CLI. Appelle `collect`, écrit `audit-data.json`. |
| `scripts/audit/__tests__/score.test.mjs` (create) | Tests `node:test` du score. |
| `scripts/audit/__tests__/parsers.test.mjs` (create) | Tests `node:test` des parsers. |
| `eslint.audit.config.js` (create) | Config ESLint dédiée audit (seuils Clean Code stricts). |
| `docs/audits/_AUDIT_PROMPT.md` (create) | Instructions versionnées de l'agent d'audit. |
| `.gitignore` (modify) | Ignorer `.audit-tmp/`. |
| `package.json` (modify) | devDep `jscpd` + script `audit`. |

Note de testabilité : `score.mjs` et `parsers.mjs` sont des fonctions pures testées via le runner intégré `node:test` (`node --test`), volontairement **hors** de la suite Vitest de l'app (le tooling d'audit n'est pas du code applicatif). `collect.mjs` lance des sous-process : il reste mince et est vérifié manuellement par un run réel.

---

### Task 1: Setup — dépendance jscpd, gitignore, script npm

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Installer jscpd en devDependency**

Run:
```bash
npm install --save-dev jscpd@^5.0.11
```
Expected: `package.json` gagne `"jscpd"` sous `devDependencies`, install sans erreur.

- [ ] **Step 2: Ajouter le script `audit` à package.json**

Dans `package.json`, section `"scripts"`, ajouter la ligne après `"doctor"` :

```json
    "audit": "node scripts/clean-code-audit.mjs",
```

- [ ] **Step 3: Ignorer le dossier temporaire d'audit**

Ajouter à la fin de `.gitignore` :

```
# Audit Clean Code — données intermédiaires non versionnées
.audit-tmp/
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore(audit): ajoute jscpd, script audit et gitignore .audit-tmp"
```

---

### Task 2: Config ESLint d'audit

Config séparée, **non branchée** sur `npm run lint` ni sur le build. Elle sert
uniquement à produire des métriques Clean Code (complexité, longueur, imbrication).

**Files:**
- Create: `eslint.audit.config.js`

- [ ] **Step 1: Créer eslint.audit.config.js**

```js
// Config ESLint dédiée à l'audit Clean Code.
// NE PAS brancher sur `npm run lint` ni sur le build : c'est un outil de MESURE.
// Lancée par scripts/audit/collect.mjs via `eslint -c eslint.audit.config.js -f json`.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', '**/*.stories.tsx', '**/__tests__/**']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2020 },
    // On ne garde QUE les règles métriques, en `warn`, pour ne jamais bloquer.
    rules: {
      complexity: ['warn', 10],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 4],
    },
  },
])
```

- [ ] **Step 2: Vérifier que la config tourne et sort du JSON**

Run:
```bash
npx eslint -c eslint.audit.config.js -f json "src/**/*.{ts,tsx}" > /tmp/audit-eslint.json 2>/dev/null; node -e "const a=require('/tmp/audit-eslint.json');console.log('files:',a.length,'first ruleIds:',[...new Set(a.flatMap(f=>f.messages.map(m=>m.ruleId)))].slice(0,8))"
```
Expected : un tableau de fichiers, et des ruleId parmi `complexity`, `max-lines-per-function`, `max-lines`, `max-depth`, `max-params` (sans erreur de parsing JSON).

- [ ] **Step 3: Commit**

```bash
git add eslint.audit.config.js
git commit -m "chore(audit): config ESLint dédiée aux métriques Clean Code"
```

---

### Task 3: Module de score (TDD, pur)

**Files:**
- Create: `scripts/audit/score.mjs`
- Test: `scripts/audit/__tests__/score.test.mjs`

Forme attendue de `metrics` en entrée :
```
{
  reactDoctor: { errorCount, warningCount, affectedFileCount, sourceFileCount },
  eslintAudit: { complexityCount, longFunctionCount, longFileCount, deepNestingCount, manyParamsCount, filesLinted },
  duplication: { percentage },            // % de lignes dupliquées (0-100)
  files: { total, oversizedCount, largest } // largest: [{ file, loc }]
}
```

- [ ] **Step 1: Écrire le test qui échoue**

`scripts/audit/__tests__/score.test.mjs` :
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeScore } from '../score.mjs'

const metrics = {
  reactDoctor: { errorCount: 0, warningCount: 10, affectedFileCount: 8, sourceFileCount: 100 },
  eslintAudit: { complexityCount: 3, longFunctionCount: 5, longFileCount: 0, deepNestingCount: 0, manyParamsCount: 0, filesLinted: 100 },
  duplication: { percentage: 5 },
  files: { total: 100, oversizedCount: 2, largest: [] },
}

test('computeScore: composite et sous-scores déterministes', () => {
  const { score, subScores } = computeScore(metrics)
  assert.equal(subScores.reactDoctor, 90)   // 100 - (10/100)*100
  assert.equal(subScores.duplication, 95)   // 100 - 5
  assert.equal(subScores.longFunctions, 85) // 100 - (5/100)*300
  assert.equal(subScores.complexity, 91)    // 100 - (3/100)*300
  assert.equal(subScores.bigFiles, 94)      // 100 - (2/100)*300
  // 0.40*90 + 0.20*95 + 0.20*85 + 0.10*91 + 0.10*94 = 90.5 → round → 91
  assert.equal(score, 91)
})

test('computeScore: base nulle → sous-score plein (pas de division par zéro)', () => {
  const empty = {
    reactDoctor: { errorCount: 0, warningCount: 0, affectedFileCount: 0, sourceFileCount: 0 },
    eslintAudit: { complexityCount: 0, longFunctionCount: 0, longFileCount: 0, deepNestingCount: 0, manyParamsCount: 0, filesLinted: 0 },
    duplication: { percentage: 0 },
    files: { total: 0, oversizedCount: 0, largest: [] },
  }
  const { score } = computeScore(empty)
  assert.equal(score, 100)
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node --test scripts/audit/__tests__/score.test.mjs`
Expected: FAIL — `Cannot find module '../score.mjs'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`scripts/audit/score.mjs` :
```js
// Score Clean Code déterministe (0-100, plus haut = mieux).
// Pondération fixée par le design : react-doctor 40, duplication 20,
// fonctions longues 20, complexité 10, gros fichiers 10.
// Les facteurs de densité sont des points de départ à recalibrer après le 1er run réel.

const clamp = (n) => Math.max(0, Math.min(100, n))
const round1 = (n) => Math.round(n * 10) / 10

// Sous-score décroissant avec la densité de violations rapportée à une base.
function densityScore(count, base, factor) {
  if (base <= 0) return 100
  return clamp(100 - (count / base) * factor)
}

export function computeScore(m) {
  const reactDoctor = densityScore(
    m.reactDoctor.errorCount * 3 + m.reactDoctor.warningCount,
    m.reactDoctor.sourceFileCount,
    100,
  )
  const duplication = clamp(100 - m.duplication.percentage)
  const longFunctions = densityScore(m.eslintAudit.longFunctionCount, m.eslintAudit.filesLinted, 300)
  const complexity = densityScore(m.eslintAudit.complexityCount, m.eslintAudit.filesLinted, 300)
  const bigFiles = densityScore(m.files.oversizedCount, m.files.total, 300)

  const score = Math.round(
    0.40 * reactDoctor +
    0.20 * duplication +
    0.20 * longFunctions +
    0.10 * complexity +
    0.10 * bigFiles,
  )

  return {
    score,
    subScores: {
      reactDoctor: round1(reactDoctor),
      duplication: round1(duplication),
      longFunctions: round1(longFunctions),
      complexity: round1(complexity),
      bigFiles: round1(bigFiles),
    },
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `node --test scripts/audit/__tests__/score.test.mjs`
Expected: PASS — 2 tests passent.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit/score.mjs scripts/audit/__tests__/score.test.mjs
git commit -m "feat(audit): score Clean Code déterministe pondéré"
```

---

### Task 4: Parsers (TDD, purs)

Convertissent les sorties JSON brutes des outils en `{ metrics partielles, hotspots }`.

**Files:**
- Create: `scripts/audit/parsers.mjs`
- Test: `scripts/audit/__tests__/parsers.test.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

`scripts/audit/__tests__/parsers.test.mjs` :
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseReactDoctor, parseEslint, parseJscpd } from '../parsers.mjs'

test('parseReactDoctor: extrait counts, sourceFileCount et hotspots', () => {
  const json = {
    projects: [{ project: { sourceFileCount: 282 } }],
    summary: { errorCount: 2, warningCount: 39, affectedFileCount: 30 },
    diagnostics: [
      { filePath: 'src/a.tsx', rule: 'no-x', severity: 'error', category: 'Security', line: 10 },
      { filePath: 'src/b.tsx', rule: 'no-y', severity: 'warning', category: 'Perf', line: 5 },
    ],
  }
  const r = parseReactDoctor(json)
  assert.equal(r.metrics.errorCount, 2)
  assert.equal(r.metrics.warningCount, 39)
  assert.equal(r.metrics.affectedFileCount, 30)
  assert.equal(r.metrics.sourceFileCount, 282)
  assert.equal(r.hotspots.length, 2)
  assert.deepEqual(r.hotspots[0], {
    file: 'src/a.tsx', source: 'react-doctor', type: 'no-x',
    severity: 'error', detail: 'Security', line: 10,
  })
})

test('parseEslint: compte par règle et produit des hotspots', () => {
  const json = [
    { filePath: '/p/src/a.tsx', messages: [
      { ruleId: 'complexity', severity: 1, line: 3, message: 'too complex' },
      { ruleId: 'max-lines-per-function', severity: 1, line: 1, message: 'too long' },
    ] },
    { filePath: '/p/src/b.tsx', messages: [
      { ruleId: 'max-lines', severity: 1, line: 1, message: 'file too long' },
      { ruleId: null, severity: 1, line: 0, message: 'parsing-ish' },
    ] },
  ]
  const r = parseEslint(json)
  assert.equal(r.metrics.complexityCount, 1)
  assert.equal(r.metrics.longFunctionCount, 1)
  assert.equal(r.metrics.longFileCount, 1)
  assert.equal(r.metrics.deepNestingCount, 0)
  assert.equal(r.metrics.manyParamsCount, 0)
  assert.equal(r.metrics.filesLinted, 2)
  assert.equal(r.hotspots.length, 3) // ruleId null ignoré
})

test('parseJscpd: extrait le pourcentage de duplication', () => {
  const json = { statistics: { total: { percentage: 4.2, duplicatedLines: 120 } } }
  const r = parseJscpd(json)
  assert.equal(r.metrics.percentage, 4.2)
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node --test scripts/audit/__tests__/parsers.test.mjs`
Expected: FAIL — `Cannot find module '../parsers.mjs'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`scripts/audit/parsers.mjs` :
```js
// Parsers purs : JSON brut des outils → { metrics, hotspots }.
import path from 'node:path'

const RULE_TO_METRIC = {
  complexity: 'complexityCount',
  'max-lines-per-function': 'longFunctionCount',
  'max-lines': 'longFileCount',
  'max-depth': 'deepNestingCount',
  'max-params': 'manyParamsCount',
}

export function parseReactDoctor(json) {
  const s = json.summary ?? {}
  const sourceFileCount = json.projects?.[0]?.project?.sourceFileCount ?? 0
  const diagnostics = json.diagnostics ?? []
  return {
    metrics: {
      errorCount: s.errorCount ?? 0,
      warningCount: s.warningCount ?? 0,
      affectedFileCount: s.affectedFileCount ?? 0,
      sourceFileCount,
    },
    hotspots: diagnostics.map((d) => ({
      file: d.filePath,
      source: 'react-doctor',
      type: d.rule,
      severity: d.severity,
      detail: d.category,
      line: d.line,
    })),
  }
}

export function parseEslint(json) {
  const metrics = {
    complexityCount: 0, longFunctionCount: 0, longFileCount: 0,
    deepNestingCount: 0, manyParamsCount: 0, filesLinted: json.length,
  }
  const hotspots = []
  for (const f of json) {
    for (const msg of f.messages ?? []) {
      const metricKey = RULE_TO_METRIC[msg.ruleId]
      if (!metricKey) continue
      metrics[metricKey] += 1
      hotspots.push({
        file: path.relative(process.cwd(), f.filePath),
        source: 'eslint',
        type: msg.ruleId,
        severity: 'warning',
        detail: msg.message,
        line: msg.line,
      })
    }
  }
  return { metrics, hotspots }
}

export function parseJscpd(json) {
  const total = json.statistics?.total ?? {}
  return {
    metrics: { percentage: total.percentage ?? 0 },
    hotspots: (json.duplicates ?? []).map((d) => ({
      file: d.firstFile?.name ?? d.firstFile,
      source: 'jscpd',
      type: 'duplication',
      severity: 'warning',
      detail: `${d.fragment ? 'fragment' : ''} ${d.lines ?? ''} lignes dupliquées`.trim(),
      line: d.firstFile?.start ?? null,
    })),
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `node --test scripts/audit/__tests__/parsers.test.mjs`
Expected: PASS — 3 tests passent.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit/parsers.mjs scripts/audit/__tests__/parsers.test.mjs
git commit -m "feat(audit): parsers react-doctor / eslint / jscpd"
```

---

### Task 5: Collecteur IO + entrée CLI

Lance les outils, marche les fichiers `src/`, assemble `audit-data.json`.

**Files:**
- Create: `scripts/audit/collect.mjs`
- Create: `scripts/clean-code-audit.mjs`

- [ ] **Step 1: Écrire le collecteur**

`scripts/audit/collect.mjs` :
```js
// Couche IO : lance les outils, lit les fichiers, agrège via les parsers + le score.
// Dégrade proprement : si un outil échoue, sa métrique est neutre plutôt que de tout casser.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseReactDoctor, parseEslint, parseJscpd } from './parsers.mjs'
import { computeScore } from './score.mjs'

const OVERSIZED_FILE_LOC = 300

function runJson(file, args, label) {
  try {
    const out = execFileSync(file, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    return JSON.parse(out)
  } catch (e) {
    // jscpd/eslint sortent en code ≠ 0 quand ils trouvent des violations : on tente quand même le stdout.
    if (e.stdout) {
      try { return JSON.parse(e.stdout.toString()) } catch { /* ignore */ }
    }
    console.warn(`[audit] ${label} indisponible: ${e.message.split('\n')[0]}`)
    return null
  }
}

async function walkSrcFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue
      files.push(...(await walkSrcFiles(full)))
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.stories.tsx')) {
      files.push(full)
    }
  }
  return files
}

async function collectFileLoc() {
  const files = await walkSrcFiles(path.resolve('src'))
  const sizes = []
  for (const f of files) {
    const loc = (await readFile(f, 'utf8')).split('\n').length
    sizes.push({ file: path.relative(process.cwd(), f), loc })
  }
  sizes.sort((a, b) => b.loc - a.loc)
  return {
    total: sizes.length,
    oversizedCount: sizes.filter((s) => s.loc > OVERSIZED_FILE_LOC).length,
    largest: sizes.slice(0, 10),
  }
}

export async function collectAudit() {
  // 1. react-doctor
  const rdJson = runJson('npx', ['react-doctor@latest', '--json'], 'react-doctor')
  const rd = rdJson ? parseReactDoctor(rdJson)
    : { metrics: { errorCount: 0, warningCount: 0, affectedFileCount: 0, sourceFileCount: 0 }, hotspots: [] }

  // 2. eslint audit config
  const esJson = runJson('npx', ['eslint', '-c', 'eslint.audit.config.js', '-f', 'json', 'src/**/*.{ts,tsx}'], 'eslint-audit')
  const es = esJson ? parseEslint(esJson)
    : { metrics: { complexityCount: 0, longFunctionCount: 0, longFileCount: 0, deepNestingCount: 0, manyParamsCount: 0, filesLinted: 0 }, hotspots: [] }

  // 3. jscpd (rapport JSON en stdout)
  const jscpdJson = runJson('npx', ['jscpd', 'src', '--silent', '--reporters', 'json', '--output', '.audit-tmp/jscpd'], 'jscpd')
    ?? readJscpdReportFallback()
  const dup = jscpdJson ? parseJscpd(jscpdJson) : { metrics: { percentage: 0 }, hotspots: [] }

  // 4. LOC fichiers
  const files = await collectFileLoc()

  const metrics = {
    reactDoctor: rd.metrics,
    eslintAudit: es.metrics,
    duplication: dup.metrics,
    files: { total: files.total, oversizedCount: files.oversizedCount, largest: files.largest },
  }
  const { score, subScores } = computeScore(metrics)

  const hotspots = [...rd.hotspots, ...es.hotspots, ...dup.hotspots]

  return {
    generatedAt: new Date().toISOString(),
    score,
    subScores,
    metrics,
    hotspots,
  }
}

// jscpd écrit aussi .audit-tmp/jscpd/jscpd-report.json ; fallback si le stdout n'était pas du JSON.
function readJscpdReportFallback() {
  try {
    return JSON.parse(readFileSync('.audit-tmp/jscpd/jscpd-report.json', 'utf8'))
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Écrire l'entrée CLI**

`scripts/clean-code-audit.mjs` :
```js
#!/usr/bin/env node
// Entrée CLI de l'audit Clean Code. Écrit .audit-tmp/audit-data.json (non versionné).
import { mkdir, writeFile } from 'node:fs/promises'
import { collectAudit } from './audit/collect.mjs'

const OUT = '.audit-tmp/audit-data.json'

const data = await collectAudit()
await mkdir('.audit-tmp', { recursive: true })
await writeFile(OUT, JSON.stringify(data, null, 2))

console.log(`[audit] Score global : ${data.score}/100`)
console.log(`[audit] Sous-scores  :`, data.subScores)
console.log(`[audit] Hotspots     : ${data.hotspots.length}`)
console.log(`[audit] Écrit dans ${OUT}`)
```

- [ ] **Step 3: Run réel de bout en bout**

Run: `npm run audit`
Expected : affiche un score `/100`, les sous-scores, un nombre de hotspots, et écrit `.audit-tmp/audit-data.json`. (Le premier run télécharge jscpd/react-doctor via npx — peut prendre 1-2 min.)

- [ ] **Step 4: Vérifier le contenu du JSON**

Run: `node -e "const d=require('./.audit-tmp/audit-data.json');console.log('score',d.score,'keys',Object.keys(d.metrics),'hotspots',d.hotspots.length)"`
Expected : `score` numérique, `metrics` avec `reactDoctor/eslintAudit/duplication/files`, hotspots > 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit/collect.mjs scripts/clean-code-audit.mjs
git commit -m "feat(audit): collecteur IO + entrée CLI clean-code-audit"
```

---

### Task 6: Fichier de prompt de l'agent d'audit

Instructions versionnées de l'agent (étapes décrites dans le design). Ajustables sans recréer la routine.

**Files:**
- Create: `docs/audits/_AUDIT_PROMPT.md`

- [ ] **Step 1: Créer le prompt**

`docs/audits/_AUDIT_PROMPT.md` :
```markdown
# Prompt — Agent d'audit Clean Code hebdomadaire

Tu es l'agent d'audit Clean Code de Labocea PMC V2. Mission : produire le rapport
hebdomadaire. Tu RAPPORTES, tu ne refactores PAS le code applicatif.

## Étapes

1. Lance le collecteur déterministe :
   `npm run audit`
   Il écrit `.audit-tmp/audit-data.json` (score global, sous-scores, métriques, hotspots).

2. Lis `.audit-tmp/audit-data.json`.

3. Lis `.react-doctor/false-positives.md`. Tout hotspot correspondant à un faux
   positif documenté est ÉCARTÉ du top refactorings (et listé en section 5).

4. Trie les hotspots restants par sévérité puis par impact estimé. Ouvre et lis les
   fichiers du **top 10**. Pour chacun, juge qualitativement la conformité Clean Code :
   nommage révélateur d'intention, responsabilité unique, niveaux d'abstraction
   cohérents, gestion d'erreurs, duplication. Sois concret (cite la fonction / la ligne).

5. Calcule le delta : trouve le rapport le plus récent déjà présent dans
   `docs/audits/` (fichiers `YYYY-MM-DD-clean-code.md`, hors fichiers `_`). Compare le
   score global et chaque sous-score.

6. Écris `docs/audits/<DATE_DU_JOUR>-clean-code.md` avec EXACTEMENT cette structure :

   ## En-tête
   - Date, **score global /100**, delta vs précédent (↑/↓ + valeur, ou « 1er audit »).

   ## Métriques
   Tableau : métrique | valeur | variation vs précédent.
   (react-doctor erreurs/warnings, duplication %, fonctions > 50 lignes,
   complexité > 10, fichiers > 300 lignes.)

   ## Tendance
   1-2 phrases expliquant le mouvement du score (ex. « duplication ↑ à cause de X »).

   ## Top refactorings priorisés
   Tableau : fichier | problème | principe Clean Code violé | effort (S/M/L) | impact (faible/moyen/fort).

   ## Faux positifs ignorés
   Liste des hotspots écartés grâce à `.react-doctor/false-positives.md`.

7. Commit (et push) UNIQUEMENT le rapport :
   `git add docs/audits/<DATE_DU_JOUR>-clean-code.md`
   Message : `chore(audit): clean code <SCORE>/100 (<DELTA>) — semaine <DATE_DU_JOUR>`

## Garde-fous
- Ne modifie aucun fichier sous `src/`.
- Ne committe pas `.audit-tmp/`.
- Si `npm run audit` échoue, écris quand même un rapport minimal signalant l'échec
  et committe-le, pour garder une trace dans l'historique.
```

- [ ] **Step 2: Commit**

```bash
git add docs/audits/_AUDIT_PROMPT.md
git commit -m "docs(audit): prompt versionné de l'agent d'audit hebdomadaire"
```

---

### Task 7: Routine programmée `/schedule`

Création de la routine cron hebdomadaire. Étape **interactive** (l'utilisateur lance `/schedule`).

**Files:** aucun (configuration via la skill `/schedule`).

- [ ] **Step 1: Vérifier que tout est poussé sur main**

Run: `git status && git log --oneline -3`
Expected : working tree clean, les commits des tasks 1-6 présents. Si besoin : `git push`.

- [ ] **Step 2: Créer la routine via la skill schedule**

Dans Claude Code, invoquer `/schedule` et créer une routine avec :
- **Cron** : tous les lundis à 08:00 (Europe/Paris).
- **Prompt** : « Exécute l'audit Clean Code hebdomadaire en suivant exactement les instructions de `docs/audits/_AUDIT_PROMPT.md`. »
- **Repo / working dir** : `app-pmc-v2`, branche `main`.

(La skill `/schedule` gère la création du cloud agent ; suivre ses étapes.)

- [ ] **Step 3: Run de validation immédiat**

Déclencher la routine une fois manuellement (option « run now » de `/schedule`).
Expected : un nouveau fichier `docs/audits/YYYY-MM-DD-clean-code.md` est committé sur
`main` avec un score et un top refactorings ; `.audit-tmp/` n'est PAS committé.

- [ ] **Step 4: Vérifier le rapport généré**

Run: `git pull && ls docs/audits/ && git log --oneline -1`
Expected : le rapport du jour est présent, le message de commit contient `clean code <score>/100`.

---

## Self-Review

- **Couverture spec** : moteur hybride (script déterministe Tasks 2-5 + agent IA Task 6) ✓ ; cadence hebdo lundi 8h (Task 7) ✓ ; exécution cloud `/schedule` (Task 7) ✓ ; rapport committé `docs/audits/` (Task 6) ✓ ; score formule déterministe 40/20/20/10/10 (Task 3) ✓ ; jscpd devDep (Task 1) ✓ ; config ESLint séparée non bloquante (Task 2) ✓ ; faux positifs écartés (Task 6, étape 3) ✓ ; `.audit-tmp/` gitignore (Task 1) ✓ ; dégradation propre si un outil échoue (Task 5, `runJson`) ✓.
- **Hors périmètre respecté** : pas de notif externe, pas d'auto-refacto (garde-fou Task 6), pas de branchement build/CI (config audit séparée Task 2). ✓
- **Cohérence des types** : `computeScore` consomme exactement la forme `metrics` assemblée dans `collect.mjs` (`reactDoctor/eslintAudit/duplication/files`) ✓ ; les clés de sous-scores (`reactDoctor/duplication/longFunctions/complexity/bigFiles`) sont identiques entre `score.mjs` et son test ✓ ; `RULE_TO_METRIC` mappe vers les mêmes clés que celles lues par `computeScore` (`complexityCount`, `longFunctionCount`) ✓.
- **Note connue** : react-doctor v0.5.x renvoie `summary.score = null` ; c'est pourquoi le sous-score react-doctor est dérivé des counts (erreurs×3 + warnings) et non du score natif. Voulu.
```
