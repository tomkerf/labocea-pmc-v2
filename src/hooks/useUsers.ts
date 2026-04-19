import { useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUsersStore } from '@/stores/usersStore'
import type { AppUser } from '@/types'

export function useUsersListener() {
  const { setUsers } = useUsersStore()

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)))
    })
    return () => unsub()
  }, [setUsers])
}
