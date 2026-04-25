// ============================================================
// exportPdf.ts — Génère le PDF historique complet d'un client
// Utilise jsPDF + jspdf-autotable (côté client, aucun serveur)
// ============================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Client, Sampling, SamplingStatus } from '@/types'

// ── Constantes ────────────────────────────────────────────────

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const STATUS_LABEL: Record<SamplingStatus, string> = {
  planned:      'Planifié',
  done:         'Réalisé',
  overdue:      'En retard',
  non_effectue: 'Non effectué',
}

const STATUS_COLOR: Record<SamplingStatus, [number, number, number]> = {
  planned:      [230, 244, 255],
  done:         [234, 248, 238],
  overdue:      [255, 238, 237],
  non_effectue: [245, 245, 247],
}

const STATUS_TEXT_COLOR: Record<SamplingStatus, [number, number, number]> = {
  planned:      [0, 113, 227],
  done:         [52, 199, 89],
  overdue:      [255, 59, 48],
  non_effectue: [142, 142, 147],
}

// ── Helpers ───────────────────────────────────────────────────

function formatPlannedDate(s: Sampling): string {
  if (s.plannedDay && s.plannedMonth >= 0) {
    return `${String(s.plannedDay).padStart(2, '0')} ${MOIS[s.plannedMonth]}`
  }
  return MOIS[s.plannedMonth] ?? '—'
}

function formatDoneDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function today(): string {
  return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Export principal ──────────────────────────────────────────

export function exportClientPdf(client: Client): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const MARGIN = 15
  const CONTENT_W = W - MARGIN * 2

  // ── Couleurs brand ──
  const BLUE:  [number, number, number] = [0, 113, 227]
  const DARK:  [number, number, number] = [29, 29, 31]
  const GREY:  [number, number, number] = [110, 110, 115]
  const LGREY: [number, number, number] = [245, 245, 247]

  // ── En-tête ──
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('LABOCEA PMC', MARGIN, 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Historique client — extrait du', MARGIN, 12)
  doc.text(today(), MARGIN + 55, 12)

  // ── Titre client ──
  let y = 26

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DARK)
  doc.text(client.nom || 'Client sans nom', MARGIN, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GREY)
  const subtitle = [client.segment, client.annee, client.preleveur ? `Préleveur : ${client.preleveur}` : '']
    .filter(Boolean).join('  ·  ')
  doc.text(subtitle, MARGIN, y)
  y += 8

  // ── Bloc infos client ──
  doc.setFillColor(...LGREY)
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2, 2, 'F')

  const col1 = MARGIN + 4
  const col2 = MARGIN + CONTENT_W / 2
  let iy = y + 6

  function infoLine(label: string, value: string, x: number, cy: number) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GREY)
    doc.text(label.toUpperCase(), x, cy)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    doc.text(value || '—', x, cy + 4)
  }

  infoLine('Interlocuteur', [client.interlocuteur, client.fonction].filter(Boolean).join(' — '), col1, iy)
  infoLine('Téléphone', client.telephone || client.mobile || '—', col2, iy)
  iy += 10
  infoLine('N° Devis', client.numDevis || '—', col1, iy)
  infoLine('N° Convention', client.numConvention || '—', col2, iy)
  iy += 10
  infoLine('Montant total', client.montantTotal ? `${client.montantTotal.toLocaleString('fr-FR')} €` : '—', col1, iy)
  infoLine('Durée contrat', client.dureeContrat || '—', col2, iy)

  y += 34

  // ── Plans ──
  for (const plan of client.plans) {
    if (plan.samplings.length === 0) continue

    // Saut de page si nécessaire
    if (y > 240) {
      doc.addPage()
      y = 15
    }

    // Titre plan
    doc.setFillColor(...BLUE)
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(plan.nom || 'Point sans nom', MARGIN + 3, y + 5.5)

    // Métadonnées plan à droite
    const meta = [plan.siteNom, plan.frequence, plan.nature, plan.methode].filter(Boolean).join(' · ')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    const metaW = doc.getTextWidth(meta)
    doc.text(meta, MARGIN + CONTENT_W - metaW - 3, y + 5.5)
    y += 11

    // Tableau prélèvements
    const rows = plan.samplings
      .sort((a, b) => {
        if (a.plannedMonth !== b.plannedMonth) return a.plannedMonth - b.plannedMonth
        return a.plannedDay - b.plannedDay
      })
      .map(s => [
        String(s.num),
        formatPlannedDate(s),
        formatDoneDate(s.doneDate),
        STATUS_LABEL[s.status] ?? s.status,
        s.rapportPrevu ? (s.rapportDate ? formatDoneDate(s.rapportDate) : 'Oui') : 'Non',
        s.nappe || '—',
        s.comment || '—',
      ])

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['N°', 'Prévu', 'Réalisé', 'Statut', 'Rapport', 'Nappe', 'Commentaire']],
      body: rows,
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor: DARK,
        lineColor: [229, 229, 234],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: DARK,
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 18 },
        2: { cellWidth: 22 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
        5: { cellWidth: 14 },
        6: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      // Colorise la cellule Statut selon la valeur
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const s = plan.samplings.sort((a, b) => {
            if (a.plannedMonth !== b.plannedMonth) return a.plannedMonth - b.plannedMonth
            return a.plannedDay - b.plannedDay
          })[data.row.index]
          if (s) {
            data.cell.styles.fillColor = STATUS_COLOR[s.status] ?? [255, 255, 255]
            data.cell.styles.textColor = STATUS_TEXT_COLOR[s.status] ?? DARK
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      didDrawPage(data) {
        // Pagination en pied de page
        const pageCount = doc.internal.pages.length - 1
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...GREY)
        doc.text(
          `${client.nom} — ${today()} — Page ${data.pageNumber} / ${pageCount}`,
          MARGIN, doc.internal.pageSize.getHeight() - 8
        )
      },
    })

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Si aucun plan avec prélèvements
  if (client.plans.every(p => p.samplings.length === 0)) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...GREY)
    doc.text('Aucun prélèvement enregistré pour ce client.', MARGIN, y + 8)
  }

  // Pied de page dernière page
  const pageCount = doc.internal.pages.length - 1
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GREY)
  doc.text(
    `${client.nom} — ${today()} — Page ${pageCount} / ${pageCount}`,
    MARGIN, doc.internal.pageSize.getHeight() - 8
  )

  // ── Téléchargement ──
  const filename = `PMC_${client.nom.replace(/[^a-zA-Z0-9]/g, '_')}_${client.annee}.pdf`
  doc.save(filename)
}
