import type { Plan, Sampling, SamplingStatus, NappeType } from '@/types'
import { generateId } from './ids'

/** Génère la liste initiale des prélèvements pour un plan selon sa fréquence.
 *  - 'Personnalisé' → retourne [] (saisie manuelle uniquement)
 *  - 'Bimensuel'    → 2 prélèvements par mois, jour non fixé (plannedDay = 0)
 *  - Autres         → un prélèvement par mois cible, jour depuis customDays ou defaultDay
 *
 *  Si plan.customMonths est renseigné (et fréquence ≠ 'Annuel'), les mois personnalisés
 *  remplacent les mois par défaut de la fréquence.
 */
export function generateSamplings(plan: Plan): Sampling[] {
  if (plan.frequence === 'Personnalisé') return []

  const blankSampling = (num: number, month: number, day: number): Sampling => ({
    id: generateId(),
    num,
    plannedMonth: month,
    plannedDay: day,
    status: 'planned' as SamplingStatus,
    doneDate: '',
    comment: '',
    nappe: '' as NappeType,
    rapportPrevu: false,
    rapportDate: '',
    tente: false,
    reportHistory: [],
    doneBy: '',
  })

  // Bimensuel — 2 prélèvements / mois, pas de jour fixé
  if (plan.frequence === 'Bimensuel') {
    const result: Sampling[] = []
    for (let m = 0; m < 12; m++) {
      result.push(blankSampling(result.length + 1, m, 0))
      result.push(blankSampling(result.length + 1, m, 0))
    }
    return result
  }

  // Mois cibles selon la fréquence
  let months: number[]
  if (plan.frequence === 'Mensuel') {
    months = Array.from({ length: 12 }, (_, i) => i)
  } else if (plan.frequence === 'Trimestriel') {
    months = [0, 3, 6, 9]
  } else if (plan.frequence === 'Semestriel') {
    months = [0, 6]
  } else {
    // Annuel
    months = [plan.customMonths[0] ?? 0]
  }

  // Mois personnalisés (sauf pour Annuel où customMonths[0] est déjà le mois cible)
  if (plan.customMonths.length > 0 && plan.frequence !== 'Annuel') {
    return plan.customMonths.map((month, i) =>
      blankSampling(i + 1, month, plan.customDays[String(month)] ?? plan.defaultDay)
    )
  }

  return months.map((month, i) =>
    blankSampling(i + 1, month, plan.customDays[String(month)] ?? plan.defaultDay)
  )
}
