/**
 * planningUtils.ts
 * ─────────────────────────────────────────────────────────────────
 * Fonctions pures, constantes et types extraits de PlanningPage.tsx.
 * Aucune dépendance sur React ou le state — 100 % testables en isolation.
 */

import type { Maintenance, EvenementPersonnel, TypeEvenement } from '@/types'

// ── Types ───────────────────────────────────────────────────────

export interface PlanningEvent {
  id: string
  type: 'prelevement' | 'maintenance' | 'verification' | 'evenement' | 'todo' | 'rapport'
  title: string
  subtitle: string
  statusLabel: string
  statusBg: string
  statusColor: string
  link: string
  isDone: boolean
  priority: number        // 0=retard, 1=non_effectue, 2=planifié, 3=réalisé, 4=fantôme
  technicien: string
  count?: number          // nb prélèvements regroupés (même client, même jour)
  j1DateStr?: string      // Utilisé pour les J2 proxies pour lier à la même clé de toggleGroup
  plannedTime?: string
  clientId?: string
  planId?: string
  samplingId?: string
  equipementsAssignes?: string[]
  frequence?: string
  methode?: string
  meteo?: string
  analysesSousTraitees?: boolean
  cofrac?: boolean
  maintenanceData?: Maintenance
  evenementData?: EvenementPersonnel
  todoData?: import('@/types').Todo
  // Fantôme (historique report / retrait)
  isGhost?: boolean
  ghostAction?: 'retiré' | 'reporté'
  ghostNewDate?: string   // date de destination si reporté
  ghostReason?: string
  ghostBy?: string
  ghostAt?: string
  // Bilan 24h spanning J1→J2
  dateFin?: string          // présent sur J1 uniquement — date du J2
  isJ2Continuation?: boolean // vrai sur J2 — masqué des colonnes semaine/mois
  subEvents?: PlanningEvent[]
  lat?: string
  lng?: string
}

export interface PoolItem {
  sampling: import('@/types').Sampling
  clientId: string
  clientNom: string
  planId: string
  planNom: string
  siteNom: string
  frequence: string
  techInitiales: string
  meteo: string
  analysesSousTraitees: boolean
  cofrac: boolean
  methode: string
}

export type ViewMode = 'jour' | 'semaine' | 'mois' | 'carte' | 'annee'

export type TimedEvent = PlanningEvent & {
  startMin: number
  durationMin: number
  col: number
  totalCols: number
}

export interface TechOption {
  code: string
  label: string
}

// ── Constantes ──────────────────────────────────────────────────

export const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export const JOURS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
export const MOIS_LONG   = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export const SAMPLING_LABEL: Record<string, string> = {
  planned:      'Planifié',
  done:         'Réalisé',
  overdue:      'En retard',
  non_effectue: 'Non effectué',
}

export const MAINTENANCE_LABEL: Record<string, string> = {
  planifiee: 'Planifiée', en_cours: 'En cours', realisee: 'Réalisée', abandonnee: 'Abandonnée',
}

export const EVENEMENT_LABEL: Record<TypeEvenement, string> = {
  rappel: 'Rappel', reunion: 'Réunion', rapport: 'Rapport', autre: 'Autre', conge: 'Congé/RTT', meteo: 'Météo',
}

import { AVATAR_COLORS } from '@/components/ui/avatarColors'
import { useUsersStore } from '@/stores/usersStore'
import { COLORS } from '@/lib/constants'


// ── Couleurs par technicien ──────────────────────────────────────
// Règle : ne pas utiliser les couleurs de statut du planning
//   danger #FF3B30, success #34C759, warning #FF9F0A, accent #0071E3, neutral #8E8E93
const TECH_COLORS: Record<string, { color: string; bg: string }> = {
  'THK': { color: '#0071E3', bg: '#E8F1FB' },  // Thomas Kerfendal - bleu accent
  'ROD': { color: '#00C7BE', bg: '#E0F7F6' },  // Romain Duvail - teal
  'FBA': { color: '#AF52DE', bg: '#F5EEFF' },  // Fabien Barloy - violet
  'DBE': { color: '#FF2D55', bg: '#FFEEF2' },  // Delphine Benard - rose
  'LDU': { color: '#5856D6', bg: '#EEEEFF' },  // Ludovic Dugue - indigo
  'POGR': { color: '#FF6B6B', bg: '#FFF0F0' }, // Pierre Olivier Groulard - saumon
  'HJE': { color: '#32ADE6', bg: '#E5F5FD' },  // Hubert Jehl - bleu ciel
  'EMO': { color: '#F3526E', bg: '#FDF0F3' },  // Emmanuelle Moreau Haug - magenta
  'CTA': { color: '#5A738E', bg: '#EFF3F6' },  // Cindy Tabard - bleu ardoise
}
const TECH_PALETTE = [
  { color: '#AF52DE', bg: '#F5EEFF' },  // violet
  { color: '#5856D6', bg: '#EEEEFF' },  // indigo
  { color: '#FF2D55', bg: '#FFEEF2' },  // rose (distinct du rouge danger)
  { color: '#32ADE6', bg: '#E5F5FD' },  // bleu ciel
  { color: '#FF6B6B', bg: '#FFF0F0' },  // saumon
]

