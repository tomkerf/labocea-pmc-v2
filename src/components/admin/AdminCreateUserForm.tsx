import { useState } from 'react'
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth'
import { Check, Loader2, UserPlus, Mail, Lock, User, Hash } from 'lucide-react'
import { authSecondary, dbSecondary } from '@/lib/firebase'
import { createUserDocument } from '@/services/userService'
import type { UserRole } from '@/types'

const AVATAR_COLORS = [
  '#0071E3', '#34C759', '#FF9F0A', '#FF3B30',
  '#AF52DE', '#5AC8FA', '#FF6B35', '#30B0C7',
]

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

export function AdminCreateUserForm() {
  const [prenom,    setPrenom]    = useState('')
  const [nom,       setNom]       = useState('')
  const [initiales, setInitiales] = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [role,      setRole]      = useState<UserRole>('technicien')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleNameChange = (newPrenom: string, newNom: string) => {
    const auto = (newPrenom.charAt(0) + newNom.slice(0, 2)).toUpperCase()
    setInitiales(auto)
  }

  const reset = () => {
    setPrenom(''); setNom(''); setInitiales('')
    setEmail(''); setPassword(''); setRole('technicien')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prenom || !nom || !initiales || !email || !password) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cred = await createUserWithEmailAndPassword(authSecondary, email, password)
      const uid  = cred.user.uid

      try {
        await createUserDocument(uid, {
          uid, prenom, nom,
          initiales: initiales.toUpperCase(),
          email, role,
          avatarColor: randomColor(),
        }, dbSecondary)
      } catch (firestoreErr) {
        await deleteUser(cred.user).catch(() => {})
        await authSecondary.signOut().catch(() => {})
        throw firestoreErr
      }

      await authSecondary.signOut()

      setSuccess(true)
      reset()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      if (msg.includes('email-already-in-use')) {
        setError('Cette adresse email est déjà utilisée.')
      } else if (msg.includes('invalid-email')) {
        setError('Adresse email invalide.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Créer un compte
      </h2>

      <form onSubmit={handleSubmit}
        className="rounded-xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acuf-prenom" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Prénom</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
              <input id="acuf-prenom" type="text" value={prenom}
                onChange={e => { setPrenom(e.target.value); handleNameChange(e.target.value, nom) }}
                placeholder="Thomas"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acuf-nom" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Nom</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
              <input id="acuf-nom" type="text" value={nom}
                onChange={e => { setNom(e.target.value); handleNameChange(prenom, e.target.value) }}
                placeholder="Kerfendal"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acuf-initiales" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Initiales</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
              <input id="acuf-initiales" type="text" value={initiales}
                onChange={e => setInitiales(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="THK" maxLength={4}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg font-mono"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acuf-role" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Rôle</label>
            <select id="acuf-role" value={role} onChange={e => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              <option value="technicien">Technicien</option>
              <option value="charge_mission">Chargé de mission</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="acuf-email" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
            <input id="acuf-email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="prenom.nom@labocea.fr"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="acuf-password" className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Mot de passe provisoire
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
            <input id="acuf-password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            La personne pourra changer son mot de passe depuis "Mon compte".
          </p>
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Check size={15} />
            Compte créé avec succès.
          </div>
        )}

        <button type="submit" disabled={loading}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: 'white', opacity: loading ? 0.7 : 1 }}>
          {loading ? (
            <><Loader2 size={15} className="animate-spin" /> Création en cours…</>
          ) : (
            <><UserPlus size={15} /> Créer le compte</>
          )}
        </button>
      </form>
    </section>
  )
}
