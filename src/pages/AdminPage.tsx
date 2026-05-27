import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ChevronLeft } from 'lucide-react'
import { useAuthStore, selectRole } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useClientsListener } from '@/hooks/useClients'
import { AdminChargeEquipe } from '@/components/admin/AdminChargeEquipe'
import { AdminCreateUserForm } from '@/components/admin/AdminCreateUserForm'
import { AdminUsersList } from '@/components/admin/AdminUsersList'
import { AdminBugsSection } from '@/components/admin/AdminBugsSection'

export default function AdminPage() {
  const navigate      = useNavigate()
  const role          = useAuthStore(selectRole)
  const { users }     = useUsersStore()
  useUsersListener()
  useClientsListener()

  useEffect(() => {
    if (role && role !== 'admin') navigate('/', { replace: true })
  }, [role, navigate])

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="px-6 py-5 flex items-center gap-4"
        style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
        <button type="button" onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Administration
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
        <AdminChargeEquipe />
        <AdminCreateUserForm />
        <AdminUsersList users={users} />
        <AdminBugsSection />
      </div>
    </div>
  )
}
