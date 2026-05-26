import { create } from 'zustand'
import type { Todo } from '@/types'

interface TodosStore {
  todos: Todo[]
  loading: boolean
  error: string | null
  setTodos: (todos: Todo[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateTodoLocally: (todo: Todo) => void
}

export const useTodosStore = create<TodosStore>((set) => ({
  todos: [],
  loading: true,
  error: null,
  setTodos: (todos) => set({ todos, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  updateTodoLocally: (todo) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === todo.id ? todo : t)),
    })),
}))
