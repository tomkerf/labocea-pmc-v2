import { useState, useRef } from 'react'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { logout } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { LogOut, Check, X, RefreshCw } from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import UserAvatar, { AVATAR_COLORS, getAvatarColor, dicebearUrl } from '@/components/ui/UserAvatar'
import type { AppUser } from '@/types'

// Pool de seeds — mots nature/eau/terrain pour des avatars variés
const SEED_POOL = [
  'rivière','océan','cascade','source','marée','torrent','delta','estuaire',
  'falaise','montagne','forêt','prairie','bruyère','tourbière','marais','lande',
  'algue','corail','baleine','dauphin','loutre','héron','cygne','truite',
  'granite','basalte','limon','argile','calcaire','schiste','quartzite','silex',
  'brume','aurore','solstice','équinoxe','zénith','vortex','prisma','nebula',
  'atlas','boussole','sextant','niveau','balance','jauge','sonde','capteur',
]

function pickSeeds(n = 16, exclude?: string): string[] {
  const pool = exclude ? SEED_POOL.filter(s => s !== exclude) : [...SEED_POOL]
  const shuffled = pool.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

const DEBOUNCE = 600

export default function ComptePage() {
  const appUser = useAuthStore(selectAppUser)
  const setAppUser = useAuthStore(s => s.setAppUser)
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [seeds, setSeeds] = useState<string[]>(() => {
    const initial = pickSeeds(16, appUser?.avatarSeed)
    // Si l'user a déjà un seed, le mettre en premier
    return appUser?.avatarSeed ? [appUser.avatarSeed, ...initial.slice(0, 15)] : initial
  })
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
          prenom:      updated.prenom,
          nom:         updated.nom,
          initiales:   updated.initiales,
          avatarColor: updated.avatarColor ?? null,
          avatarSeed:  updated.avatarSeed  ?? null,
        }, { merge: true })
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE)
  }

  async function handleSeedSelect(seed: string) {
    if (!appUser) return
    const next = seed === appUser.avatarSeed ? undefined : seed  // reclic = retirer
    const updated = { ...appUser, avatarSeed: next }
    setSaving(true)
    try {
      await setDoc(doc(db, 'users', appUser.uid), { avatarSeed: next ?? null }, { merge: true })
      setAppUser(updated)
    } finally {
      setSaving(false)
    }
  }

  function refreshSeeds() {
    setSeeds(pickSeeds(16, appUser?.avatarSeed))
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
            avatarSeed={appUser?.avatarSeed}
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

      {/* Sélecteur d'avatar */}
      <div className="rounded-xl mb-4 px-5 py-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>

        {/* Aperçu */}
        <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <UserAvatar initiales={appUser?.initiales} color={appUser?.avatarColor} avatarSeed={appUser?.avatarSeed} size={48} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {appUser?.prenom || appUser?.nom ? `${appUser?.prenom} ${appUser?.nom}`.trim() : 'Nom non renseigné'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Aperçu</p>
          </div>
          {appUser?.avatarSeed && (
            <button
              onClick={() => handleSeedSelect(appUser.avatarSeed!)}
              className="ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              <X size={11} strokeWidth={2} />
              Retirer
            </button>
          )}
        </div>

        {/* Couleur */}
        <p className="text-xs font-semibold uppercase mb-2.5"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
          Couleur d'accentuation
        </p>
        <div className="flex flex-wrap gap-2.5 mb-5">
          {AVATAR_COLORS.map(({ id, value, label }) => {
            const isSelected = value === currentColor
            return (
              <button key={id} title={label} onClick={() => handleColorSelect(value)}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: value,
                  outline: isSelected ? `2px solid ${value}` : '2px solid transparent',
                  outlineOffset: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.1s, outline 0.1s',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  cursor: 'pointer',
                }}>
                {isSelected && <Check size={13} color="white" strokeWidth={3} />}
              </button>
            )
          })}
        </div>

        {/* Avatars illustrés */}
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
            Avatar illustré (optionnel)
          </p>
          <button onClick={refreshSeeds}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={11} strokeWidth={2} />
            Autres
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {seeds.map((seed) => {
            const isSelected = appUser?.avatarSeed === seed
            return (
              <button key={seed} onClick={() => handleSeedSelect(seed)}
                title={seed}
                style={{
                  borderRadius: '50%',
                  outline: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
                  outlineOffset: 2,
                  padding: 0,
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                  transition: 'transform 0.1s, outline 0.1s',
                  background: 'transparent',
                }}>
                <img src={dicebearUrl(seed)} alt={seed} width={36} height={36}
                  style={{ borderRadius: '50%', display: 'block' }} />
              </button>
            )
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
          Cliquer sur le même avatar pour le retirer.
        </p>
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
