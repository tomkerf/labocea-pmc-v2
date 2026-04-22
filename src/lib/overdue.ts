import type { Sampling } from '@/types'

/** Retourne true si le prélèvement est en retard :
 *  - statut 'overdue' (marqué manuellement), OU
 *  - statut 'planned' et date limite dépassée :
 *    · si un jour précis est fixé (plannedDay > 0) → deadline = ce jour-là
 *    · si aucun jour fixé (plannedDay = 0)         → deadline = fin du mois
 *
 *  @param s       - le prélèvement à évaluer
 *  @param year    - l'année du plan (ex: 2026). Si absent, utilise l'année courante.
 *                   Passer l'année du client évite de marquer en retard les plans des années passées.
 */
export function isSamplingOverdue(s: Sampling, year?: number): boolean {
  if (s.status === 'overdue') return true
  if (s.status !== 'planned') return false

  const planYear = year ?? new Date().getFullYear()
  let deadline: Date

  if (s.plannedDay && s.plannedDay > 0) {
    // Jour précis fixé → retard dès le lendemain
    deadline = new Date(planYear, s.plannedMonth, s.plannedDay, 23, 59, 59, 999)
  } else {
    // Pas de jour fixé → retard seulement après la fin du mois
    // new Date(year, month+1, 0) = dernier jour du mois
    deadline = new Date(planYear, s.plannedMonth + 1, 0, 23, 59, 59, 999)
  }

  return deadline < new Date()
}
