import type { Plan, Sampling, SamplingStatus, NappeType } from '@/types'
import { generateId } from './ids'

/** Date d'envoi par défaut d'un rapport prévu : un mois après la date de réalisation.
 *  Arithmétique 100 % UTC : setMonth() local + toISOString() UTC décalait la date
 *  d'un jour quand le mois ajouté franchissait le passage à l'heure d'été (mars → avril). */
export function computeRapportDatePrevue(doneDateISO: string): string {
  const d = new Date(doneDateISO)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

/** Champs requis selon le statut : motif si Non effectué/En retard, date réalisée si Réalisé. */
export function validateSampling(s: Pick<Sampling, 'status' | 'motif' | 'doneDate'>) {
  const errors: { motif?: string; doneDate?: string } = {}
  if ((s.status === 'non_effectue' || s.status === 'overdue') && !(s.motif ?? '').trim()) {
    errors.motif = 'Motif obligatoire pour ce statut'
  }
  if (s.status === 'done' && !s.doneDate) {
    errors.doneDate = 'Date réalisée obligatoire pour un prélèvement réalisé'
  }
  return errors
}

/** Génère la liste initiale des prélèvements pour un plan selon sa fréquence.
 *  - 'Personnalisé'  → retourne [] (saisie manuelle uniquement)
 *  - 'Hebdomadaire'  → une occurrence par semaine sur plan.defaultWeeklyDay, calculée sur `year`
 *  - 'Bimensuel'     → 2 prélèvements par mois, jour non fixé (plannedDay = 0)
 *  - Autres          → un prélèvement par mois cible, jour depuis customDays ou defaultDay
 *
 *  Si plan.customMonths est renseigné (et fréquence ≠ 'Annuel'), les mois personnalisés
 *  remplacent les mois par défaut de la fréquence.
 */
export function generateSamplings(plan: Plan, year: number = new Date().getFullYear()): Sampling[] {
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

  // Hebdomadaire — une occurrence par semaine sur le jour choisi, calculée sur l'année réelle
  // (contrairement aux autres fréquences, "tous les lundis" dépend du calendrier de l'année).
  if (plan.frequence === 'Hebdomadaire') {
    // ?? 0 : les plans créés avant l'ajout de ce champ n'ont pas defaultWeeklyDay en base
    // malgré le typage TS qui le déclare requis — sans ce filet, la comparaison ne matchait
    // jamais et générait silencieusement 0 prélèvement.
    const targetWeekday = plan.defaultWeeklyDay ?? 0
    const result: Sampling[] = []
    const end = new Date(year, 11, 31)
    let num = 1
    for (const d = new Date(year, 0, 1); d <= end; d.setDate(d.getDate() + 1)) {
      const weekday = (d.getDay() + 6) % 7 // JS: dim=0..sam=6 → lun=0..dim=6
      if (weekday === targetWeekday) {
        result.push(blankSampling(num++, d.getMonth(), d.getDate()))
      }
    }
    return result
  }

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
