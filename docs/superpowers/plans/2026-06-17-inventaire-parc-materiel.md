# Inventaire parc matériel — Export PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bouton "Exporter" dans MaterielPage qui génère un PDF HTML de l'inventaire filtré (même pattern que `ficheDeVieExport.ts`).

**Architecture:** Nouvelle fonction pure `inventaireExport.ts` dans `src/components/materiel/` qui reçoit la liste filtrée et l'état des filtres, génère un document HTML, et l'ouvre dans un nouvel onglet pour impression/save-as-PDF natif. Modification mineure de `MaterielPage.tsx` pour ajouter le bouton et l'appel.

**Tech Stack:** TypeScript, React, lucide-react (FileDown icon), HTML Blob + window.open (aucune lib externe)

---

### Task 1 : Créer `inventaireExport.ts`

**Files:**
- Create: `src/components/materiel/inventaireExport.ts`

- [ ] **Step 1 : Créer le fichier**

Contenu complet du fichier `src/components/materiel/inventaireExport.ts` :

```typescript
import type { Equipement } from '@/types'

const CATEGORIE_LABELS: Record<string, string> = {
  preleveur: 'Préleveur',
  debitmetre: 'Débitmètre',
  multiparametre: 'Multiparamètre',
  glaciere: 'Glacière',
  enregistreur: 'Enregistreur',
  thermometre: 'Thermomètre',
  reglet: 'Réglet',
  eprouvette: 'Éprouvette',
  flacon: 'Flacon',
  pompe_pz: 'Pompe PZ',
  sonde_niveau: 'Sonde niveau',
  chronometre: 'Chronomètre',
  manchon_deversoir: 'Manchon déversoir',
}

const ETAT_LABELS: Record<string, string> = {
  operationnel: 'Opérationnel',
  en_maintenance: 'En maintenance',
  hors_service: 'Hors service',
  prete: 'Prêté',
}

const LOCALISATION_LABELS: Record<string, string> = {
  labo: 'Labo',
  terrain: 'Terrain',
  externe: 'Externe',
}

export interface InventaireFiltersInfo {
  categorie?: string
  etat?: string
  site?: string
  technicien?: string
  search?: string
}

export function exportInventairePDF(
  equipements: Equipement[],
  filtersInfo: InventaireFiltersInfo = {}
) {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const today = new Date()

  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr + 'T12:00:00') < today
  }

  const activeFilters = [
    filtersInfo.site && `Site : ${filtersInfo.site === 'quimper' ? 'Quimper' : 'Brest'}`,
    filtersInfo.categorie && `Catégorie : ${CATEGORIE_LABELS[filtersInfo.categorie] ?? filtersInfo.categorie}`,
    filtersInfo.etat && `État : ${ETAT_LABELS[filtersInfo.etat] ?? filtersInfo.etat}`,
    filtersInfo.technicien && `Technicien : ${filtersInfo.technicien}`,
    filtersInfo.search && `Recherche : « ${filtersInfo.search} »`,
  ].filter(Boolean).join(' · ')

  const rows = equipements.map((e) => {
    const overdue = e.prochainEtalonnage ? isOverdue(e.prochainEtalonnage) : false
    const dateCell = e.prochainEtalonnage
      ? `<span style="${overdue ? 'color:#FF3B30;font-weight:600' : ''}">${fmt(e.prochainEtalonnage)}${overdue ? ' ⚠' : ''}</span>`
      : '—'

    return `<tr>
      <td>${e.nom || '—'}</td>
      <td>${[e.marque, e.modele].filter(Boolean).join(' ')  || '—'}</td>
      <td>${e.numSerie || '—'}</td>
      <td>${CATEGORIE_LABELS[e.categorie] ?? e.categorie}</td>
      <td>${ETAT_LABELS[e.etat] ?? e.etat}</td>
      <td>${e.site === 'quimper' ? 'Quimper' : e.site === 'brest' ? 'Brest' : '—'}</td>
      <td>${e.technicien || '—'}</td>
      <td>${LOCALISATION_LABELS[e.localisation] ?? e.localisation}</td>
      <td>${dateCell}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Inventaire parc matériel — Labocea PMC</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 12px; color: #1D1D1F; margin: 32px; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 2px; }
  .meta { color: #6E6E73; font-size: 12px; margin-bottom: 6px; }
  .filters { color: #1D1D1F; font-size: 11px; background: #F5F5F7; border-radius: 6px; padding: 6px 10px; display: inline-block; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 7px 8px; background: #F5F5F7; font-weight: 600; color: #6E6E73; text-transform: uppercase; letter-spacing: 0.04em; font-size: 9px; border-bottom: 1px solid #D2D2D7; }
  td { padding: 8px 8px; border-bottom: 1px solid #E5E5EA; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) { background: #FAFAFA; }
  .footer { margin-top: 24px; font-size: 10px; color: #AEAEB2; }
  @media print {
    body { margin: 15px; }
    @page { size: A4 landscape; margin: 15mm; }
  }
</style>
</head>
<body>
<h1>Inventaire du parc matériel</h1>
<div class="meta">Labocea PMC · Généré le ${today.toLocaleDateString('fr-FR')} · ${equipements.length} équipement${equipements.length !== 1 ? 's' : ''}</div>
${activeFilters ? `<div class="filters">Filtres : ${activeFilters}</div>` : ''}
<table>
  <thead>
    <tr>
      <th>Nom</th>
      <th>Marque / Modèle</th>
      <th>N° série</th>
      <th>Catégorie</th>
      <th>État</th>
      <th>Site</th>
      <th>Tech.</th>
      <th>Localisation</th>
      <th>Prochain étalonnage</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="9" style="color:#AEAEB2;text-align:center;padding:20px">Aucun équipement</td></tr>'}
  </tbody>
</table>
<div class="footer">Labocea PMC — inventaire généré automatiquement, non contractuel</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/materiel/inventaireExport.ts
git commit -m "feat(materiel): ajouter utilitaire export inventaire PDF"
```

---

### Task 2 : Ajouter le bouton dans MaterielPage

**Files:**
- Modify: `src/pages/MaterielPage.tsx`

- [ ] **Step 1 : Ajouter l'import `FileDown` et la fonction d'export**

En haut de `MaterielPage.tsx`, dans l'import lucide-react existant (ligne ~2), ajouter `FileDown` :

```typescript
import { Plus, Search, Package, FileDown } from 'lucide-react'
```

Ajouter l'import de la fonction export après les imports existants :

```typescript
import { exportInventairePDF } from '@/components/materiel/inventaireExport'
```

- [ ] **Step 2 : Ajouter le handler d'export**

Dans le corps de `MaterielPage`, après la déclaration de `filtered` (ligne ~123), ajouter :

```typescript
function handleExport() {
  exportInventairePDF(filtered, {
    categorie: filterCategorie || undefined,
    etat: filterEtat || undefined,
    site: filterSite || undefined,
    technicien: filterTechnicien || undefined,
    search: search || undefined,
  })
}
```

- [ ] **Step 3 : Ajouter le bouton dans l'en-tête**

Dans le bloc en-tête (div `flex flex-col sm:flex-row ...`), ajouter le bouton export à côté du bouton "Ajouter". Remplacer le `<button>` "Ajouter un équipement" existant dans l'en-tête par un groupe de deux boutons :

```tsx
<div className="flex gap-2 w-full sm:w-auto">
  <button
    type="button"
    onClick={handleExport}
    disabled={filtered.length === 0}
    className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-opacity flex-1 sm:flex-none"
    style={{
      background: COLORS.BG_SECONDARY,
      border: '1px solid var(--color-border-subtle)',
      color: filtered.length === 0 ? 'var(--color-text-tertiary)' : COLORS.TEXT_PRIMARY,
      opacity: filtered.length === 0 ? 0.5 : 1,
    }}
    title="Exporter l'inventaire filtré en PDF"
  >
    <FileDown size={16} />
    Exporter
  </button>
  <button type="button"
    onClick={handleCreate}
    disabled={creating}
    className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-opacity flex-1 sm:flex-none"
    style={{ background: COLORS.ACCENT, color: 'white', opacity: creating ? 0.6 : 1 }}
  >
    <Plus size={16} />
    Ajouter
  </button>
</div>
```

Note : le libellé "Ajouter un équipement" est raccourci en "Ajouter" pour que les deux boutons tiennent en ligne sur mobile.

- [ ] **Step 4 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 5 : Tester localement**

```bash
npm run dev
```

Vérifier :
1. Les deux boutons s'affichent dans l'en-tête (Exporter + Ajouter)
2. Le bouton Exporter est désactivé quand aucun équipement ne correspond aux filtres
3. Cliquer Exporter ouvre un nouvel onglet avec le tableau HTML
4. Filtrer par site/catégorie, puis exporter : le document reflète les filtres actifs (mention dans l'en-tête + seulement les équipements filtrés)
5. L'en-tête du document mentionne les filtres actifs (ex. "Filtres : Site : Quimper")
6. Les dates de prochain étalonnage dépassées apparaissent en rouge avec ⚠
7. Depuis Ctrl+P / Cmd+P dans l'onglet ouvert : mise en page paysage A4 correcte

- [ ] **Step 6 : Commit**

```bash
git add src/pages/MaterielPage.tsx
git commit -m "feat(materiel): bouton export inventaire PDF dans l'en-tête"
```

---

### Task 3 : Déployer en staging

- [ ] **Step 1 : Build + deploy**

```bash
bash deploy-dev.sh
```

Attendu : build réussi, déploiement Cloudflare Workers staging.

- [ ] **Step 2 : Test smoke sur staging**

1. Ouvrir la page Matériel
2. Appliquer un filtre (ex. Site = Quimper)
3. Cliquer Exporter
4. Vérifier que le document PDF s'ouvre avec les bons équipements et le filtre mentionné

---

## Vérification finale

- [ ] `npx tsc --noEmit` passe sans erreur
- [ ] `npm run test` passe (aucun test unitaire cassé — la feature est purement UI/export)
- [ ] Export sans filtre : tous les équipements, pas de mention "Filtres"
- [ ] Export avec filtre : sous-ensemble correct + résumé des filtres actifs
- [ ] Bouton désactivé si `filtered.length === 0`
- [ ] Dates dépassées en rouge dans le document
