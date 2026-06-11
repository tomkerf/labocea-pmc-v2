import { isSamplingOverdue } from '@/lib/overdue'
import type { Client, Plan, Sampling } from '@/types'
import { COLORS } from '@/lib/constants'

export type RowData = {
  client: Client
  plan: Plan
  samplingsByMonth: (Sampling | null)[]
  pairsByMonth: (Sampling | null)[][]
}

export type GroupData = {
  client: Client
  plans: RowData[]
}

export function getStatusColor(s: Sampling | null, planYear: number): string {
  if (!s) return 'transparent'
  if (s.status === 'done') return COLORS.SUCCESS
  if (s.status === 'non_effectue') return 'var(--color-neutral)'
  if (isSamplingOverdue(s, planYear)) return COLORS.DANGER
  if (s.status === 'planned') return COLORS.WARNING
  return COLORS.BORDER
}

export function getStatusLabel(s: Sampling | null, planYear: number): string {
  if (!s) return ''
  if (s.status === 'done') return 'Fait'
  if (s.status === 'non_effectue') return 'Non fait'
  if (isSamplingOverdue(s, planYear)) return 'En retard'
  if (s.status === 'planned') return 'Planifié'
  return ''
}

export function getStatusIcon(s: Sampling, planYear: number): string {
  if (s.status === 'done') return '✓'
  if (s.status === 'non_effectue') return '✕'
  if (isSamplingOverdue(s, planYear)) return '!'
  return ''
}
