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

  const isOverdue = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00') < today

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
      <td>${[e.marque, e.modele].filter(Boolean).join(' ') || '—'}</td>
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
