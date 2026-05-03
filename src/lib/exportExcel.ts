// ============================================================
// exportExcel.ts — Génère le tableau de synthèse annuel Excel
// Utilise SheetJS (xlsx) — côté client, aucun serveur requis
// ============================================================

import * as XLSX from 'xlsx'
import type { Client, Plan, Sampling, SamplingStatus } from '@/types'
import { isSamplingOverdue } from '@/lib/overdue'

// ── Constantes ────────────────────────────────────────────────

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MOIS_COURT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const STATUS_LABEL: Record<SamplingStatus, string> = {
  planned:      'Planifié',
  done:         'Réalisé',
  overdue:      'En retard',
  non_effectue: 'Non effectué',
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatPlanned(s: Sampling): string {
  if (s.plannedDay > 0 && s.plannedMonth >= 0)
    return `${String(s.plannedDay).padStart(2,'0')} ${MOIS_COURT[s.plannedMonth]}`
  if (s.plannedMonth >= 0) return MOIS_COURT[s.plannedMonth]
  return ''
}

function resolveStatus(s: Sampling, clientYear: string): SamplingStatus {
  if (s.status === 'planned' && isSamplingOverdue(s, parseInt(clientYear, 10))) return 'overdue'
  return s.status
}

/** Autofit column widths from array of rows */
function autoWidth(ws: XLSX.WorkSheet, rows: string[][]): void {
  const maxCols = Math.max(...rows.map(r => r.length))
  const widths: number[] = Array(maxCols).fill(8)
  for (const row of rows) {
    row.forEach((cell, ci) => {
      const len = String(cell ?? '').length
      if (len > widths[ci]) widths[ci] = Math.min(len, 60)
    })
  }
  ws['!cols'] = widths.map(w => ({ wch: w + 2 }))
}

// ── Feuille 1 : Récapitulatif ─────────────────────────────────

function buildRecap(client: Client): XLSX.WorkSheet {
  const plans = (client.plans ?? []).filter(p => !p.separator)
  const allSamplings = plans.flatMap(p =>
    (p.samplings ?? []).map(s => ({ s, p }))
  )
  const done = allSamplings.filter(({ s }) => s.status === 'done').length
  const planned = allSamplings.filter(({ s }) => resolveStatus(s, client.annee) === 'planned').length
  const overdue = allSamplings.filter(({ s }) => resolveStatus(s, client.annee) === 'overdue').length
  const nonEff = allSamplings.filter(({ s }) => s.status === 'non_effectue').length
  const total = allSamplings.length
  const tauxReal = total > 0 ? Math.round((done / total) * 100) : 0

  const withRapport = allSamplings.filter(({ s }) => s.rapportPrevu).length
  const rapportsDus = allSamplings.filter(({ s }) => s.rapportPrevu && !s.rapportDate).length

  const rows: (string | number)[][] = [
    ['LABOCEA — Fiche de synthèse annuelle'],
    [],
    ['Client',         client.nom],
    ['N° client',      client.numClient || '—'],
    ['Segment',        client.segment],
    ['Année',          client.annee],
    ['Technicien',     client.preleveur],
    ['N° devis',       client.numDevis || '—'],
    ['N° convention',  client.numConvention || '—'],
    ['Interlocuteur',  client.interlocuteur || '—'],
    ['Téléphone',      client.telephone || client.mobile || '—'],
    [],
    ['STATISTIQUES'],
    ['',               'Nb',         '%'],
    ['Total prélèvements', total,   ''],
    ['Réalisés',       done,         `${tauxReal}%`],
    ['Planifiés',      planned,      ''],
    ['En retard',      overdue,      ''],
    ['Non effectués',  nonEff,       ''],
    [],
    ['Plans de prélèvement', plans.length, ''],
    ['Avec rapport prévu',   withRapport,  ''],
    ['Rapports en attente',  rapportsDus,  ''],
    [],
    ['PLANS'],
    ['Plan', 'Site', 'Nature', 'Méthode', 'Fréquence', 'Nb prélèv.', 'Réalisés', 'Analyses'],
    ...plans.map(p => [
      p.nom,
      p.siteNom,
      p.nature,
      p.methode,
      p.frequence,
      (p.samplings ?? []).length,
      (p.samplings ?? []).filter(s => s.status === 'done').length,
      p.analysesSousTraitees ? 'Sous-traitées' : 'Labocea',
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidth(ws, rows.map(r => r.map(String)))

  // Titre principal en gras
  if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 } }
  // En-têtes de section
  for (const cell of ['A13', 'A25']) {
    if (ws[cell]) ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E8F1FB' } } }
  }

  return ws
}

// ── Feuille 2 : Tous les prélèvements ─────────────────────────

function buildPrelev(client: Client): XLSX.WorkSheet {
  const header = [
    'Plan', 'Site', 'Nature eau', 'Méthode', 'Fréquence',
    'N°', 'Mois prévu', 'Date prévue', 'Statut',
    'Date réalisée', 'Technicien', 'Nappe',
    'Rapport prévu', 'Date rapport',
    'Commentaire', 'Motif',
  ]

  const dataRows: (string | number)[][] = []

  for (const plan of (client.plans ?? []).filter(p => !p.separator)) {
    for (const s of (plan.samplings ?? [])) {
      const status = resolveStatus(s, client.annee)
      dataRows.push([
        plan.nom,
        plan.siteNom,
        plan.nature,
        plan.methode,
        plan.frequence,
        s.num,
        s.plannedMonth >= 0 ? MOIS[s.plannedMonth] : '',
        formatPlanned(s),
        STATUS_LABEL[status],
        formatDate(s.doneDate),
        s.assignedTo || client.preleveur || '',
        s.nappe ? (s.nappe === 'haute' ? 'Haute' : 'Basse') : '',
        s.rapportPrevu ? 'Oui' : 'Non',
        formatDate(s.rapportDate),
        s.comment || '',
        s.motif || '',
      ])
    }
  }

  const rows = [header, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidth(ws, rows.map(r => r.map(String)))

  // En-tête en gras
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (ws[addr]) ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F0F0F2' } } }
    }
  }

  return ws
}

// ── Feuille 3 : Rapports ──────────────────────────────────────

function buildRapports(client: Client): XLSX.WorkSheet {
  const header = [
    'Plan', 'Site', 'N°', 'Date réalisée', 'Rapport prévu',
    'Date rapport', 'Statut rapport', 'Technicien',
  ]

  const dataRows: (string | number)[][] = []

  for (const plan of (client.plans ?? []).filter(p => !p.separator)) {
    for (const s of (plan.samplings ?? []).filter(s => s.rapportPrevu)) {
      let statutRapport = 'À envoyer'
      if (s.rapportDate) statutRapport = 'Envoyé'
      else if (s.status !== 'done') statutRapport = 'Prélèvement non réalisé'

      dataRows.push([
        plan.nom,
        plan.siteNom,
        s.num,
        formatDate(s.doneDate),
        s.rapportPrevu ? 'Oui' : 'Non',
        formatDate(s.rapportDate),
        statutRapport,
        s.assignedTo || client.preleveur || '',
      ])
    }
  }

  if (dataRows.length === 0) {
    dataRows.push(['Aucun rapport prévu pour ce client', '', '', '', '', '', '', ''])
  }

  const rows = [header, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidth(ws, rows.map(r => r.map(String)))

  // En-tête en gras
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (ws[addr]) ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F0F0F2' } } }
    }
  }

  return ws
}

