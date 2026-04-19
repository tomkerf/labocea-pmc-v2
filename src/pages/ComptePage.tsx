import { useState, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { logout } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { LogOut, Check } from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import UserAvatar, { AVATAR_COLORS, getAvatarColor } from '@/components/ui/UserAvatar'
import type { AppUser } from '@/types'

const DEBOUNCE = 600

export default function ComptePage() {
  const { appUser, setAppUser } = useAuthStore()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function triggerSave(updated: AppUser) {
    setAppUser(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!updated.uid) return
      setSaving(true)
      try {
        await setDoc(doc(db, 'users', updated.uid), {
          prenom: updated.prenom,
          nom: updated.nom,
          initiales: updated.initiales,
          avatarColor: updated.avatarColor ?? null,
        }, { merge: true })
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE)
  }

  function update(field: keyof AppUser, value: string) {
    if (!appUser) return
    triggerSave({ ...appUser, [field]: value })
  }

  async function handleColorSelect(colorValue: string) {
    if (!appUser) return
    const updated = { ...appUser, avatarColor: colorValue }
    setSaving(true)
    try {
      await setDoc(doc(db, 'users', appUser.uid), { avatarColor: colorValue }, { merge: true })
      setAppUser(updated)
    } finally {
      setSaving(false)
    }
  }

  const roleLabel: Record<string, string> = {
    technicien: 'Technicien',
    charge_mission: 'Chargé de mission',
    admin: 'Administrateur',
  }

  const currentColor = getAvatarColor(appUser?.avatarColor)

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Mon compte
        </h1>
        {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
      </div>

      {/* Profil */}
      <div className="rounded-xl overflow-hidden mb-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>

        {/* En-tête avatar + email */}
        <div className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <UserAvatar
            initiales={appUser?.initiales}
            color={appUser?.avatarColor}
            size={48}
          />
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {appUser?.prenom || appUser?.nom
                ? `${appUser?.prenom} ${appUser?.nom}`.trim()
                : <span style={{ color: 'var(--color-text-tertiary)' }}>Nom non renseigné</span>
              }
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {appUser?.email}
            </p>
          </div>
        </div>

        {/* Champs éditables */}
        <EditRow
          label="Prénom"
          value={appUser?.prenom ?? ''}
          placeholder="Ex : Thomas"
          onChange={(v) => update('prenom', v)}
        />
        <EditRow
          label="Nom"
          value={appUser?.nom ?? ''}
          placeholder="Ex : Kerfendal"
          onChange={(v) => update('nom', v)}
        />
        <EditRow
          label="Initiales"
          value={appUser?.initiales ?? ''}
          placeholder="Ex : THK"
          onChange={(v) => update('initiales', v.toUpperCase())}
          hint="Utilisées comme identifiant préleveur"
        />

        {/* Rôle (lecture seule) */}
        <div className="px-5 py-3 flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Rôle</span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {roleLabel[appUser?.role ?? ''] ?? '—'}
          </span>
        </div>
      </div>

      {/* Sélecteur de couleur d'avatar */}
      <div className="rounded-xl mb-4 px-5 py-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Couleur de l'avatar
        </p>
        <div className="flex flex-wrap gap-2.5">
          {AVATAR_COLORS.map(({ id, value, label }) => {
            const isSelected = value === currentColor
            return (
              <button
                key={id}
                title={label}
                onClick={() => handleColorSelect(value)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: value,
                  border: '3px solid transparent',
                  outline: isSelected ? `2px solid ${value}` : '2px solid transparent',
                  outlineOffset: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s, outline 0.1s',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  cursor: 'pointer',
                }}
              >
                {isSelected && <Check size={14} color="white" strokeWidth={3} />}
              </button>
            )
          })}
        </div>

        {/* Aperçu */}
        <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <UserAvatar initiales={appUser?.initiales} color={appUser?.avatarColor} size={40} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {appUser?.prenom || appUser?.nom
                ? `${appUser?.prenom} ${appUser?.nom}`.trim()
                : 'Nom non renseigné'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Aperçu</p>
          </div>
        </div>
      </div>

      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 w-full px-5 py-4 rounded-xl text-sm font-medium"
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

// ── Composant champ éditable ──────────────────────────────────

function EditRow({
  label,
  value,
  placeholder,
  onChange,
  hint,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center gap-4">
        <label className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)', minWidth: 80 }}>
          {label}
        </label>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
      </div>
      {hint && (
        <p className="text-xs mt-1 ml-[88px]" style={{ color: 'var(--color-text-tertiary)' }}>{hint}</p>
      )}
    </div>
  )
}
