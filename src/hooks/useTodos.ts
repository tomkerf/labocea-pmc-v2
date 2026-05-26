import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTodosStore } from '@/stores/todosStore'
import type { Todo } from '@/types'

export function useTodosListener() {
  const { setTodos, setError, setLoading } = useTodosStore()

  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Todo))
        setTodos(todos)
      },
      (err) => {
        console.error('Erreur écouteur todos:', err)
        setError(err.message)
      },
    )
    return () => unsub()
  }, [setTodos, setError, setLoading])
}