// ── Feuille 4 : Calendrier annuel (tableau croisé) ─────────────

function buildCalendrier(client: Client, plan: Plan): XLSX.WorkSheet {
  // En-tête : Plan + 12 colonnes mois
  const header = ['N°', 'Point', ...MOIS_COURT]
  const rows: (string | number)[][] = [header]

  // On ne fait qu'une ligne par prélèvement (peut y avoir plusieurs par plan selon fréquence)
  // On regroupe par numéro de prélèvement et on place le statut dans la bonne colonne mois
  const byNum = new Map<number, Sampling>()
  for (const s of plan.samplings) byNum.set(s.num, s)

  for (const [num, s] of [...byNum.entries()].sort((a, b) => a[0] - b[0])) {
    const status = resolveStatus(s, client.annee)
    const row: (string | number)[] = [num, plan.siteNom]
    for (let m = 0; m < 12; m++) {
      if (s.plannedMonth === m) {
        row.push(STATUS_LABEL[status].slice(0, 4)) // "Réal", "Plan", "Retard", "Non e"
      } else {
        row.push('')
      }
    }
    rows.push(row)
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidth(ws, rows.map(r => r.map(String)))
  return ws
}

// ── Export principal ──────────────────────────────────────────

export function exportClientExcel(client: Client): void {
  const wb = XLSX.utils.book_new()

  // Feuille 1 — Récapitulatif
  XLSX.utils.book_append_sheet(wb, buildRecap(client), 'Récapitulatif')

  // Feuille 2 — Tous les prélèvements
  XLSX.utils.book_append_sheet(wb, buildPrelev(client), 'Prélèvements')

  // Feuille 3 — Rapports
  XLSX.utils.book_append_sheet(wb, buildRapports(client), 'Rapports')

  // Feuille 4+ — Calendrier par plan (1 feuille par plan, max 8 plans)
  const plans = (client.plans ?? []).filter(p => !p.separator)
  const plansFeuilles = plans.slice(0, 8)
  for (const plan of plansFeuilles) {
    const sheetName = plan.siteNom.replace(/[:\\/?*[\]]/g, '').slice(0, 28) || plan.nom.slice(0, 28)
    XLSX.utils.book_append_sheet(wb, buildCalendrier(client, plan), sheetName)
  }

  // Nom du fichier : "PMC_NomClient_Annee.xlsx"
  const safeName = client.nom.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').trim().replace(/\s+/g, '_')
  const filename = `PMC_${safeName}_${client.annee}.xlsx`

  XLSX.writeFile(wb, filename)
}
