import { useMemo, useEffect } from 'react'
import type { Preleveur } from '@/types'

interface UsePlanningFiltersParams {
  initiales: string
  allTechs: string[]
  preleveurs: Preleveur[]
  filterTech: string
  setFilterTech: (v: string) => void
  filterSite: string
}

export function usePlanningFilters({ initiales, allTechs, preleveurs, filterTech, setFilterTech, filterSite }: UsePlanningFiltersParams) {
  // Appliquer le filtre par défaut au premier chargement
  useEffect(() => {
    if (initiales && !localStorage.getItem('planning_filter_tech')) {
      setFilterTech(initiales)
      localStorage.setItem('planning_filter_tech', initiales)
    }
  }, [initiales, setFilterTech])

  const visibleTechs = useMemo(() => {
    if (!filterSite) return allTechs
    return allTechs.filter(code => {
      const prel = preleveurs.find(p => p.code === code)
      return (prel?.site ?? '') === filterSite
    })
  }, [allTechs, filterSite, preleveurs])

  // Réinitialiser filterTech si le tech sélectionné n'est plus visible (changement de site)
  useEffect(() => {
    if (filterTech && !visibleTechs.includes(filterTech)) {
      setFilterTech('')
      localStorage.setItem('planning_filter_tech', 'ALL')
    }
  }, [visibleTechs, filterTech, setFilterTech])

  // Quand un site est filtré sans tech spécifique, restreindre aux techs du site
  const allowedTechs = useMemo(() => {
    if (filterTech || !filterSite) return []
    return visibleTechs
  }, [filterTech, filterSite, visibleTechs])

  return { visibleTechs, allowedTechs }
}