export function getTechColor(initiales: string): { color: string; bg: string } {
  // 1. Chercher dans les utilisateurs de la base
  const user = useUsersStore.getState().users.find(u => u.initiales === initiales)
  if (user?.avatarColor) {
    const match = AVATAR_COLORS.find(c => c.value === user.avatarColor)
    if (match) {
      return { color: match.value, bg: match.accentLight }
    }
  }

  // 2. Fallbacks codés en dur ou générés
  if (TECH_COLORS[initiales]) return TECH_COLORS[initiales]
  if (!initiales || initiales === '—') return { color: 'var(--color-neutral)', bg: COLORS.BG_TERTIARY }
  const idx = [...initiales].reduce((a, c) => a + c.charCodeAt(0), 0) % TECH_PALETTE.length
  return TECH_PALETTE[idx]
}

// ── Jours fériés français ────────────────────────────────────────

function easterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

export function getFrenchHolidays(year: number): Record<string, string> {
  const easter = easterDate(year)
  const add = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return {
    [fmt(new Date(year,  0,  1))]: 'Jour de l\'an',
    [fmt(add(easter,      1))]:    'Lundi de Pâques',
    [fmt(new Date(year,  4,  1))]: 'Fête du Travail',
    [fmt(new Date(year,  4,  8))]: 'Victoire 1945',
    [fmt(add(easter,     39))]:    'Ascension',
    [fmt(add(easter,     50))]:    'Lundi de Pentecôte',
    [fmt(new Date(year,  6, 14))]: 'Fête Nationale',
    [fmt(new Date(year,  7, 15))]: 'Assomption',
    [fmt(new Date(year, 10,  1))]: 'Toussaint',
    [fmt(new Date(year, 10, 11))]: 'Armistice',
    [fmt(new Date(year, 11, 25))]: 'Noël',
  }
}

