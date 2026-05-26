// ============================================================
// exportPlanningExcel.ts — Génère la synthèse Excel du Planning
// Utilise SheetJS (xlsx) — côté client, aucun serveur requis
// ============================================================

import * as XLSX from 'xlsx'
import type { PlanningEvent } from '@/lib/planningUtils'

// Libellés conviviaux pour les types d'événements
const TYPE_LABELS: Record<string, string> = {
  prelevement: 'Prélèvement terrain',
  maintenance: 'Maintenance matériel',
  verification: 'Contrôle Métrologie',
  evenement: 'Événement personnel / Congés',
}

/** Ajuste automatiquement la largeur des colonnes */
function autoWidth(ws: XLSX.WorkSheet, rows: string[][]): void {
  const maxCols = Math.max(...rows.map(r => r.length))
  const widths: number[] = Array(maxCols).fill(10)
  
  for (const row of rows) {
    row.forEach((cell, ci) => {
      const len = String(cell ?? '').length
      if (len > widths[ci]) {
        widths[ci] = Math.min(len + 3, 50) // Marge + cap à 50
      }
    })
  }
  
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

/**
 * Génère et télécharge le fichier Excel du planning filtré.
 */
export function exportPlanningExcel(
  events: PlanningEvent[],
  periodLabel: string,
  techFilter: string
): void {
  // 1. Initialiser le classeur
  const wb = XLSX.utils.book_new()

  // 2. Construire les lignes de données
  const headers = [
    'Date / Heure',
    "Type d'Événement",
    'Sujet / Client',
    'Site / Précision',
    'Technicien Assigné',
    'Statut',
    'Fréquence',
    'Météo',
    'Coordonnées GPS',
  ]

  // Trier les événements par date/heure
  const sortedEvents = [...events].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    const timeA = a.plannedTime || '23:59'
    const timeB = b.plannedTime || '23:59'
    return timeA.localeCompare(timeB)
  })

  const rows = sortedEvents.map(event => {
    const typeLabel = TYPE_LABELS[event.type] || event.type
    const heure = event.plannedTime ? `${event.plannedTime}` : '—'
    const technicien = event.technicien || '—'
    
    let sujet = event.title
    let precision = event.subtitle

    // Détails GPS / Analyses pour les prélèvements
    let gps = ''
    if (event.lat && event.lng) {
      gps = `${event.lat}, ${event.lng}`
    }

    return [
      heure,
      typeLabel,
      sujet,
      precision,
      technicien.toUpperCase(),
      event.statusLabel,
      event.frequence || '—',
      event.meteo || '—',
      gps || '—',
    ]
  })

  // Assembler tout dans un tableau de chaînes pour autoWidth
  const allRowsForWidth = [headers, ...rows]

  // 3. Créer la feuille
  const ws = XLSX.utils.aoa_to_sheet(allRowsForWidth)
  autoWidth(ws, allRowsForWidth)

  // 4. Ajouter la feuille au classeur
  const safeSheetName = 'Synthèse Planning'
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName)

  // 5. Générer le nom du fichier
  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').trim().replace(/\s+/g, '_')
  const techLabel = techFilter ? `_${techFilter.toUpperCase()}` : ''
  const filename = `Export_Planning_${safePeriod}${techLabel}.xlsx`

  // 6. Déclencher le téléchargement du fichier
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
