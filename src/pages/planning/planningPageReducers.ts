import type { PlanningEvent, ViewMode } from '@/lib/planningUtils'

// ── UI State ─────────────────────────────────────────────────

export type UIState = {
  showDragHint: boolean
  showRain: boolean
  showMiniCal: boolean
  showBilanMois: boolean
  selectedDay: string | null
  dayModalInitialTab: 'pool' | 'evt'
  ctxMenu: { dateStr: string; x: number; y: number } | null
  eventDetail: { event: PlanningEvent; dateStr: string } | null
  ghostDetail: { event: PlanningEvent; dateStr: string } | null
  dragModal: { dateDebut: string; dateFin: string } | null
}

export type UIAction =
  | { type: 'SET_SHOW_DRAG_HINT'; value: boolean }
  | { type: 'SET_SHOW_RAIN'; value: boolean }
  | { type: 'SET_SHOW_MINI_CAL'; value: boolean }
  | { type: 'SET_SHOW_BILAN_MOIS'; value: boolean }
  | { type: 'SET_SELECTED_DAY'; value: string | null }
  | { type: 'SET_DAY_MODAL_TAB'; value: 'pool' | 'evt' }
  | { type: 'SET_CTX_MENU'; value: { dateStr: string; x: number; y: number } | null }
  | { type: 'SET_EVENT_DETAIL'; value: { event: PlanningEvent; dateStr: string } | null }
  | { type: 'SET_GHOST_DETAIL'; value: { event: PlanningEvent; dateStr: string } | null }
  | { type: 'SET_DRAG_MODAL'; value: { dateDebut: string; dateFin: string } | null }

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_SHOW_DRAG_HINT':  return { ...state, showDragHint: action.value }
    case 'SET_SHOW_RAIN':       return { ...state, showRain: action.value }
    case 'SET_SHOW_MINI_CAL':   return { ...state, showMiniCal: action.value }
    case 'SET_SHOW_BILAN_MOIS': return { ...state, showBilanMois: action.value }
    case 'SET_SELECTED_DAY':    return { ...state, selectedDay: action.value }
    case 'SET_DAY_MODAL_TAB':   return { ...state, dayModalInitialTab: action.value }
    case 'SET_CTX_MENU':        return { ...state, ctxMenu: action.value }
    case 'SET_EVENT_DETAIL':    return { ...state, eventDetail: action.value }
    case 'SET_GHOST_DETAIL':    return { ...state, ghostDetail: action.value }
    case 'SET_DRAG_MODAL':      return { ...state, dragModal: action.value }
  }
}

// ── Nav State ────────────────────────────────────────────────

export type NavState = {
  viewMode: ViewMode
  weekStart: Date
  monthStart: Date
  selectedDate: Date
}

export type NavAction =
  | { type: 'SET_VIEW_MODE'; value: ViewMode }
  | { type: 'SET_WEEK_START'; value: Date }
  | { type: 'SET_MONTH_START'; value: Date }
  | { type: 'SET_SELECTED_DATE'; value: Date }

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'SET_VIEW_MODE':     return { ...state, viewMode: action.value }
    case 'SET_WEEK_START':    return { ...state, weekStart: action.value }
    case 'SET_MONTH_START':   return { ...state, monthStart: action.value }
    case 'SET_SELECTED_DATE': return { ...state, selectedDate: action.value }
  }
}
