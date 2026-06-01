import { useState, useMemo } from 'react'
import { Plus, Wrench, Zap, Hammer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { createMaintenance } from '@/services/maintenanceService'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useAuthStore, selectUid, selectPrenom, selectInitiales } from '@/stores/authStore'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Maintenance } from '@/types'
import type { LucideIcon } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  preventive: { label: 'Préventive',  icon: Wrench,         color: 'var(--color-accent)',   bg: 'var(--color-accent-light)'   },
  corrective: { label: 'Corrective',  icon: Zap,            color: 'var(--color-warning)',  bg: 'var(--color-warning-light)'  },
  panne:      { label: 'Panne',       icon: Wrench,         color: 'var(--color-danger)',   bg: 'var(--color-danger-light)'   },
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  planifiee:  { label: 'Planifiée',  bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  en_cours:   { label: 'En cours',   bg: 'var(--color-warning-light)', color: 'var(--color-warning)'        },
  realisee:   { label: 'Réalisée',   bg: 'var(--color-success-light)', color: 'var(--color-success)'        },
  abandonnee: { label: 'Abandonnée', bg: 'var(--color-danger-light)',  color: 'var(--color-danger)'         },
}

const STATUTS_FILTER = [
  { value: '',           label: 'Tous'       },
  { value: 'planifiee',  label: 'Planifiée'  },
  { value: 'en_cours',   label: 'En cours'   },
  { value: 'realisee',   label: 'Réalisée'   },
  { value: 'abandonnee', label: 'Abandonnée' },
]

const TYPES_FILTER = [
  { value: '',           label: 'Tous types'  },
  { value: 'preventive', label: 'Préventive'  },
  { value: 'corrective', label: 'Corrective'  },
  { value: 'panne',      label: 'Panne'       },
]

const STATUT_ORDER: Record<string, number> = { en_cours: 0, planifiee: 1, realisee: 2, abandonnee: 3 }

export default function MaintenancesPage() {
  useMaintenancesListener()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  const prenom = useAuthStore(selectPrenom)
  const initiales = useAuthStore(selectInitiales)
  const { maintenances, loading } = useMaintenancesStore()
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterAppareil, setFilterAppareil] = useState('')
  const [creating, setCreating] = useState(false)

  const technicienNom = [prenom, initiales].filter(Boolean).join(' ')

  const appareils = useMemo(() => {
    const s = new Set<string>()
    maintenances.forEach((m: Maintenance) => { if (m.equipementNom) s.add(m.equipementNom) })
    return Array.from(s).sort()
  }, [maintenances])

  const filtered = maintenances
    .filter((m: Maintenance) => {
      const matchStatut = !filterStatut || m.statut === filterStatut
      const matchType = !filterType || m.type === filterType
      const matchAppareil = !filterAppareil || m.equipementNom === filterAppareil
      return matchStatut && matchType && matchAppareil
    })
    .sort((a: Maintenance, b: Maintenance) => {
      const sa = STATUT_ORDER[a.statut] ?? 9
      const sb = STATUT_ORDER[b.statut] ?? 9
      if (sa !== sb) return sa - sb
      const da = a.datePrevue ?? a.dateRealisee ?? ''
      const db = b.datePrevue ?? b.dateRealisee ?? ''
      return db.localeCompare(da)
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
        <button type="button"
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
      <div className="flex flex-col gap-3 mb-5">
        {/* Pills statut */}
        <div className="flex gap-2 flex-wrap">
          {STATUTS_FILTER.map((f) => (
            <button type="button" key={f.value}
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
        </div>

        {/* Légende types */}
        <div className="flex gap-4 flex-wrap">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className="size-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg }}>
                  <Icon size={12} strokeWidth={2} color={cfg.color} />
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{cfg.label}</span>
              </div>
            )
          })}
        </div>

        {/* Selects */}
        <div className="flex gap-2">
          <select
            value={filterAppareil}
            onChange={(e) => setFilterAppareil(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          >
            <option value="">Tous appareils</option>
            {appareils.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          >
            {TYPES_FILTER.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <SkeletonList count={4} variant="card" />
      ) : maintenances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-accent-light)' }}>
            <Hammer size={28} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Aucune intervention</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Planifiez votre première intervention de maintenance.
            </p>
          </div>
          <button type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity"
            style={{ background: 'var(--color-accent)', color: 'white', opacity: creating ? 0.6 : 1 }}
          >
            <Plus size={16} />
            Nouvelle intervention
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Aucune intervention pour ces filtres.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((m: Maintenance) => {
            const typeCfg = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.corrective
            const statutCfg = STATUT_CONFIG[m.statut] ?? STATUT_CONFIG.planifiee
            const TypeIcon = typeCfg.icon
            const date = m.datePrevue
              ? new Date(m.datePrevue).toLocaleDateString('fr-FR')
              : m.dateRealisee
              ? new Date(m.dateRealisee).toLocaleDateString('fr-FR')
              : null

            return (
              <button type="button"
                key={m.id}
                onClick={() => navigate(`/maintenances/${m.id}`)}
                className="w-full text-left rounded-xl px-5 py-4 flex items-center gap-4 transition-colors"
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              >
                {/* Icône type */}
                <div className="size-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: typeCfg.bg }}>
                  <TypeIcon size={18} strokeWidth={1.8} color={typeCfg.color} />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {m.equipementNom || <span style={{ color: 'var(--color-text-tertiary)' }}>Équipement non défini</span>}
                  </p>
                  {m.description && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {m.description}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    {[typeCfg.label, date].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Badge statut */}
                <div className="shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: statutCfg.bg, color: statutCfg.color }}>
                    {statutCfg.label}
                  </span>
                </div>
              </button>
            )
          })}
          <button type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium transition-colors"
            style={{
              border: '1.5px dashed var(--color-border)',
              color: 'var(--color-text-tertiary)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-tertiary)'
            }}
          >
            <Plus size={15} />
            Nouvelle intervention
          </button>
        </div>
      )}
    </div>
  )
}
