/** Génère un ID aléatoire court, compatible avec le format V1 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}
