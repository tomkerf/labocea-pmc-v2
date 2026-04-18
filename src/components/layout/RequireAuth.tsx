import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { initialized, firebaseUser } = useAuthStore()

  // Attendre que Firebase Auth soit initialisé
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
