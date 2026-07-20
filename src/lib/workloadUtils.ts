import type { MethodeType, Plan } from '@/types'

// Points de charge (prélèvements équivalents) par méthode
export const METHOD_POINTS: Record<MethodeType, number> = {
  Ponctuel: 1,      // Base : 1 prélèvement
  Composite: 4,     // 2h sur site + 2 déplacements
  Automatique: 4,   // Bilan 24h : 2h sur site + 2 déplacements
}

// Eau souterraine : 2 points (1h sur place), prioritaire sur la méthode
export const POINTS_SOUTERRAINE = 2

// Limites de capacité mensuelle en points de charge (prélèvements équivalents)
export const CAPACITY_POINTS_PER_TECH_PER_MONTH = 50
export const THRESHOLD_WARNING_POINTS = 35
export const THRESHOLD_DANGER_POINTS = 60

/** Calcule les points de charge (prélèvements équivalents) d'un prélèvement. Priorité : nature Souterraine > méthode. */
export function getSamplingPoints(plan: Pick<Plan, 'nature' | 'methode'>): number {
  if (plan.nature === 'Souterraine') return POINTS_SOUTERRAINE
  return METHOD_POINTS[plan.methode] ?? METHOD_POINTS.Ponctuel
}

/** Formate les points de charge : 1 → "1 pt", 10 → "10 pts", 0 → "0 pt". */
export function formatPoints(points: number): string {
  return `${points} pt${points > 1 ? 's' : ''}`
}

