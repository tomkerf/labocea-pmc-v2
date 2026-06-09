import { useEffect, useReducer } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { VisitePreliminaire } from '@/types'
import { COLLECTIONS } from '@/lib/constants'

type State = { visites: VisitePreliminaire[]; loading: boolean; prevLinkedId: string }
type Action =
  | { type: 'LOADED'; visites: VisitePreliminaire[] }
  | { type: 'ERROR' }
  | { type: 'RESET'; linkedId: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED': return { ...state, visites: action.visites, loading: false }
    case 'ERROR': return { ...state, visites: [], loading: false }
    case 'RESET': return { visites: [], loading: false, prevLinkedId: action.linkedId }
  }
}

export function useVisites(linkedId: string) {
  const [state, dispatch] = useReducer(reducer, {
    visites: [],
    loading: !!linkedId,
    prevLinkedId: linkedId,
  })

  if (linkedId !== state.prevLinkedId) {
    dispatch({ type: 'RESET', linkedId })
  }

  useEffect(() => {
    if (!linkedId) return
    const q = query(
      collection(db, COLLECTIONS.VISITES),
      where('linkedTo.id', '==', linkedId),
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VisitePreliminaire))
      data.sort((a, b) => b.date.localeCompare(a.date))
      dispatch({ type: 'LOADED', visites: data })
    }, () => {
      dispatch({ type: 'ERROR' })
    })
    return () => unsub()
  }, [linkedId])

  return { visites: state.visites, loading: state.loading }
}
