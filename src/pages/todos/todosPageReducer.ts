import type { Todo } from '@/types'

const PRIO_WEIGHT: Record<string, number> = { haute: 3, moyenne: 2, basse: 1 }

export function sortTasks(tasks: Todo[]) {
  return tasks.toSorted((a, b) => {
    const prioA = PRIO_WEIGHT[a.priorite] || 0
    const prioB = PRIO_WEIGHT[b.priorite] || 0
    if (prioB !== prioA) return prioB - prioA
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })
}

export type PageState = {
  search: string
  filterTab: 'toutes' | 'mes_taches' | 'equipe' | 'priorite'
  filterPriority: string
  showModal: boolean
  editingTodo: Todo | null
  showCompleted: boolean
  showInProgress: boolean
  showTodo: boolean
}

export type PageAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER_TAB'; payload: 'toutes' | 'mes_taches' | 'equipe' | 'priorite' }
  | { type: 'SET_FILTER_PRIORITY'; payload: string }
  | { type: 'OPEN_ADD_MODAL' }
  | { type: 'OPEN_EDIT_MODAL'; payload: Todo }
  | { type: 'CLOSE_MODAL' }
  | { type: 'TOGGLE_SHOW_COMPLETED' }
  | { type: 'TOGGLE_SHOW_IN_PROGRESS' }
  | { type: 'TOGGLE_SHOW_TODO' }

export const initialPageState: PageState = {
  search: '',
  filterTab: 'toutes',
  filterPriority: '',
  showModal: false,
  editingTodo: null,
  showCompleted: false,
  showInProgress: true,
  showTodo: true,
}

export function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'SET_SEARCH':         return { ...state, search: action.payload }
    case 'SET_FILTER_TAB':     return { ...state, filterTab: action.payload }
    case 'SET_FILTER_PRIORITY':return { ...state, filterPriority: action.payload }
    case 'OPEN_ADD_MODAL':     return { ...state, showModal: true, editingTodo: null }
    case 'OPEN_EDIT_MODAL':    return { ...state, showModal: true, editingTodo: action.payload }
    case 'CLOSE_MODAL':        return { ...state, showModal: false }
    case 'TOGGLE_SHOW_COMPLETED':  return { ...state, showCompleted: !state.showCompleted }
    case 'TOGGLE_SHOW_IN_PROGRESS':return { ...state, showInProgress: !state.showInProgress }
    case 'TOGGLE_SHOW_TODO':       return { ...state, showTodo: !state.showTodo }
    default: return state
  }
}
