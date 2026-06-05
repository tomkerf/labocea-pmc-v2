import { collection, doc, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { Todo } from '@/types'

const COLLECTION = 'todos'

function cleanObject<T extends object>(obj: T): T {
  const cleaned = { ...obj }
  for (const key in cleaned) {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  }
  return cleaned
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveTodo(todo: Todo, _uid: string): Promise<void> {
  const ref = doc(db, COLLECTION, todo.id)
  // On omet createdAt pour éviter de l'écraser s'il n'est pas converti correctement,
  // et on utilise serverTimestamp pour updatedAt.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, ...rest } = todo
  await trackWrite(
    setDoc(
      ref,
      cleanObject({
        ...rest,
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    )
  )
}

export async function createTodo(
  uid: string,
  partial: Omit<Todo, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await trackWrite(
    addDoc(
      collection(db, COLLECTION),
      cleanObject({
        ...partial,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  )
  return ref.id
}

export async function deleteTodo(todoId: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, COLLECTION, todoId)))
}
