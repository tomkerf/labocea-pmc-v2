import type { Sampling, NatureEauType } from '@/types'

export const NATURES_NAPPE: NatureEauType[] = ['Souterraine']

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
export function isSamplingOverdue(s: Sampling, year?: number, isAutomatique?: boolean): boolean {
  if (s.status === 'overdue') return true
  if (s.status !== 'planned') return false

  const planYear = year ?? new Date().getFullYear()
  let deadline: Date

  if (s.dateUndefined) return false  // date non définie → pas en retard

  if (s.plannedDay && s.plannedDay > 0) {
    // Pour les Bilans 24h (Automatique) : J1 = plannedDay, J2 = J1+1 → deadline = J2
    const deadlineDay = isAutomatique ? s.plannedDay + 1 : s.plannedDay
    deadline = new Date(planYear, s.plannedMonth, deadlineDay, 23, 59, 59, 999)
  } else {
    deadline = new Date(planYear, s.plannedMonth + 1, 0, 23, 59, 59, 999)
  }

  return deadline < new Date()
}

/** Retourne true si un prélèvement "done" manque des informations obligatoires :
 *  - doneDate (date de réalisation)
 *  - doneBy (uid du technicien)
 *  - nappe (uniquement pour la nature Souterraine lors des périodes de nappe haute/basse)
 *
 *  @param s - le prélèvement à évaluer
 *  @param nature - la nature d'eau du plan (ex: 'Souterraine', 'Eau usée', etc.)
 *  @returns true si le prélèvement est incomplètement renseigné, false sinon
 */
export function isSamplingIncomplet(s: Sampling, nature: NatureEauType): boolean {
  // Si le statut n'est pas 'done', le prélèvement n'est pas considéré comme incomplet
  if (s.status !== 'done') return false

  // Vérifier les champs obligatoires pour tous les prélèvements done
  if (!s.doneDate) return true
  if (!s.doneBy) return true

  // L'info nappe n'est obligatoire que pour les eaux souterraines prélevées en période de nappe haute/basse
  if (nature === 'Souterraine') {
    const isPeriodeNappe = [0, 1, 2, 8, 9, 10].includes(s.plannedMonth)
    if (isPeriodeNappe && !s.nappe) return true
  }

  return false
}
