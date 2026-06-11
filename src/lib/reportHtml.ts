import type { AppUser, Client, Plan } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function buildReportHtml(
  client: Client,
  plan: Plan,
  users: AppUser[],
  withPrintScript = false,
): string {
  const year = new Date().getFullYear()
  const title = escapeHtml(`Suivi des prélèvements ${year} — ${plan.nom} — ${client.nom}`)

  const statusLabels: Record<string, string> = {
    planned: 'Planifié', done: 'Réalisé',
    overdue: 'En retard', non_effectue: 'Non effectué',
  }

  const rows = plan.samplings.map((s) => {
    const techUser = users.find((u) => u.uid === s.doneBy)
    const techLabel = escapeHtml(techUser ? `${techUser.prenom} ${techUser.nom}` : (s.doneBy ? s.doneBy : '—'))
    const dateLabel = s.doneDate ? fmtDate(s.doneDate) : '—'
    const statusLabel = statusLabels[s.status] ?? s.status
    const lastHistory = s.reportHistory?.length ? s.reportHistory[s.reportHistory.length - 1] : null
    const motifLabel = escapeHtml(lastHistory?.reason || s.motif?.trim() || '—')

    const statusColor: Record<string, string> = {
      done: '#34c759', overdue: '#ff3b30', non_effectue: '#ff9f0a', planned: '#8e8e93',
    }
    const color = statusColor[s.status] ?? '#8e8e93'

    return `<tr>
      <td style="color:#6e6e73;text-align:center">${s.num}</td>
      <td>${s.dateUndefined ? 'Date à définir' : MOIS[s.plannedMonth] + (s.plannedDay ? ` (j.${s.plannedDay})` : '')}</td>
      <td>${dateLabel}</td>
      <td><span style="color:${color};font-weight:500">${statusLabel}</span></td>
      <td>${techLabel}</td>
      <td style="color:#6e6e73">${motifLabel}</td>
    </tr>`
  }).join('')

  const historyRows = plan.samplings.flatMap((s) =>
    (s.reportHistory ?? []).map((h) => {
      const byUser = users.find((u) => u.uid === h.by)
      const byLabel = escapeHtml(byUser ? `${byUser.prenom} ${byUser.nom}` : (h.by || '—'))
      const action = h.to ? 'Report' : 'Retrait'
      const detail = h.to
        ? `${fmtDate(h.from)} → ${fmtDate(h.to)}`
        : `Retiré du ${fmtDate(h.from)}`
      const atLabel = h.at
        ? new Date(h.at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—'
      return `<tr>
        <td style="color:#6e6e73;text-align:center">${s.num}</td>
        <td style="font-weight:500">${action}</td>
        <td>${detail}</td>
        <td style="color:#6e6e73">${escapeHtml(h.reason || '—')}</td>
        <td>${byLabel}</td>
        <td style="color:#6e6e73">${atLabel}</td>
      </tr>`
    })
  ).join('')

  const historySection = historyRows ? `
    <h2 style="font-size:15px;font-weight:600;margin:36px 0 12px">Historique des reports et retraits</h2>
    <table>
      <thead><tr>
        <th style="width:32px;text-align:center">N°</th>
        <th>Action</th>
        <th>Dates</th>
        <th>Motif</th>
        <th>Par</th>
        <th>Le</th>
      </tr></thead>
      <tbody>${historyRows}</tbody>
    </table>` : ''

  const now = new Date()
  const exportDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const exportTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const done  = plan.samplings.filter((s) => s.status === 'done').length
  const nonEf = plan.samplings.filter((s) => s.status === 'non_effectue').length
  const late  = plan.samplings.filter((s) => s.status === 'overdue').length

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
    <p class="meta">
      Client : ${escapeHtml(client.nom)} &nbsp;·&nbsp; Point : ${escapeHtml(plan.nom)}
      ${plan.siteNom ? ` &nbsp;·&nbsp; Site : ${escapeHtml(plan.siteNom)}` : ''}
      &nbsp;·&nbsp; Fréquence : ${escapeHtml(plan.frequence)} &nbsp;·&nbsp; Méthode : ${escapeHtml(plan.methode)}
    </p>
    <p class="meta">Exporté le ${exportDate} à ${exportTime} — Labocea PMC</p>
    <div class="stats">
      <div class="stat"><strong style="color:#34c759">${done}</strong><span>Réalisés</span></div>
      <div class="stat"><strong style="color:#ff9f0a">${nonEf}</strong><span>Non effectués</span></div>
      <div class="stat"><strong style="color:#ff3b30">${late}</strong><span>En retard</span></div>
      <div class="stat"><strong>${plan.samplings.length}</strong><span>Total</span></div>
    </div>
    <table>
      <thead><tr>
        <th style="width:32px;text-align:center">N°</th>
        <th>Mois prévu</th>
        <th>Date réalisée</th>
        <th>Statut</th>
        <th>Technicien</th>
        <th>Motif</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${historySection}
    <p class="footer">Document généré automatiquement par Labocea PMC V2</p>
    ${withPrintScript ? '<script>window.onload = () => { window.print() }</script>' : ''}
    </body></html>`
}
