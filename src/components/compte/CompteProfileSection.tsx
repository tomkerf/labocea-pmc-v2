import type { AppUser } from '@/types'
import UserAvatar from '@/components/ui/UserAvatar'
import { AVATAR_COLORS } from '@/components/ui/avatarColors'
import { COLORS } from '@/lib/constants'
import { EditRow } from './EditRow'

const roleLabel: Record<string, string> = {
  technicien: 'Technicien',
  charge_mission: 'Chargé de mission',
  admin: 'Administrateur',
}

export function CompteProfileSection({ appUser, onUpdate }: {
  appUser: AppUser | null
  onUpdate: (field: keyof AppUser, value: string) => void
}) {
  return (
    <div className="rounded-xl overflow-hidden mb-4"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>

      {/* Avatar + email */}
      <div className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <UserAvatar initiales={appUser?.initiales} color={appUser?.avatarColor} size={48} />
        <div>
          <p className="font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            {appUser?.prenom || appUser?.nom
              ? `${appUser?.prenom} ${appUser?.nom}`.trim()
              : <span style={{ color: 'var(--color-text-tertiary)' }}>Nom non renseigné</span>
            }
          </p>
          <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>{appUser?.email}</p>
        </div>
      </div>

      <EditRow label="Prénom"    value={appUser?.prenom ?? ''}    placeholder="Ex : Thomas"    onChange={v => onUpdate('prenom', v)} />
      <EditRow label="Nom"       value={appUser?.nom ?? ''}       placeholder="Ex : Kerfendal" onChange={v => onUpdate('nom', v)} />
      <EditRow label="Initiales" value={appUser?.initiales ?? ''} placeholder="Ex : THK"       onChange={v => onUpdate('initiales', v.toUpperCase())}
        hint="Utilisées comme identifiant préleveur" />

      {/* Couleur personnelle */}
      <div className="px-5 py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div>
          <span className="text-sm block" style={{ color: COLORS.TEXT_SECONDARY }}>Couleur personnelle</span>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Utilisée pour ton avatar et dans le planning</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {AVATAR_COLORS.map(c => (
            <button type="button" key={c.value}
              onClick={() => onUpdate('avatarColor', c.value)}
              className="size-6 rounded-full transition-transform"
              style={{
                background: c.value,
                border: appUser?.avatarColor === c.value ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                transform: appUser?.avatarColor === c.value ? 'scale(1.1)' : 'scale(1)',
              }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Rôle (lecture seule) */}
      <div className="px-5 py-3 flex justify-between items-center">
        <span className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>Rôle</span>
        <span className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
          {roleLabel[appUser?.role ?? ''] ?? '—'}
        </span>
      </div>
    </div>
  )
}
