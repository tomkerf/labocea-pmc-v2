import type { Equipement, Verification, Maintenance, FicheDeVieNote } from '@/types'

export type TimelineEntry =
  | { kind: 'acquisition'; date: string }
  | { kind: 'verification'; date: string; data: Verification }
  | { kind: 'maintenance';  date: string; data: Maintenance }
  | { kind: 'note';         date: string; data: FicheDeVieNote }

export const VERIF_TYPE: Record<string, string> = {
  etalonnage_interne: 'Étalonnage interne',
  verification_externe: 'Vérification externe',
  controle_terrain: 'Contrôle terrain',
}
export const MAINT_TYPE: Record<string, string> = {
  preventive: 'Maintenance préventive',
  corrective: 'Maintenance corrective',
  panne: 'Panne',
}

export function exportFicheDeViePDF(equipement: Equipement, entries: TimelineEntry[]) {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const rows = entries.map((e) => {
    if (e.kind === 'acquisition') {
      return `<tr><td>${fmt(e.date)}</td><td>Acquisition</td><td>—</td><td>—</td><td>—</td></tr>`
    }
    if (e.kind === 'verification') {
      const v = e.data
      const resultat = v.resultat === 'conforme' ? '✓ Conforme' : v.resultat === 'non_conforme' ? '✗ Non conforme' : '↻ À reprendre'
      return `<tr><td>${fmt(v.date)}</td><td>Métrologie</td><td>${VERIF_TYPE[v.type] ?? v.type}</td><td>${resultat}</td><td>${[v.technicienNom, v.remarques].filter(Boolean).join(' · ')}</td></tr>`
    }
    if (e.kind === 'maintenance') {
      const m = e.data
      return `<tr><td>${fmt(m.dateRealisee || m.datePrevue)}</td><td>Maintenance</td><td>${MAINT_TYPE[m.type] ?? m.type}</td><td>${m.statut}</td><td>${[m.technicienNom, m.travauxRealises || m.description].filter(Boolean).join(' · ')}</td></tr>`
    }
    const n = e.data
    return `<tr><td>${fmt(n.date)}</td><td>Note</td><td>${n.titre}</td><td>—</td><td>${[n.auteur, n.notes].filter(Boolean).join(' · ')}</td></tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Fiche de vie — ${equipement.nom}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 13px; color: #1D1D1F; margin: 40px; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .meta { color: #6E6E73; font-size: 13px; margin-bottom: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #F5F5F7; border-radius: 10px; padding: 16px; margin-bottom: 28px; font-size: 12px; }
  .info-grid dt { color: #6E6E73; }
  .info-grid dd { font-weight: 500; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 10px; background: #F5F5F7; font-weight: 600; color: #6E6E73; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; border-bottom: 1px solid #D2D2D7; }
  td { padding: 10px 10px; border-bottom: 1px solid #E5E5EA; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 32px; font-size: 11px; color: #AEAEB2; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${equipement.nom || 'Équipement'}</h1>
<div class="meta">${[equipement.marque, equipement.modele].filter(Boolean).join(' ')} — N° série : ${equipement.numSerie || '—'}</div>
<dl class="info-grid">
  <dt>Catégorie</dt><dd>${equipement.categorie}</dd>
  <dt>État</dt><dd>${equipement.etat}</dd>
  <dt>Localisation</dt><dd>${equipement.localisation}</dd>
  <dt>Site</dt><dd>${equipement.site === 'quimper' ? 'Quimper' : equipement.site === 'brest' ? 'Brest' : '—'}</dd>
  <dt>Date acquisition</dt><dd>${equipement.dateAcquisition ? fmt(equipement.dateAcquisition) : '—'}</dd>
  <dt>Prochain étalonnage</dt><dd>${equipement.prochainEtalonnage ? fmt(equipement.prochainEtalonnage) : '—'}</dd>
  <dt>Notes</dt><dd>${equipement.notes || '—'}</dd>
</dl>
<table>
  <thead><tr><th>Date</th><th>Catégorie</th><th>Type / Titre</th><th>Résultat</th><th>Détails</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" style="color:#AEAEB2;text-align:center">Aucun événement</td></tr>'}</tbody>
</table>
<div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR')} · Labocea PMC</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
