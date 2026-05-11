import { useMemo } from 'react'
import type { Verification, Equipement } from '@/types'

export type MetroRow =
  | { kind: 'verification'; data: Verification }
  | { kind: 'equipement';   data: Equipement   }

export interface StatutConfig {
  key:   string
  label: string
  bg:    string
  color: string
}

const STATUT_ORDER = { late: 0, soon: 1, ok: 2, none: 3 }

export function calcStatut(prochainDate: string): StatutConfig {
  if (!prochainDate) return { key: 'none', label: 'Non planifié', bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }
  const diff = new Date(prochainDate).getTime() - Date.now()
  const days30 = 30 * 24 * 60 * 60 * 1000
  if (diff < 0)      return { key: 'late', label: 'En retard', bg: 'var(--color-danger-light)',  color: 'var(--color-danger)'  }
  if (diff < days30) return { key: 'soon', label: 'À prévoir',  bg: 'var(--color-warning-light)', color: 'var(--color-warning)' }
  return                    { key: 'ok',   label: 'À jour',     bg: 'var(--color-success-light)', color: 'var(--color-success)' }
}

interface Params {
  verifications: Verification[]
  equipements:   Equipement[]
  filterStatut:  string
}

export function useMetrologieRows({ verifications, equipements, filterStatut }: Params) {

  const allRows = useMemo((): MetroRow[] => {
    const equipementsWithoutVerif = equipements.filter((eq) => {
      if (!eq.prochainEtalonnage) return false
      return !verifications.some((v) => v.equipementId === eq.id || v.equipementNom === eq.nom)
    })

    const rows: MetroRow[] = [
      ...verifications.map((v): MetroRow => ({ kind: 'verification', data: v })),
      ...equipementsWithoutVerif.map((eq): MetroRow => ({ kind: 'equipement', data: eq })),
    ]

    rows.sort((a, b) => {
      const dateA = a.kind === 'verification' ? a.data.prochainControle : a.data.prochainEtalonnage
      const dateB = b.kind === 'verification' ? b.data.prochainControle : b.data.prochainEtalonnage
      const orderDiff = (STATUT_ORDER[calcStatut(dateA).key as keyof typeof STATUT_ORDER] ?? 3)
                      - (STATUT_ORDER[calcStatut(dateB).key as keyof typeof STATUT_ORDER] ?? 3)
      if (orderDiff !== 0) return orderDiff
      if (!dateA) return 1
      if (!dateB) return -1
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    return rows
  }, [verifications, equipements])

  const filtered = useMemo(() => {
    if (!filterStatut) return allRows
    return allRows.filter((row) => {
      const date = row.kind === 'verification' ? row.data.prochainControle : row.data.prochainEtalonnage
      return calcStatut(date).key === filterStatut
    })
  }, [allRows, filterStatut])

  const lateCount = useMemo(() =>
    allRows.filter((r) => {
      const d = r.kind === 'verification' ? r.data.prochainControle : r.data.prochainEtalonnage
      return calcStatut(d).key === 'late'
    }).length,
    [allRows])

  return { allRows, filtered, lateCount }
}
