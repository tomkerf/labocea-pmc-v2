/** Génère un UUID v4 cryptographiquement sûr */
export function generateId(): string {
  return crypto.randomUUID()
}
