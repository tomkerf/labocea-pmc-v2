import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
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
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

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

  const startEditInitiales = (u: AppUser) => {
    setEditingUid(u.uid)
    setEditValue(u.initiales)
  }

  const cancelEditInitiales = () => {
    setEditingUid(null)
    setEditValue('')
  }

  const handleInitialesSave = async (uid: string) => {
    const value = editValue.trim().toUpperCase().slice(0, 4)
    if (!value) {
      toast.error('Les initiales ne peuvent pas être vides')
      return
    }
    setUpdating(uid)
    try {
      await updateUserProfile(uid, { initiales: value })
      toast.success('Initiales mises à jour')
      setEditingUid(null)
      setEditValue('')
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
              <p className="text-sm font-medium flex items-center" style={{ color: COLORS.TEXT_PRIMARY }}>
                {u.prenom} {u.nom}
                {editingUid === u.uid ? (
                  <span className="ml-2 flex items-center gap-1">
                    <input
                      aria-label="Initiales"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value.toUpperCase().slice(0, 4))}
                      maxLength={4}
                      autoFocus
                      className="w-14 text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }}
                    />
                    <button type="button" onClick={() => handleInitialesSave(u.uid)} disabled={updating === u.uid}
                      className="p-1 rounded" style={{ color: COLORS.SUCCESS }} title="Enregistrer">
                      <Check size={13} />
                    </button>
                    <button type="button" onClick={cancelEditInitiales} disabled={updating === u.uid}
                      className="p-1 rounded" style={{ color: COLORS.TEXT_SECONDARY }} title="Annuler">
                      <X size={13} />
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => startEditInitiales(u)}
                    className="ml-2 flex items-center gap-1 text-xs font-normal group"
                    style={{ color: 'var(--color-text-tertiary)' }} title="Modifier les initiales">
                    {u.initiales}
                    <Pencil size={10} className="opacity-0 group-hover:opacity-100" />
                  </button>
                )}
              </p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{u.email}</p>
              {editingUid === u.uid && (
                <p className="text-xs mt-1" style={{ color: COLORS.WARNING }}>
                  Pense à retirer puis ré-ajouter ce compte dans "Préleveurs — Planning" pour synchroniser le Planning.
                </p>
              )}
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
