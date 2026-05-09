import { Navigate } from 'react-router-dom'
import { useAuthStore, selectRole } from '@/stores/authStore'

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = useAuthStore(selectRole)

  if (role === null) return null // profil pas encore chargé — RequireAuth gère le spinner

  if (role !== 'admin') return <Navigate to="/missions" replace />

  return <>{children}</>
}
