import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { ShieldAlert, UserPlus, Check, Loader2, ChevronLeft, Mail, Lock, User, Hash } from 'lucide-react'
import { authSecondary, db } from '@/lib/firebase'
import { useAuthStore, selectRole } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useUsersListener } from '@/hooks/useUsers'
import type { UserRole } from '@/types'
import UserAvatar from '@/components/ui/UserAvatar'

// ── Helpers ───────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  technicien:      'Technicien',
  charge_mission:  'Chargé de mission',
  admin:           'Admin',
}

const AVATAR_COLORS = [
  '#0071E3', '#34C759', '#FF9F0A', '#FF3B30',
  '#AF52DE', '#5AC8FA', '#FF6B35', '#30B0C7',
]

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

// ── Composant principal ───────────────────────────────────────

export default function AdminPage() {
  const navigate  = useNavigate()
  const role      = useAuthStore(selectRole)
  const { users } = useUsersStore()
  useUsersListener()

  // Redirection si pas admin
  if (role && role !== 'admin') {
    navigate('/', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-4"
        style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
        <button onClick={() => navigate(-1)}
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
        {/* Section : créer un compte */}
        <CreateUserForm />

        {/* Section : utilisateurs existants */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
      </div>
    </div>
  )
}

// ── Formulaire de création ────────────────────────────────────

function CreateUserForm() {
  const [prenom,    setPrenom]    = useState('')
  const [nom,       setNom]       = useState('')
  const [initiales, setInitiales] = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [role,      setRole]      = useState<UserRole>('technicien')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Auto-génère les initiales à partir du prénom + nom
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
      // Créer le compte Firebase Auth via l'instance secondaire
      // (ne déconnecte pas l'admin courant)
      const cred = await createUserWithEmailAndPassword(authSecondary, email, password)
      const uid  = cred.user.uid

      // Déconnecter l'instance secondaire immédiatement
      await authSecondary.signOut()

      // Créer le document Firestore users/{uid}
      await setDoc(doc(db, 'users', uid), {
        uid,
        prenom,
        nom,
        initiales: initiales.toUpperCase(),
        email,
        role,
        avatarColor: randomColor(),
        createdAt:   Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      })

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
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Créer un compte
      </h2>

      <form onSubmit={handleSubmit}
        className="rounded-xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>

        {/* Prénom + Nom */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Prénom</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type="text"
                value={prenom}
                onChange={e => { setPrenom(e.target.value); handleNameChange(e.target.value, nom) }}
                placeholder="Thomas"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Nom</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type="text"
                value={nom}
                onChange={e => { setNom(e.target.value); handleNameChange(prenom, e.target.value) }}
                placeholder="Kerfendal"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Initiales + Rôle */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Initiales</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type="text"
                value={initiales}
                onChange={e => setInitiales(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="THK"
                maxLength={4}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg font-mono"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Rôle</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              <option value="technicien">Technicien</option>
              <option value="charge_mission">Chargé de mission</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="prenom.nom@labocea.fr"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Mot de passe provisoire
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              type="text"
              value={password}
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

        {/* Erreur */}
        {error && (
          <p className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        {/* Succès */}
        {success && (
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Check size={15} />
            Compte créé avec succès.
          </div>
        )}

        {/* Bouton */}
        <button
          type="submit"
          disabled={loading}
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
