// ============================================================
// exportClientHtml.ts — Génère le rapport HTML complet d'un client
// Même approche que buildReportHtml dans PlanPage (srcdoc / impression native)
// ============================================================

import type { Client, AppUser } from '@/types'

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
      .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

function fmtDateLong(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return iso }
}

const STATUS_COLOR: Record<string, string> = {
  done:         '#34c759',
  overdue:      '#ff3b30',
  non_effectue: '#ff9f0a',
  planned:      '#8e8e93',
}

const STATUS_LABEL: Record<string, string> = {
  done: 'Réalisé', overdue: 'En retard', non_effectue: 'Non effectué', planned: 'Planifié',
}

export function buildClientReportHtml(client: Client, users: AppUser[], withPrintScript = false): string {
  const now        = new Date()
  const exportDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const exportTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  function resolveUser(uid: string): string {
    if (!uid) return '—'
    const u = users.find(u => u.uid === uid)
    return u ? `${u.prenom} ${u.nom}` : uid
  }

  // ── KPIs globaux client ──
  let totalDone = 0, totalLate = 0, totalNonEf = 0, totalAll = 0
  client.plans.forEach(plan => {
    plan.samplings.forEach(s => {
      totalAll++
      if (s.status === 'done')          totalDone++
      else if (s.status === 'overdue')  totalLate++
      else if (s.status === 'non_effectue') totalNonEf++
    })
  })

  // ── Sections plans ──
  const planSections = client.plans
    .flatMap(plan => plan.samplings.length > 0 ? [plan] : [])
    .map(plan => {
      const sorted = plan.samplings.toSorted((a, b) => {
        if (a.plannedMonth !== b.plannedMonth) return a.plannedMonth - b.plannedMonth
        return (a.plannedDay ?? 0) - (b.plannedDay ?? 0)
      })

      const rows = sorted.map(s => {
        const color     = STATUS_COLOR[s.status] ?? '#8e8e93'
        const label     = STATUS_LABEL[s.status] ?? s.status
        const dateLabel = s.doneDate ? fmtDateLong(s.doneDate) : '—'
        const techLabel = s.doneBy ? resolveUser(s.doneBy) : (s.assignedTo || '—')
        const nappeLabel = s.nappe === 'haute' ? 'Haute' : s.nappe === 'basse' ? 'Basse' : '—'
        const motifLabel = s.motif?.trim() || '—'
        const rapportLabel = s.rapportPrevu
          ? (s.rapportDate ? `✓ ${fmtDate(s.rapportDate)}` : 'Prévu')
          : '—'
        const plannedLabel = s.plannedDay
          ? `${MOIS_COURT[s.plannedMonth]} j.${s.plannedDay}`
          : MOIS_COURT[s.plannedMonth] ?? '—'

        // Sous-lignes report history
        const historyRows = (s.reportHistory ?? []).map(h => {
          const action = h.to ? 'Report' : 'Retrait'
          const detail = h.to
            ? `${fmtDate(h.from)} → ${fmtDate(h.to)}`
            : `Retiré le ${fmtDate(h.from)}`
          return `<tr class="history-row">
            <td style="text-align:center;color:#b0a080">↳</td>
            <td colspan="2" style="color:#8a7040;font-style:italic">${action} — ${detail}</td>
            <td colspan="2" style="color:#8a7040;font-style:italic">${h.reason || '—'}</td>
            <td style="color:#b0a080;font-style:italic">${h.by ? resolveUser(h.by) : '—'}</td>
            <td colspan="2"></td>
          </tr>`
        }).join('')

        return `<tr>
          <td style="color:#6e6e73;text-align:center">${s.num}</td>
          <td>${plannedLabel}</td>
          <td>${dateLabel}</td>
          <td><span style="color:${color};font-weight:600">${label}</span></td>
          <td>${techLabel}</td>
          <td style="color:#6e6e73">${nappeLabel}</td>
          <td>${rapportLabel}</td>
          <td style="color:#6e6e73">${motifLabel}</td>
        </tr>${historyRows}`
      }).join('')

      const planDone  = sorted.filter(s => s.status === 'done').length
      const planLate  = sorted.filter(s => s.status === 'overdue').length
      const planNonEf = sorted.filter(s => s.status === 'non_effectue').length
      const meta = [plan.siteNom, plan.frequence, plan.nature, plan.methode].filter(Boolean).join(' · ')

      return `
        <div class="plan-section">
          <div class="plan-header">
            <div>
              <span class="plan-title">${plan.nom || 'Point sans nom'}</span>
              ${meta ? `<span class="plan-meta">${meta}</span>` : ''}
            </div>
            <div class="plan-stats">
              <span style="color:#34c759">${planDone} réalisé${planDone > 1 ? 's' : ''}</span>
              ${planLate  > 0 ? `<span style="color:#ff3b30">${planLate} en retard</span>` : ''}
              ${planNonEf > 0 ? `<span style="color:#ff9f0a">${planNonEf} non effectué${planNonEf > 1 ? 's' : ''}</span>` : ''}
              <span style="color:#8e8e93">${sorted.length} total</span>
            </div>
          </div>
          <table>
            <thead><tr>
              <th style="width:28px;text-align:center">N°</th>
              <th>Prévu</th>
              <th>Réalisé</th>
              <th>Statut</th>
              <th>Technicien</th>
              <th>Nappe</th>
              <th>Rapport</th>
              <th>Motif</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
    }).join('')

  const noPlans = client.plans.every(p => p.samplings.length === 0)
    ? `<p style="color:#8e8e93;font-style:italic;margin-top:24px">Aucun prélèvement enregistré pour ce client.</p>`
    : ''

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Historique ${client.nom} — ${client.annee}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, "Helvetica Neue", sans-serif;
        font-size: 13px; color: #1d1d1f;
        margin: 0; padding: 32px 40px;
        background: #fff;
      }

      /* En-tête client */
      .client-header {
        border-bottom: 2px solid #1d1d1f;
        padding-bottom: 16px;
        margin-bottom: 20px;
      }
      .client-name { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
      .client-meta { color: #6e6e73; font-size: 12px; margin: 0 0 2px; }
      .export-date { color: #aeaeb2; font-size: 11px; margin-top: 6px; }

      /* Bloc infos administratives */
      .info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px 24px;
        background: #f5f5f7;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 20px;
        font-size: 12px;
      }
      .info-grid dt { color: #8e8e93; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; font-weight: 600; margin-bottom: 2px; }
      .info-grid dd { color: #1d1d1f; margin: 0 0 8px; }

      /* KPIs globaux */
      .kpis {
        display: flex; gap: 20px;
        padding: 12px 0; margin-bottom: 28px;
        border-top: 1px solid #e5e5ea;
        border-bottom: 1px solid #e5e5ea;
      }
      .kpi { text-align: center; min-width: 60px; }
      .kpi strong { display: block; font-size: 22px; font-weight: 700; line-height: 1; }
      .kpi span { font-size: 10px; color: #6e6e73; text-transform: uppercase; letter-spacing: .04em; }

      /* Section plan */
      .plan-section { margin-bottom: 32px; }
      .plan-header {
        display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap;
        background: #1d1d1f;
        color: white;
        padding: 7px 12px;
        border-radius: 6px 6px 0 0;
        gap: 8px;
      }
      .plan-title { font-size: 13px; font-weight: 600; }
      .plan-meta  { font-size: 11px; color: rgba(255,255,255,.6); margin-left: 10px; }
      .plan-stats { display: flex; gap: 12px; font-size: 11px; flex-shrink: 0; }

      /* Tableau */
      table { width: 100%; border-collapse: collapse; }
      th {
        text-align: left; font-size: 10px; font-weight: 600;
        text-transform: uppercase; letter-spacing: .04em;
        color: #6e6e73;
        padding: 7px 10px;
        border-bottom: 1px solid #d2d2d7;
        background: #fafafa;
      }
      td { padding: 8px 10px; border-bottom: 1px solid #f0f0f2; vertical-align: middle; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #f9f9fb; }

      /* Lignes report/retrait */
      .history-row td {
        background: #fffcf0;
        font-size: 11px;
        border-bottom: none;
        padding: 5px 10px;
      }

      /* Pied de page */
      .footer { margin-top: 36px; font-size: 11px; color: #c7c7cc; text-align: center; padding-top: 16px; border-top: 1px solid #e5e5ea; }

      @media print {
        body { padding: 16px 20px; }
        .plan-section { page-break-inside: avoid; }
        tr { page-break-inside: avoid; }
      }
    </style>
  </head><body>

    <div class="client-header">
      <h1 class="client-name">${client.nom || 'Client sans nom'}</h1>
      <p class="client-meta">${[client.segment, client.annee, client.preleveur ? `Préleveur : ${client.preleveur}` : ''].filter(Boolean).join('  ·  ')}</p>
      <p class="export-date">Historique extrait le ${exportDate} à ${exportTime} — Labocea PMC</p>
    </div>

    <dl class="info-grid">
      <div><dt>Interlocuteur</dt><dd>${[client.interlocuteur, client.fonction].filter(Boolean).join(' — ') || '—'}</dd></div>
      <div><dt>Téléphone</dt><dd>${client.telephone || client.mobile || '—'}</dd></div>
      <div><dt>Email</dt><dd>${client.email || '—'}</dd></div>
      <div><dt>N° Devis</dt><dd>${client.numDevis || '—'}</dd></div>
      <div><dt>N° Convention</dt><dd>${client.numConvention || '—'}</dd></div>
      <div><dt>Durée contrat</dt><dd>${client.dureeContrat || '—'}</dd></div>
      <div><dt>Montant total</dt><dd>${client.montantTotal ? client.montantTotal.toLocaleString('fr-FR') + ' €' : '—'}</dd></div>
      <div><dt>Mission</dt><dd>${client.mission || '—'}</dd></div>
      <div><dt>Période</dt><dd>${client.periodeIntervention || '—'}</dd></div>
    </dl>

    <div class="kpis">
      <div class="kpi"><strong style="color:#34c759">${totalDone}</strong><span>Réalisés</span></div>
      <div class="kpi"><strong style="color:#ff9f0a">${totalNonEf}</strong><span>Non effectués</span></div>
      <div class="kpi"><strong style="color:#ff3b30">${totalLate}</strong><span>En retard</span></div>
      <div class="kpi"><strong>${totalAll}</strong><span>Total</span></div>
    </div>

    ${planSections}
    ${noPlans}

    <p class="footer">Document généré automatiquement par Labocea PMC V2</p>
    ${withPrintScript ? '<script>window.onload = () => { window.print() }</script>' : ''}
  </body></html>`

  return html
}
