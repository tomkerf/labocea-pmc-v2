import type { Client, Plan, Sampling } from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'
import { getStatusLabel } from '@/lib/yearMatrixUtils'

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const STATUS_COLOR: Record<string, string> = {
  Fait: '#34c759',
  Planifié: '#ff9f0a',
  'En retard': '#ff3b30',
  'Non fait': '#8e8e93',
}

export function buildIssueListHtml(
  issues: { client: Client; plan: Plan; sampling: Sampling; planYear: number }[],
  monthLabel: string,
  year: number,
  preleveurs: Preleveur[] = [],
  withPrintScript = false,
): string {
  const title = escapeHtml(`Prélèvements — ${monthLabel} ${year}`)

  const statusLabels = issues.map(({ plan, sampling, planYear }) =>
    getStatusLabel(sampling, planYear, plan.methode === 'Automatique') || '—'
  )

  const rows = issues.map(({ client, plan, sampling }, idx) => {
    const statusLabel = statusLabels[idx]
    const color = STATUS_COLOR[statusLabel] ?? '#8e8e93'
    const techCode = sampling.assignedTo || client.preleveur || ''
    const techNom = (preleveurs || []).find(p => p.code === techCode)?.nom || techCode || '—'

    return `<tr>
      <td>${escapeHtml(client.nom)}</td>
      <td>${escapeHtml(plan.nom)}</td>
      <td style="color:#6e6e73">${escapeHtml(plan.siteNom || '—')}</td>
      <td><span style="color:${color};font-weight:500">${escapeHtml(statusLabel)}</span></td>
      <td>${escapeHtml(techNom)}</td>
    </tr>`
  }).join('')

  const done = statusLabels.filter(l => l === 'Fait').length
  const planned = statusLabels.filter(l => l === 'Planifié').length
  const late = statusLabels.filter(l => l === 'En retard').length
  const nonEf = statusLabels.filter(l => l === 'Non fait').length

  const now = new Date()
  const exportDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const exportTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, Helvetica Neue, sans-serif; font-size: 13px; color: #1d1d1f; margin: 40px; }
      h1 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
      .meta { color: #6e6e73; font-size: 12px; margin-bottom: 8px; }
      .stats { display: flex; gap: 24px; margin-bottom: 28px; padding: 12px 0; border-top: 1px solid #e5e5ea; border-bottom: 1px solid #e5e5ea; }
      .stat { text-align: center; }
      .stat strong { display: block; font-size: 20px; font-weight: 700; }
      .stat span { font-size: 11px; color: #6e6e73; text-transform: uppercase; letter-spacing: .04em; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
           color: #6e6e73; border-bottom: 2px solid #d2d2d7; padding: 8px 12px; }
      td { padding: 9px 12px; border-bottom: 1px solid #e5e5ea; vertical-align: top; }
      .footer { margin-top: 32px; font-size: 11px; color: #aeaeb2; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <h1>${title}</h1>
    <p class="meta">Exporté le ${exportDate} à ${exportTime} — Labocea PMC</p>
    <div class="stats">
      <div class="stat"><strong style="color:#34c759">${done}</strong><span>Faits</span></div>
      <div class="stat"><strong style="color:#ff9f0a">${planned}</strong><span>Planifiés</span></div>
      <div class="stat"><strong style="color:#ff3b30">${late}</strong><span>En retard</span></div>
      <div class="stat"><strong style="color:#8e8e93">${nonEf}</strong><span>Non faits</span></div>
      <div class="stat"><strong>${issues.length}</strong><span>Total</span></div>
    </div>
    <table>
      <thead><tr>
        <th>Client</th>
        <th>Point de prélèvement</th>
        <th>Site</th>
        <th>Statut</th>
        <th>Technicien</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="footer">Document généré automatiquement par Labocea PMC V2</p>
    ${withPrintScript ? '<script>window.onload = () => { window.print() }</script>' : ''}
    </body></html>`
}
