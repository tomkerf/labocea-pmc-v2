// ============================================================
// exportPlanningPdf.ts — Génère la feuille de route PDF du Planning
// Utilise jsPDF + jspdf-autotable — côté client, aucun serveur
// ============================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PlanningEvent } from '@/lib/planningUtils'
import type { AppUser } from '@/types'

// ── Helpers de formatage ──────────────────────────────────────

function todayStr(): string {
  return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Mappe les types d'événements vers des libellés conviviaux
const TYPE_LABELS: Record<string, string> = {
  prelevement: 'Prélèvement',
  maintenance: 'Maintenance',
  verification: 'Métrologie',
  evenement: 'Événement',
}

/**
 * Génère et télécharge le PDF de la Feuille de Route du Planning.
 */
export function exportPlanningPdf(
  events: PlanningEvent[],
  periodLabel: string,
  techFilter: string,
  users: AppUser[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) // Paysage pour plus de place (notes terrain + colonnes)
  const W = doc.internal.pageSize.getWidth()
  const MARGIN = 10

  // ── Couleurs de marque Apple/Labocea ──
  const BLUE:  [number, number, number] = [0, 113, 227]
  const DARK:  [number, number, number] = [29, 29, 31]
  const GREY:  [number, number, number] = [110, 110, 115]
  const LGREY: [number, number, number] = [245, 245, 247]

  // ── En-tête de page ──
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('LABOCEA PMC', MARGIN, 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Feuille de Route & Planning Terrain — extrait le', MARGIN, 12)
  doc.text(todayStr(), MARGIN + 68, 12)

  // ── Titre principal de la période ──
  let y = 26

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...DARK)
  doc.text(`Planning : ${periodLabel}`, MARGIN, y)
  
  if (techFilter) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setFillColor(...LGREY)
    doc.setTextColor(...BLUE)
    const techUser = users.find(u => u.initiales === techFilter || u.uid === techFilter)
    const techName = techUser ? `${techUser.prenom} ${techUser.nom} (${techUser.initiales})` : techFilter.toUpperCase()
    const label = `TECHNICIEN : ${techName}`
    const wText = doc.getTextWidth(label)
    doc.roundedRect(W - MARGIN - wText - 6, y - 5, wText + 6, 7, 1, 1, 'F')
    doc.text(label, W - MARGIN - wText - 3, y)
  }

  y += 6

  // Trier les événements chronologiquement si possible
  const sortedEvents = [...events].sort((a, b) => {
    // 1. Par priorité d'abord (en retard en premier)
    if (a.priority !== b.priority) return a.priority - b.priority
    // 2. Par heure si disponible
    const timeA = a.plannedTime || '23:59'
    const timeB = b.plannedTime || '23:59'
    return timeA.localeCompare(timeB)
  })

  // ── Construction du tableau de synthèse autotable ──
  
  const headers = [
    'Fait',
    'Heure',
    'Type',
    'Client / Équipement',
    'Détails & Instructions',
    'Notes de Terrain (Mesures, flaconnage, anomalies...)'
  ]

  const rows = sortedEvents.map(event => {
    // 1. Colonne Heure
    const heure = event.plannedTime || '—'

    // 2. Colonne Type
    const typeLabel = TYPE_LABELS[event.type] || event.type

    // 3. Colonne Sujet (Titre + sous-titre)
    const sujet = `${event.title}\n(${event.subtitle})`

    // 4. Colonne Détails & Instructions
    const detailsArr: string[] = []
    if (event.technicien && event.technicien !== '—') {
      const eventTech = event.technicien
      const techUser = users.find(u => u.initiales === eventTech || u.uid === eventTech)
      const techDisplayName = techUser ? `${techUser.prenom} ${techUser.nom} (${techUser.initiales})` : eventTech.toUpperCase()
      detailsArr.push(`Tech : ${techDisplayName}`)
    }

    if (event.type === 'prelevement') {
      if (event.frequence) detailsArr.push(`Fréq. : ${event.frequence}`)
      if (event.meteo) detailsArr.push(`Météo : ${event.meteo}`)
      if (event.analysesSousTraitees) detailsArr.push('Analyses Sous-Traitées ⚠️')
      if (event.lat && event.lng) {
        detailsArr.push(`GPS : ${parseFloat(event.lat).toFixed(4)}, ${parseFloat(event.lng).toFixed(4)}`)
      }
    } else if (event.type === 'maintenance' && event.maintenanceData) {
      detailsArr.push(`Type : ${event.maintenanceData.type}`)
      if (event.maintenanceData.description) {
        detailsArr.push(`Desc. : ${event.maintenanceData.description}`)
      }
    } else if (event.type === 'verification') {
      detailsArr.push('Échéance Métrologique')
    }

    const details = detailsArr.length > 0 ? detailsArr.join('\n') : '—'

    return [
      '[  ]',           // Case à cocher pour le terrain
      heure,
      typeLabel,
      sujet,
      details,
      ''               // Zone blanche pour écrire
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 8,
      textColor: DARK,
      cellPadding: 3,
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', valign: 'middle', fontStyle: 'bold' }, // [  ]
      1: { cellWidth: 15, halign: 'center' }, // Heure
      2: { cellWidth: 22 }, // Type
      3: { cellWidth: 55 }, // Client / Équipement
      4: { cellWidth: 63 }, // Détails
      5: { cellWidth: 110 }, // Notes de terrain (très large)
    },
    didDrawPage: (data) => {
      // Numérotation des pages en bas
      const pageStr = `Page ${data.pageNumber}`
      doc.setFontSize(7)
      doc.setTextColor(...GREY)
      doc.text(pageStr, W - MARGIN - 12, doc.internal.pageSize.getHeight() - 6)
      doc.text('Labocea PMC V2 — Document Terrain de traçabilité', MARGIN, doc.internal.pageSize.getHeight() - 6)
    }
  })

  // Télécharger le document
  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, '_')
  const techLabel = techFilter ? `_${techFilter.toUpperCase()}` : ''
  doc.save(`Feuille_de_route_${safePeriod}${techLabel}.pdf`)
}
