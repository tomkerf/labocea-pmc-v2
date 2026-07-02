export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function formatDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function isThisMonth(dateStr: string): boolean {
  if (!dateStr) return false
  const d = dateStr.length === 10 ? new Date(dateStr + 'T12:00:00') : new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export function localISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  return dateStr === localISO(new Date())
}

/**
 * Nombre de jours entre aujourd'hui et `dateStr` (positif = futur, négatif = passé).
 *
 * Une date seule (`YYYY-MM-DD`) est interprétée à MIDI LOCAL, pas à minuit UTC.
 * Sinon `new Date("2026-07-01")` parse en UTC minuit et, tôt le matin en Europe,
 * le résultat décalait d'un jour (-1). Le suffixe `T12:00:00` neutralise ce biais
 * de fuseau (±12 h de marge). Les chaînes contenant déjà une heure sont laissées
 * telles quelles. Ne PAS remplacer par un calcul UTC (régression session 147).
 */
export function daysDiff(dateStr: string): number {
  const d = dateStr.length === 10 ? new Date(dateStr + 'T12:00:00') : new Date(dateStr)
  return Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
