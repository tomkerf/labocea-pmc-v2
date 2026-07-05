import type { MethodeType, Plan } from '@/types'

// Durées d'intervention terrain par méthode (heures)
export const DURATION_HOURS: Record<MethodeType, number> = {
  Ponctuel: 0.25,   // 15 min sur place
  Composite: 2,     // 1h installation + 1h désinstallation
  Automatique: 2,   // Bilan 24h : 1h installation + 1h désinstallation
}

// Eau souterraine : 1h sur place, prioritaire sur la méthode
export const DURATION_SOUTERRAINE_HOURS = 1

// Conversion de l'ancienne échelle en nombre de prélèvements (35 prélèv./mois/tech,
// seuils 25/40) avec un facteur ~2h/intervention pour garder la même sensibilité
// visuelle. Valeurs ajustables selon le retour terrain.
export const CAPACITY_HOURS_PER_TECH_PER_MONTH = 70
export const THRESHOLD_WARNING_HOURS = 50
export const THRESHOLD_DANGER_HOURS = 80

/** Durée (heures) d'un prélèvement du plan. Priorité : nature Souterraine > méthode. */
export function getSamplingDurationHours(plan: Pick<Plan, 'nature' | 'methode'>): number {
  if (plan.nature === 'Souterraine') return DURATION_SOUTERRAINE_HOURS
  return DURATION_HOURS[plan.methode] ?? DURATION_HOURS.Ponctuel
}

/** Formate des heures décimales : 0.25 → "15min", 1 → "1h", 3.5 → "3h30", 0 → "0h". */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  if (totalMinutes === 0) return '0h'
  if (totalMinutes < 60) return `${totalMinutes}min`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
