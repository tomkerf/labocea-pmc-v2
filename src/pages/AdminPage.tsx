import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth'

import { ShieldAlert, UserPlus, Check, Loader2, ChevronLeft, ChevronRight, Mail, Lock, User, Hash, BarChart2, Clock } from 'lucide-react'
import { authSecondary, dbSecondary } from '@/lib/firebase'
import { createUserDocument } from '@/services/userService'
import { useAuthStore, selectRole } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useMissionsStore } from '@/stores/missionsStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useClientsListener } from '@/hooks/useClients'
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

// ── Helpers charge ────────────────────────────────────────────

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function formatH(h: number): string {
  if (h === 0) return '—'
  const hh  = Math.floor(h)
  const min = Math.round((h - hh) * 60)
  if (min === 0) return `${hh}h`
  if (hh === 0)  return `${min}min`
  return `${hh}h${String(min).padStart(2, '0')}`
}

function startOfWeekMon(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()                        // 0=dim
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  r.setHours(0, 0, 0, 0)
  return r
}

// ── Composant principal ───────────────────────────────────────

export default function AdminPage() {
  const navigate  = useNavigate()
  const role      = useAuthStore(selectRole)
  const { users } = useUsersStore()
  useUsersListener()
  useClientsListener()

  // Dédoublonnage géré dans le store — users est déjà propre
  const uniqueUsers = users

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
        {/* Section : charge équipe */}
        <ChargeEquipe />

        {/* Section : créer un compte */}
        <CreateUserForm />

        {/* Section : utilisateurs existants */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Comptes existants ({uniqueUsers.length})
          </h2>
          <div className="flex flex-col rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
            {uniqueUsers.length === 0 && (
              <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                Aucun utilisateur trouvé.
              </p>
            )}
            {uniqueUsers.map((u, i) => (
              <div key={u.uid}
                className="flex items-center gap-4 px-5 py-3.5"
                style={{ borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <UserAvatar initiales={u.initiales} color={u.avatarColor} avatarSeed={u.avatarSeed} size={36} fontSize={13} />
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

// ── Charge équipe ─────────────────────────────────────────────

function ChargeEquipe() {
  const { clients }                       = useMissionsStore()
  const [viewMode, setViewMode]           = useState<'semaine' | 'mois'>('mois')
  const [refDate,  setRefDate]            = useState(() => new Date())
  const currentYear                       = new Date().getFullYear()

  // Bornes de la période sélectionnée
  const { start, end, label } = useMemo(() => {
    if (viewMode === 'mois') {
      const y = refDate.getFullYear(), m = refDate.getMonth()
      const s = new Date(y, m, 1)
      const e = new Date(y, m + 1, 0)
      return { start: s, end: e, label: `${MOIS_COURT[m]} ${y}` }
    }
    const s = startOfWeekMon(refDate)
    const e = new Date(s); e.setDate(e.getDate() + 6)
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
    return { start: s, end: e, label: `${fmt(s)} – ${fmt(e)}/${e.getFullYear()}` }
  }, [viewMode, refDate])

  const navigate_ = (dir: -1 | 1) => {
    const d = new Date(refDate)
    if (viewMode === 'mois') d.setMonth(d.getMonth() + dir)
    else                     d.setDate(d.getDate() + dir * 7)
    setRefDate(d)
  }

  // Calcul de la charge par technicien — planifié vs réalisé
  type Counts = { ponctuel: number; piezo: number; bilan: number }
  type Row = {
    tech: string
    done:    Counts   // status === 'done'
    planned: Counts   // status planifié / en retard
    doneH:    number
    plannedH: number
    totalH:   number
  }

  const rows: Row[] = useMemo(() => {
    const map: Record<string, { done: Counts; planned: Counts }> = {}

    const add = (tech: string, nature: string, methode: string, isDone: boolean) => {
      if (!map[tech]) map[tech] = {
        done:    { ponctuel: 0, piezo: 0, bilan: 0 },
        planned: { ponctuel: 0, piezo: 0, bilan: 0 },
      }
      const bucket = isDone ? map[tech].done : map[tech].planned
      if      (methode === 'Automatique') bucket.bilan++
      else if (nature  === 'Souterraine') bucket.piezo++
      else                                bucket.ponctuel++
    }

    const countH = (c: Counts) => c.ponctuel * 0.25 + c.piezo * 1 + c.bilan * 2

    clients.forEach(client => {
      client.plans.forEach(plan => {
        if (plan.separator) return
        plan.samplings.forEach(s => {
          if (s.status === 'non_effectue') return   // ignoré dans tous les cas

          const isDone = s.status === 'done'

          // Positionnement dans la période
          if (viewMode === 'semaine') {
            // Pour les réalisés : utiliser doneDate si disponible
            const dateStr = isDone && s.doneDate
              ? s.doneDate
              : s.plannedDay
                ? `${currentYear}-${String(s.plannedMonth + 1).padStart(2,'0')}-${String(s.plannedDay).padStart(2,'0')}`
                : null
            if (!dateStr) return
            const date = new Date(dateStr + 'T12:00:00')
            if (date < start || date > end) return
          } else {
            // Mois : réalisés → sur doneDate, planifiés → sur plannedMonth
            if (isDone) {
              if (!s.doneDate) return
              const d = new Date(s.doneDate + 'T12:00:00')
              if (d < start || d > end) return
            } else {
              if (s.plannedMonth !== start.getMonth()) return
            }
          }

          const tech = s.assignedTo || client.preleveur || '—'
          add(tech, plan.nature, plan.methode, isDone)
        })
      })
    })

    return Object.entries(map)
      .map(([tech, { done, planned }]) => {
        const doneH    = countH(done)
        const plannedH = countH(planned)
        return { tech, done, planned, doneH, plannedH, totalH: doneH + plannedH }
      })
      .sort((a, b) => b.totalH - a.totalH)
  }, [clients, start, end, currentYear, viewMode])

  const maxH = rows.length > 0 ? Math.max(...rows.map(r => r.totalH)) : 1

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Charge équipe
      </h2>

      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>

          {/* Onglets Semaine / Mois */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg-tertiary)' }}>
            {(['semaine', 'mois'] as const).map(v => (
              <button key={v}
                onClick={() => { setViewMode(v); setRefDate(new Date()) }}
                className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: viewMode === v ? 'var(--color-bg-secondary)' : 'transparent',
                  color:      viewMode === v ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  boxShadow:  viewMode === v ? 'var(--shadow-card)' : 'none',
                }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigateur période */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate_(-1)}
              className="p-1 rounded-md"
              style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}>
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium w-32 text-center"
              style={{ color: 'var(--color-text-primary)' }}>
              {label}
            </span>
            <button onClick={() => navigate_(1)}
              className="p-1 rounded-md"
              style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Légende durées */}
        <div className="flex items-center gap-4 px-5 py-2.5"
          style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-primary)' }}>
          <div className="flex items-center gap-1.5">
            <Clock size={11} style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
              Ponctuel = 15 min · Piézomètre = 1h · Bilan 24h = 2h
            </span>
          </div>
        </div>

        {/* Tableau */}
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <BarChart2 size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Aucune intervention planifiée sur cette période.
            </p>
          </div>
        ) : (
          <>
            {/* En-tête colonnes */}
            <div className="grid px-5 py-2"
              style={{
                gridTemplateColumns: '90px 1fr 72px 72px 64px',
                borderBottom: '1px solid var(--color-border-subtle)',
              }}>
              {[
                { label: 'Technicien', align: 'left' },
                { label: '',           align: 'left' },
                { label: 'Réalisé',    align: 'center' },
                { label: 'À faire',    align: 'center' },
                { label: 'Total',      align: 'center' },
              ].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold uppercase"
                  style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textAlign: h.align as 'left' | 'center' }}>
                  {h.label}
                </span>
              ))}
            </div>

            {/* Lignes */}
            {rows.map((row, i) => {
              const donePct    = maxH > 0 ? row.doneH    / maxH : 0
              const plannedPct = maxH > 0 ? row.plannedH / maxH : 0
              // Couleur de la portion "à faire" selon charge restante vs max
              const remainColor = plannedPct > 0.6
                ? 'var(--color-danger)'
                : plannedPct > 0.3
                  ? 'var(--color-warning)'
                  : 'var(--color-accent)'

              return (
                <div key={row.tech}
                  className="grid items-center px-5 py-3"
                  style={{
                    gridTemplateColumns: '90px 1fr 72px 72px 64px',
                    borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                  }}>
                  {/* Initiales */}
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {row.tech}
                  </span>

                  {/* Barre bicolore : vert = réalisé, couleur = à faire */}
                  <div className="h-2 rounded-full mx-2 overflow-hidden flex"
                    style={{ background: 'var(--color-bg-tertiary)' }}>
                    {row.doneH > 0 && (
                      <div className="h-full shrink-0"
                        style={{ width: `${Math.round(donePct * 100)}%`, background: 'var(--color-success)' }} />
                    )}
                    {row.plannedH > 0 && (
                      <div className="h-full shrink-0"
                        style={{ width: `${Math.round(plannedPct * 100)}%`, background: remainColor, opacity: 0.75 }} />
                    )}
                  </div>

                  {/* Réalisé */}
                  <span className="text-sm font-medium text-center"
                    style={{ color: row.doneH > 0 ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                    {row.doneH > 0 ? formatH(row.doneH) : '—'}
                  </span>

                  {/* À faire */}
                  <span className="text-sm font-medium text-center"
                    style={{ color: row.plannedH > 0 ? remainColor : 'var(--color-text-tertiary)' }}>
                    {row.plannedH > 0 ? formatH(row.plannedH) : '—'}
                  </span>

                  {/* Total */}
                  <span className="text-sm font-semibold text-center"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {formatH(row.totalH)}
                  </span>
                </div>
              )
            })}

            {/* Pied — total équipe */}
            {(() => {
              const totDone    = rows.reduce((s, r) => s + r.doneH,    0)
              const totPlanned = rows.reduce((s, r) => s + r.plannedH, 0)
              return (
                <div className="grid items-center px-5 py-3"
                  style={{
                    gridTemplateColumns: '90px 1fr 72px 72px 64px',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-bg-primary)',
                  }}>
                  <span className="text-xs font-semibold uppercase"
                    style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
                    Total équipe
                  </span>
                  <span />
                  <span className="text-xs font-semibold text-center"
                    style={{ color: totDone > 0 ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                    {totDone > 0 ? formatH(totDone) : '—'}
                  </span>
                  <span className="text-xs font-semibold text-center"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {totPlanned > 0 ? formatH(totPlanned) : '—'}
                  </span>
                  <span className="text-xs font-semibold text-center"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {formatH(totDone + totPlanned)}
                  </span>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </section>
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

      try {
        await createUserDocument(uid, {
          uid, prenom, nom,
          initiales: initiales.toUpperCase(),
          email, role,
          avatarColor: randomColor(),
        }, dbSecondary)
      } catch (firestoreErr) {
        // Rollback : supprimer le compte Auth créé pour éviter un utilisateur orphelin
        await deleteUser(cred.user).catch(() => {})
        await authSecondary.signOut().catch(() => {})
        throw firestoreErr
      }

      // Déconnecter l'instance secondaire après l'écriture
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
