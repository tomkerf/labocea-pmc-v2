export interface FiltersState {
  search: string
  filterCategorie: string
  filterEtat: string
  filterSite: string
  filterTechnicien: string
  filterMateriau: string
  filterMarque: string
}

export type FiltersAction =
  | { type: 'setFilter'; name: keyof FiltersState; value: string }
  | { type: 'reset' }

export const initialFilters: FiltersState = {
  search: '',
  filterCategorie: '',
  filterEtat: '',
  filterSite: '',
  filterTechnicien: '',
  filterMateriau: '',
  filterMarque: '',
}

export function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'setFilter': return { ...state, [action.name]: action.value }
    case 'reset':     return initialFilters
    default:          return state
  }
}
