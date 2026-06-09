import { useMemo } from 'react'
import type { Preleveur } from '@/stores/preleveursStore'

interface UsePlanningFiltersParams {
  allTechs:    string[]
  preleveurs:  Preleveur[]
  filterTech:  string
  filterSite:  string
}

export function usePlanningFilters({ allTechs, preleveurs, filterTech, filterSite }: UsePlanningFiltersParams) {
  const visibleTechs = useMemo(() => {
    if (!filterSite) return allTechs
    return allTechs.filter(code => {
      const prel = preleveurs.find(p => p.code === code)
      return (prel?.site ?? '') === filterSite
    })
  }, [allTechs, filterSite, preleveurs])

  // Dérivé : si le tech sélectionné n'est plus visible (changement de site), on retourne ''
  const activeFilterTech = visibleTechs.includes(filterTech) ? filterTech : ''

  const allowedTechs = useMemo(() => {
    if (activeFilterTech || !filterSite) return []
    return visibleTechs
  }, [activeFilterTech, filterSite, visibleTechs])

  return { visibleTechs, allowedTechs, activeFilterTech }
}
