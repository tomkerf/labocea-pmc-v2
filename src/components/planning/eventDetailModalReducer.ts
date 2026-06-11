export type ActivePanel = 'none' | 'moving' | 'changingTech' | 'canceling' | 'changingEquipements'

export interface ModalState {
  activePanel: ActivePanel
  moveDate: string
  moveReason: string
  cancelReason: string
  techInitiales: string
  equipementsAssignes: string[]
}

export type ModalAction =
  | { type: 'TOGGLE_PANEL'; panel: Exclude<ActivePanel, 'none'> }
  | { type: 'SET_MOVE_DATE'; value: string }
  | { type: 'SET_MOVE_REASON'; value: string }
  | { type: 'SET_CANCEL_REASON'; value: string }
  | { type: 'SET_TECH_INITIALES'; value: string }
  | { type: 'TOGGLE_EQUIPEMENT'; id: string }
  | { type: 'RESET' }

export function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'TOGGLE_PANEL':
      return { ...state, activePanel: state.activePanel === action.panel ? 'none' : action.panel }
    case 'SET_MOVE_DATE':      return { ...state, moveDate: action.value }
    case 'SET_MOVE_REASON':    return { ...state, moveReason: action.value }
    case 'SET_CANCEL_REASON':  return { ...state, cancelReason: action.value }
    case 'SET_TECH_INITIALES': return { ...state, techInitiales: action.value }
    case 'TOGGLE_EQUIPEMENT': {
      const prev = state.equipementsAssignes
      return {
        ...state,
        equipementsAssignes: prev.includes(action.id) ? prev.filter(x => x !== action.id) : [...prev, action.id],
      }
    }
    case 'RESET':
      return { activePanel: 'none', moveDate: '', moveReason: '', cancelReason: '', techInitiales: '', equipementsAssignes: [] }
    default:
      return state
  }
}
