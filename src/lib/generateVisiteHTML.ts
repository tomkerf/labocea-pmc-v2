import type { VisitePreliminaire, FaisabiliteVisite } from '@/types'

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function faisabiliteLabel(f: FaisabiliteVisite): string {
  return f === 'ok' ? '✓ OK' : f === 'difficile' ? '⚠ Difficile' : '✗ Impossible'
}

function faisabiliteColor(f: FaisabiliteVisite): string {
  return f === 'ok' ? '#34C759' : f === 'difficile' ? '#FF9F0A' : '#FF3B30'
}

export function generateVisiteHTML(visite: VisitePreliminaire): string {
  const pointsHTML = visite.points
    .map((p, i) => `
    <div class="point">
      <h3>Point ${i + 1} — ${escapeHtml(p.nom)}</h3>
      <table>
        <tr><td class="label">Type d'eau</td><td>${escapeHtml(p.typeEau)}</td></tr>
        <tr><td class="label">Méthode</td><td>${escapeHtml(p.methode)}</td></tr>
        <tr><td class="label">Faisabilité</td><td style="color:${faisabiliteColor(p.faisabilite)};font-weight:600">${faisabiliteLabel(p.faisabilite)}</td></tr>
        ${p.securite ? `<tr><td class="label">Sécurité</td><td>${escapeHtml(p.securite)}</td></tr>` : ''}
        ${p.notes ? `<tr><td class="label">Notes</td><td>${escapeHtml(p.notes)}</td></tr>` : ''}
      </table>
      ${
        p.photos.length > 0
          ? `
        <div class="photos">
          ${p.photos.map(url => `<img src="${url}" alt="photo" />`).join('')}
        </div>
      `
          : ''
      }
    </div>
  `)
    .join('')

  const dateFormatted = new Date(visite.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Visite préliminaire — ${escapeHtml(visite.linkedTo.nom)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; font-size: 13px; color: #1D1D1F; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #6E6E73; margin-bottom: 32px; }
    .point { margin-bottom: 28px; page-break-inside: avoid; border: 1px solid #E5E5EA; border-radius: 8px; padding: 16px; }
    h3 { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #1D1D1F; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    td { padding: 4px 8px; vertical-align: top; font-size: 13px; }
    td.label { width: 140px; color: #6E6E73; font-weight: 500; }
    .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .photos img { width: calc(33% - 6px); max-width: 200px; height: 140px; object-fit: cover; border-radius: 6px; border: 1px solid #E5E5EA; }
    .notes-section { margin-top: 28px; padding: 16px; background: #F5F5F7; border-radius: 8px; }
    .notes-section h2 { font-size: 13px; font-weight: 600; color: #6E6E73; margin-bottom: 6px; }
    @media print {
      body { padding: 20mm; }
      .point { border: 1px solid #ccc; }
      .photos img { max-width: 160px; height: 110px; }
    }
  </style>
</head>
<body>
  <h1>Rapport de visite préliminaire</h1>
  <p class="meta">
    ${escapeHtml(visite.linkedTo.nom)} &nbsp;·&nbsp; ${dateFormatted} &nbsp;·&nbsp; ${escapeHtml(visite.technicienNom)}
  </p>
  ${pointsHTML}
  ${
    visite.notes
      ? `
    <div class="notes-section">
      <h2>Notes générales</h2>
      <p>${escapeHtml(visite.notes)}</p>
    </div>
  `
      : ''
  }
</body>
</html>`
}