/** Retourne le nom du jour férié si dateStr est la veille, sinon null */
export function isVeilleJourFerie(dateStr: string): string | null {
  const d    = new Date(dateStr + 'T12:00:00')
  const next = new Date(d); next.setDate(next.getDate() + 1)
  const nextStr = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`
  const holidays = getFrenchHolidays(next.getFullYear())
  return holidays[nextStr] ?? null
}

// ── Helpers date ─────────────────────────────────────────────────

export function startOfWeek(d: Date): Date {
  const r = new Date(d); const day = r.getDay()
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r
}

export function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }

export function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate()+n); return r }

export function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth()+n, 1) }

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function sameDay(a: Date, b: Date): boolean { return toISO(a) === toISO(b) }

// ── Grilles calendrier ───────────────────────────────────────────

/** Grille mensuelle 7 colonnes (lun-dim) */
export function buildMonthGrid(ms: Date): (Date|null)[] {
  const y = ms.getFullYear(), m = ms.getMonth()
  const dim = new Date(y, m+1, 0).getDate()
  const firstDow = ms.getDay() // 0=dim, 1=lun … 6=sam
  const offset = firstDow === 0 ? 6 : firstDow - 1
  const cells: (Date|null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d))
  while (cells.length % 7) cells.push(null)
  return cells
}

/** Grille mini-calendrier 7 colonnes (lun-dim complet) */
export function buildMiniGrid(ms: Date): (Date|null)[] {
  const y = ms.getFullYear(), m = ms.getMonth()
  const dim = new Date(y, m+1, 0).getDate()
  const firstDow = ms.getDay() // 0=dim
  const offset = firstDow === 0 ? 6 : firstDow - 1
  const cells: (Date|null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d))
  while (cells.length % 7) cells.push(null)
  return cells
}

// ── Helpers vue Jour ─────────────────────────────────────────────

export function parseHHMM(hhmm: string): number {
  const p = hhmm.split(':')
  return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0)
}

export function assignColumns(
  evts: Array<PlanningEvent & { startMin: number; durationMin: number }>
): TimedEvent[] {
  if (!evts.length) return []
  const sorted = evts.toSorted((a, b) => a.startMin - b.startMin)
  const colEnds: number[] = []
  const assigned: TimedEvent[] = sorted.map(evt => {
    let col = colEnds.findIndex(end => end <= evt.startMin)
    if (col === -1) col = colEnds.length
    colEnds[col] = evt.startMin + evt.durationMin
    return { ...evt, col, totalCols: 0 }
  })
  assigned.forEach(e => { e.totalCols = colEnds.length })
  return assigned
}

/**
 * Événement multi-jour :
 * - Bilans 24h (prelevement avec dateFin / isJ2Continuation) → bande dédiée
 */
export function isMultiDay(e: PlanningEvent): boolean {
  if (e.type === 'prelevement' && !!e.dateFin) return true  // J1
  if (e.isJ2Continuation === true) return true               // J2
  return false
}

// ── Tri et regroupement ──────────────────────────────────────────

export function sortEvts(evts: PlanningEvent[]): PlanningEvent[] {
  return evts.slice().sort((a,b) => {
    // Fantômes toujours en bas
    if (a.isGhost && !b.isGhost) return 1
    if (!a.isGhost && b.isGhost) return -1
    if (!a.plannedTime && !b.plannedTime) {
      // Bilan 24h : J2 avant J1 (le technicien passe en J2 avant de faire J1)
      const aIsJ2 = a.isJ2Continuation === true
      const bIsJ2 = b.isJ2Continuation === true
      if (aIsJ2 && !bIsJ2) return -1
      if (!aIsJ2 && bIsJ2) return 1
      return 0
    }
    if (!a.plannedTime) return -1   // sans heure → en haut
    if (!b.plannedTime) return 1
    if (a.plannedTime && b.plannedTime) return a.plannedTime.localeCompare(b.plannedTime)
    return 0
  })
}

/** Regroupe les prélèvements et rapports du même client sur un même jour en une seule pill */
export function groupByClient(evts: PlanningEvent[]): PlanningEvent[] {
  const ghosts = evts.filter(e => e.isGhost)
  const groupable = evts.filter(e => !e.isGhost && (e.type === 'prelevement' || e.type === 'rapport'))
  const others = evts.filter(e => !e.isGhost && e.type !== 'prelevement' && e.type !== 'rapport')

  const groups = new Map<string, PlanningEvent[]>()
  groupable.forEach(e => {
    const key = e.clientId ? `${e.clientId}_${e.type}` : e.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  })

  const statusPri = (e: PlanningEvent) => e.priority ?? 2

  const merged: PlanningEvent[] = []
  groups.forEach(group => {
    if (group.length === 1) { merged.push(group[0]); return }
    const worst = group.reduce((best, e) => statusPri(e) < statusPri(best) ? e : best, group[0])
    // Noms de points uniques (retire "· Bilan 24h J1/J2" pour dédupliquer)
    const pointNames = [...new Set(
      group.flatMap(e => {
        const s = e.subtitle.replace(/ · Bilan 24h J[12]$/, '').replace(/ · Rapport$/, '')
        return s && s !== '—' && s !== 'Rapport' ? [s] : []
      })
    )]
    
    let subtitle = ''
    if (pointNames.length > 0 && pointNames.length <= 2) {
      subtitle = pointNames.join(' · ')
    } else {
      const defaultLabel = worst.type === 'rapport' ? 'rapports' : 'prélèvements'
      subtitle = `${group.length} ${defaultLabel}`
    }
    
    merged.push({ ...worst, subtitle, count: group.length, link: `/missions/${worst.clientId}`, subEvents: group })
  })

  // Fantômes toujours en fin de liste (sortEvts les pousse en bas aussi)
  return sortEvts([...merged, ...others, ...ghosts])
}

/** Extrait les initiales du technicien — ex: "Thomas THK" → "THK" */
export function normTech(s: string): string {
  if (!s || s === '—') return s
  const parts = s.trim().split(' ')
  return parts[parts.length - 1]
}

// ── Types partagés entre PlanningPage et WeekView ──────────────────────────

export type BilanItem  = { colIdx: number; event: PlanningEvent }
export type BilanGroup = { colStart: number; colEnd: number; techColor: string; items: BilanItem[] }

export type AllDayItem = {
  key:      string
  colStart: number
  colEnd:   number
  row:      number
  bg:       string
  label:    string
  badge?:   string
  onClick:  () => void
  tooltip:  string
}

export function getISOWeek(d: Date): number {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
  const y = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil((((utc.getTime() - y.getTime()) / 86400000) + 1) / 7)
}

export function getPeriodLabel(viewMode: ViewMode, selectedDate: Date, weekStart: Date, monthStart: Date): string {
  if (viewMode === 'jour' || viewMode === 'carte') {
    return `${JOURS_LONG[(selectedDate.getDay()+6)%7]} ${selectedDate.getDate()} ${MOIS_LONG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }
  if (viewMode === 'semaine') {
    const end = addDays(weekStart, 6)
    if (weekStart.getMonth() === end.getMonth())
      return `${weekStart.getDate()}–${end.getDate()} ${MOIS_LONG[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    return `${weekStart.getDate()} ${MOIS_LONG[weekStart.getMonth()]} – ${end.getDate()} ${MOIS_LONG[end.getMonth()]} ${end.getFullYear()}`
  }
  if (viewMode === 'annee') {
    return `Année ${selectedDate.getFullYear()}`
  }
  return `${MOIS_LONG[monthStart.getMonth()]} ${monthStart.getFullYear()}`
}

export function filterEvents(
  evts: PlanningEvent[],
  filterTech: string,
  filterRetard: boolean,
  allowedTechs?: string[],
): PlanningEvent[] {
  if (filterTech)
    evts = evts.filter(e => e.type === 'verification' || e.type === 'maintenance' || normTech(e.technicien) === filterTech)
  else if (allowedTechs && allowedTechs.length > 0)
    evts = evts.filter(e => e.type === 'verification' || e.type === 'maintenance' || allowedTechs.includes(normTech(e.technicien)))
  if (filterRetard) evts = evts.filter(e => e.priority === 0)
  return evts
}
