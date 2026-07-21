import type { Todo, TodoPriority } from '@/types'

export type FormState = {
  titre: string;
  desc: string;
  priorite: TodoPriority;
  assignedTo: string;
  dueDate: string;
  clientId: string;
  equipementId: string;
  saving: boolean;
  deletingId: string | null;
}

export const initialFormState: FormState = {
  titre: '',
  desc: '',
  priorite: 'moyenne',
  assignedTo: 'equipe',
  dueDate: '',
  clientId: '',
  equipementId: '',
  saving: false,
  deletingId: null,
}

type SetFieldAction = {
  [K in keyof FormState]: { type: 'SET_FIELD'; field: K; value: FormState[K] }
}[keyof FormState]

export type FormAction =
  | SetFieldAction
  | { type: 'RESET_FORM' }
  | { type: 'LOAD_TODO'; payload: Todo }

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'RESET_FORM':
      return { ...initialFormState }
    case 'LOAD_TODO':
      return {
        ...state,
        titre: action.payload.titre,
        desc: action.payload.description || '',
        priorite: action.payload.priorite,
        assignedTo: action.payload.assignedTo || 'equipe',
        dueDate: action.payload.dueDate || '',
        clientId: action.payload.clientId || '',
        equipementId: action.payload.equipementId || '',
      }
    default:
      return state
  }
}
