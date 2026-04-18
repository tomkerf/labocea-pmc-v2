import { useAuthStore } from '@/stores/authStore'
import { logout } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'

export default function ComptePage() {
  const { appUser } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const roleLabel: Record<string, string> = {
    technicien: 'Technicien',
    charge_mission: 'Chargé de mission',
    admin: 'Administrateur',
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        Mon compte
      </h1>

      {/* Profil */}
      <div className="rounded-xl overflow-hidden mb-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>

        <div className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base"
            style={{ background: 'var(--color-accent)' }}>
            {appUser?.initiales || <User size={20} />}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {appUser?.prenom} {appUser?.nom}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {appUser?.email}
            </p>
          </div>
        </div>

        <Row label="Initiales" value={appUser?.initiales || '—'} />
        <Row label="Rôle" value={roleLabel[appUser?.role ?? ''] ?? '—'} last />
      </div>

      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 w-full px-5 py-4 rounded-xl text-sm font-medium transition-colors"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-danger)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <LogOut size={16} />
        Se déconnecter
      </button>
    </div>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="px-5 py-3 flex justify-between items-center"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  )
}
