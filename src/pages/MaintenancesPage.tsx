import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMaintenancesListener, createMaintenance } from '@/hooks/useMaintenances'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useAuthStore } from '@/stores/authStore'
import type { Maintenance } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  preventive: 'Préventive',
  corrective: 'Corrective',
  panne: 'Panne',
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  planifiee:    { label: 'Planifiée',   bg: 'var(--color-bg-tertiary)',    color: 'var(--color-text-secondary)' },
  en_cours:     { label: 'En cours',    bg: 'var(--color-warning-light)',  color: 'var(--color-warning)'        },
  realisee:     { label: 'Réalisée',    bg: 'var(--color-success-light)',  color: 'var(--color-success)'        },
  abandonnee:   { label: 'Abandonnée', bg: 'var(--color-danger-light)',   color: 'var(--color-danger)'         },
}

const STATUTS_FILTER = [
  { value: '', label: 'Tous' },
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'realisee', label: 'Réalisée' },
  { value: 'abandonnee', label: 'Abandonnée' },
]

const TYPES_FILTER = [
  { value: '', label: 'Tous types' },
  { value: 'preventive', label: 'Préventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'panne', label: 'Panne' },
]

export default function MaintenancesPage() {
  useMaintenancesListener()
  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.uid())
  const prenom = useAuthStore((s) => s.prenom())
  const initiales = useAuthStore((s) => s.initiales())
  const { maintenances, loading } = useMaintenancesStore()
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [creating, setCreating] = useState(false)

  const technicienNom = [prenom, initiales].filter(Boolean).join(' ')

  const filtered = maintenances.filter((m: Maintenance) => {
    const matchStatut = !filterStatut || m.statut === filterStatut
    const matchType = !filterType || m.type === filterType
    return matchStatut && matchType
  })

  async function handleCreate() {
    if (!uid || creating) return
    setCreating(true)
    try {
      const id = await createMaintenance(uid, technicienNom)
      navigate(`/maintenances/${id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Maintenances</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {maintenances.length} intervention{maintenances.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg"
          style={{ background: 'var(--color-accent)', color: 'white', opacity: creating ? 0.6 : 1 }}
        >
          <Plus size={16} />
          Nouvelle intervention
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUTS_FILTER.map((f) => (
          <button key={f.value}
            onClick={() => setFilterStatut(f.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: filterStatut === f.value ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
              color: filterStatut === f.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {f.label}
          </button>
        ))}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
        >
          {TYPES_FILTER.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {maintenances.length === 0
              ? 'Aucune intervention — cliquez sur "Nouvelle intervention" pour commencer.'
              : 'Aucune intervention pour ces filtres.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>

          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5"
            style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
            {['Équipement', 'Type', 'Date prévue', 'Statut'].map((h) => (
              <span key={h} className="text-xs font-semibold uppercase"
                style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {/* Lignes */}
          {filtered.map((m: Maintenance, i: number) => {
            const statutCfg = STATUT_CONFIG[m.statut] ?? STATUT_CONFIG.planifiee
            return (
              <button key={m.id}
                onClick={() => navigate(`/maintenances/${m.id}`)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 text-left transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {m.equipementNom || <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {m.description || '—'}
                  </p>
                </div>
                <span className="text-xs self-center" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {TYPE_LABELS[m.type] ?? m.type}
                </span>
                <span className="text-xs self-center" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {m.datePrevue ? new Date(m.datePrevue).toLocaleDateString('fr-FR') : '—'}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium self-center"
                  style={{ background: statutCfg.bg, color: statutCfg.color, whiteSpace: 'nowrap' }}>
                  {statutCfg.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
