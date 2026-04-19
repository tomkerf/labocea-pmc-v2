import type { Sampling } from '@/types'

/** Retourne true si le prélèvement est en retard :
 *  - statut 'overdue' (marqué manuellement), OU
 *  - statut 'planned' et date prévue dépassée
 */
export function isSamplingOverdue(s: Sampling): boolean {
  if (s.status === 'overdue') return true
  if (s.status !== 'planned') return false
  const year = new Date().getFullYear()
  const planned = new Date(year, s.plannedMonth, s.plannedDay || 1)
  planned.setHours(23, 59, 59, 999)
  return planned < new Date()
}
