# Audit Clean Code automatisé — Design

Date : 2026-06-27
Statut : validé, prêt pour plan d'implémentation

## Objectif

Vérifier automatiquement et régulièrement que l'app Labocea PMC V2 respecte les
préconisations actuelles de Clean Code, au-delà de ce que react-doctor couvre déjà
(centré React/perf/a11y). Produire chaque semaine un rapport de tendance versionné,
avec un score global reproductible et une liste priorisée de refactorings.

## Ce qui existe déjà (à ne pas réinventer)

- `npm run doctor` — react-doctor à la demande
- hook pre-commit — react-doctor `--staged --fail-on warning` sur fichiers stagés
- GitHub Action `react-doctor.yml` — sur chaque PR vers `main`
- ESLint (`eslint.config.js`) + Vitest
- `.react-doctor/false-positives.md` — faux positifs documentés
- skills `react-doctor`, `tester-code`, `code-review`

Le manque comblé ici : **un audit périodique programmé** (cadence), avec
**couverture Clean Code généraliste** (DRY, longueur de fonctions, complexité,
imbrication) et **une synthèse unique** avec score et tendance.

## Décisions

- **Moteur : hybride.** Le déterministe calcule les métriques et repère les points
  chauds ; l'IA ne juge que les zones signalées (limite le coût en tokens).
- **Cadence : hebdomadaire**, lundi 8h. Ajustable à 2 semaines si trop bruyant.
- **Exécution : cloud** via `/schedule` (agent Claude programmé), pour tourner même
  Mac éteint et committer directement le rapport.
- **Livraison : rapport markdown committé** dans `docs/audits/`, historique versionné.
  Le résumé (score + delta) va dans le message de commit → visible dans `git log`.

## Architecture

```
scripts/clean-code-audit.mjs  (collecteur déterministe)
  ├─ react-doctor --json
  ├─ eslint -f json  (config audit dédiée, seuils stricts)
  ├─ walk src/**/*.{ts,tsx}  → LOC par fichier
  └─ jscpd  → % duplication
        │
        ▼  audit-data.json  (scratch, NON committé)
        │
Agent Claude programmé (/schedule, lundi 8h)
  1. lance le script
  2. lit audit-data.json (métriques + hotspots)
  3. ouvre le top 10 hotspots et juge (naming, SRP, niveaux d'abstraction, erreurs)
  4. écarte les faux positifs connus (.react-doctor/false-positives.md)
  5. calcule le delta vs audit précédent
  6. écrit docs/audits/YYYY-MM-DD-clean-code.md + commit
```

Le **chiffre** vient du déterministe (reproductible). Le **jugement** vient de l'IA,
seulement sur les hotspots.

## Composant 1 — Collecteur déterministe

Fichier : `scripts/clean-code-audit.mjs` (Node ESM, lançable via `node scripts/clean-code-audit.mjs`).

Agrège, sans rien inventer, dans un seul JSON :

| Source | Données extraites | Principe Clean Code |
|--------|-------------------|----------------------|
| `react-doctor --json` | score React, warnings | perf / a11y / archi React |
| `eslint -f json` (config audit) | `complexity`, `max-lines`, `max-lines-per-function`, `max-depth`, `max-params` | fonctions courtes, faible imbrication |
| walk `src/**/*.{ts,tsx}` | LOC par fichier, classement des plus gros | fichiers focalisés |
| `jscpd` | % de duplication | DRY |

- **Sortie** : `audit-data.json` = `{ metrics: {...}, hotspots: [{ file, type, value, severity }] }`.
  Écrit dans le répertoire scratch / `.audit-tmp/`, **non committé** (ajouter au `.gitignore`).
- **Config ESLint d'audit séparée** : nouveau fichier (ex. `eslint.audit.config.js`)
  avec les seuils Clean Code stricts. Ne doit **pas** être branché sur `npm run lint`
  ni casser le build — c'est un outil de mesure, pas une barrière.
- **Dépendance dev ajoutée : `jscpd`** (validé).
- Le script doit dégrader proprement si une source échoue (ex. react-doctor indispo) :
  il marque la métrique manquante plutôt que de planter tout l'audit.

### Seuils ESLint d'audit (point de départ)

- `complexity`: warn ≥ 10
- `max-lines-per-function`: warn ≥ 50
- `max-lines`: warn ≥ 300 (par fichier)
- `max-depth`: warn ≥ 4
- `max-params`: warn ≥ 4

Ces seuils définissent ce qui devient un « hotspot ». Ajustables après le premier run.

## Composant 2 — Score global (formule déterministe)

Calculé par le script, **pas par l'IA**, pour une tendance honnête. Sur 100 :

| Dimension | Poids |
|-----------|-------|
| react-doctor | 40 % |
| duplication (jscpd) | 20 % |
| fonctions trop longues | 20 % |
| complexité cyclomatique | 10 % |
| fichiers trop gros | 10 % |

L'IA n'altère pas le chiffre — elle l'explique et priorise les actions.
La formule exacte de normalisation de chaque dimension (de la métrique brute vers
un sous-score 0-100) sera définie à l'implémentation ; point de départ : pénalité
proportionnelle au nombre de violations rapporté à la taille du codebase.

## Composant 3 — Rapport

Fichier : `docs/audits/YYYY-MM-DD-clean-code.md`.

1. **En-tête** : date, score global, **delta vs audit précédent** (↑/↓ + valeur)
2. **Tableau métriques** : chaque chiffre + sa variation semaine/semaine
3. **Tendance** : 1-2 phrases d'explication (« duplication ↑ à cause de X »)
4. **Top refactorings priorisés** : tableau `fichier | problème | principe violé | effort | impact`
5. **Faux positifs ignorés** : ce que l'IA a écarté en lisant `.react-doctor/false-positives.md`

Le **message de commit** reprend `score + delta` (ex. `chore(audit): clean code 73/100 (+2) — semaine 2026-06-27`).

Le delta se calcule en lisant le fichier d'audit le plus récent déjà présent dans
`docs/audits/` avant d'écrire le nouveau.

## Composant 4 — Programmation (`/schedule`)

- Routine cron : **tous les lundis 8h**.
- Le prompt de la routine est court et **pointe vers un fichier versionné**
  `docs/audits/_AUDIT_PROMPT.md` contenant les instructions détaillées de l'agent
  (étapes 1→6 ci-dessus). Permet d'ajuster le prompt sans recréer la routine.
- L'agent a le droit de committer/pusher uniquement le rapport d'audit
  (pas de modification du code applicatif pendant l'audit).

## Hors périmètre (YAGNI)

- Pas de notification externe (issue/push) — le `git log` suffit.
- Pas de correction automatique du code par l'agent d'audit (il rapporte, il ne refactore pas).
- Pas de branchement sur le build / la CI PR (le déterministe y tourne déjà via react-doctor).
- Pas de dashboard web — le markdown versionné fait l'historique.

## Critères de succès

- Un `node scripts/clean-code-audit.mjs` produit un `audit-data.json` complet en local.
- Le score global est reproductible (même code → même chiffre).
- Un rapport markdown lisible est généré avec score, delta et top refactorings.
- La routine `/schedule` tourne sans intervention et commit le rapport chaque lundi.
```
