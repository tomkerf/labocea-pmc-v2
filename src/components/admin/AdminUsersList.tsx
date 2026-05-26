import UserAvatar from '@/components/ui/UserAvatar'
import type { AppUser, UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  technicien:      'Technicien',
  charge_mission:  'Chargé de mission',
  admin:           'Admin',
}

interface Props {
  users: AppUser[]
}

export function AdminUsersList({ users }: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Comptes existants ({users.length})
      </h2>
      <div className="flex flex-col rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
        {users.length === 0 && (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun utilisateur trouvé.
          </p>
        )}
        {users.map((u, i) => (
          <div key={u.uid}
            className="flex items-center gap-4 px-5 py-3.5"
            style={{ borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
            <UserAvatar initiales={u.initiales} color={u.avatarColor} size={36} fontSize={13} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {u.prenom} {u.nom}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                  {u.initiales}
                </span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{u.email}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: u.role === 'admin' ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                color: u.role === 'admin' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}>
              {ROLE_LABELS[u.role]}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
