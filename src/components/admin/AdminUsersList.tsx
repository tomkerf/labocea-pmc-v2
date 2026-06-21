import { useState } from 'react'
import UserAvatar from '@/components/ui/UserAvatar'
import type { AppUser, UserRole } from '@/types'
import { updateUserProfile } from '@/services/userService'
import { COLORS } from '@/lib/constants'
import { toast } from '@/stores/toastStore'

interface Props {
  users: AppUser[]
}

export function AdminUsersList({ users }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setUpdating(uid)
    try {
      await updateUserProfile(uid, { role: newRole })
      toast.success('Rôle mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: COLORS.TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Comptes existants ({users.length})
      </h2>
      <div className="flex flex-col rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}>
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
              <p className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
                {u.prenom} {u.nom}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                  {u.initiales}
                </span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{u.email}</p>
            </div>
            
            <select
              disabled={updating === u.uid}
              value={u.role}
              onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-colors"
              style={{
                background: u.role === 'admin' ? 'var(--color-accent-light)' : COLORS.BG_TERTIARY,
                color: u.role === 'admin' ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
                border: '1px solid transparent',
                outline: 'none',
                opacity: updating === u.uid ? 0.6 : 1
              }}
            >
              <option value="technicien">Technicien</option>
              <option value="charge_mission">Chargé de mission</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </div>
    </section>
  )
}
