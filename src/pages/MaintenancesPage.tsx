import { useState, useMemo, useReducer } from 'react'
import { Plus, Wrench, Zap, Hammer, AlignJustify, LayoutList, ChevronLeft } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { createMaintenance } from '@/services/maintenanceService'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useAuthStore, selectUid, selectPrenom, selectInitiales } from '@/stores/authStore'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Maintenance } from '@/types'
import type { LucideIcon } from 'lucide-react'
import { COLORS } from '@/lib/constants'


const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  preventive: { label: 'Préventive',  icon: Wrench,         color: COLORS.ACCENT,   bg: 'var(--color-accent-light)'   },
  corrective: { label: 'Corrective',  icon: Zap,            color: COLORS.WARNING,  bg: 'var(--color-warning-light)'  },
  panne:      { label: 'Panne',       icon: Wrench,         color: COLORS.DANGER,   bg: 'var(--color-danger-light)'   },
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  planifiee:  { label: 'Planifiée',  bg: COLORS.BG_TERTIARY,   color: COLORS.TEXT_SECONDARY },
  en_cours:   { label: 'En cours',   bg: 'var(--color-warning-light)', color: COLORS.WARNING        },
  realisee:   { label: 'Réalisée',   bg: 'var(--color-success-light)', color: COLORS.SUCCESS        },
  abandonnee: { label: 'Abandonnée', bg: 'var(--color-danger-light)',  color: COLORS.DANGER         },
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

type Filters = { statut: string; type: string; appareil: string }
type FilterAction = { name: keyof Filters; value: string }
function filtersReducer(state: Filters, action: FilterAction): Filters {
  return { ...state, [action.name]: action.value }
}
const INITIAL_FILTERS: Filters = { statut: '', type: '', appareil: '' }

export default function MaintenancesPage() {
  useMaintenancesListener()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  const prenom = useAuthStore(selectPrenom)
  const initiales = useAuthStore(selectInitiales)
  const { maintenances, loading } = useMaintenancesStore()
  const [filters, dispatchFilter] = useReducer(filtersReducer, INITIAL_FILTERS)
  const { statut: filterStatut, type: filterType, appareil: filterAppareil } = filters
  const [creating, setCreating] = useState(false)
  const [compact, setCompact] = useState(false)

  function clearFilters() { dispatchFilter({ name: 'statut', value: '' }); dispatchFilter({ name: 'type', value: '' }); dispatchFilter({ name: 'appareil', value: '' }) }

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
      {/* Bouton retour mobile */}
      <div className="md:hidden mb-4">
        <Link to="/plus" className="inline-flex items-center gap-1 font-semibold text-sm transition-opacity active:opacity-80" style={{ color: COLORS.ACCENT }}>
          <ChevronLeft size={16} />
          Plus
        </Link>
      </div>

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Maintenances</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {filtered.length !== maintenances.length
              ? `${filtered.length} / ${maintenances.length} intervention${maintenances.length !== 1 ? 's' : ''}`
              : `${maintenances.length} intervention${maintenances.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button type="button"
            onClick={() => setCompact((c) => !c)}
            className="flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer"
            title={compact ? 'Vue développée' : 'Vue compacte'}
            style={{
              background: compact ? 'var(--color-accent-light)' : COLORS.BG_SECONDARY,
              border: '1px solid var(--color-border-subtle)',
              color: compact ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
            }}
          >
            {compact ? <LayoutList size={16} /> : <AlignJustify size={16} />}
          </button>
          <button type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg flex-1 sm:flex-none cursor-pointer transition-transform active:scale-[0.98]"
            style={{
              background: COLORS.ACCENT,
              color: 'white',
              boxShadow: '0 2px 8px rgba(52, 82, 122, 0.25)',
              opacity: creating ? 0.6 : 1,
            }}
          >
            <Plus size={16} />
            Nouvelle intervention
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Pills statut */}
        <div className="flex gap-2 flex-wrap">
          {STATUTS_FILTER.map((f) => {
            const isActive = filterStatut === f.value
            let activeBg = 'var(--color-accent-light)'
            let activeColor: string = COLORS.ACCENT
            let activeBorder = '1px solid rgba(52, 82, 122, 0.2)'

            if (f.value === 'planifiee') {
              activeBg = 'var(--color-bg-tertiary)'
              activeColor = COLORS.TEXT_PRIMARY
              activeBorder = '1px solid var(--color-border-subtle)'
            } else if (f.value === 'en_cours') {
              activeBg = 'var(--color-warning-light)'
              activeColor = COLORS.WARNING
              activeBorder = '1px solid rgba(217, 119, 6, 0.2)'
            } else if (f.value === 'realisee') {
              activeBg = 'var(--color-success-light)'
              activeColor = COLORS.SUCCESS
              activeBorder = '1px solid rgba(31, 157, 77, 0.2)'
            } else if (f.value === 'abandonnee') {
              activeBg = 'var(--color-danger-light)'
              activeColor = COLORS.DANGER
              activeBorder = '1px solid rgba(229, 62, 62, 0.2)'
            }

            return (
              <button type="button" key={f.value}
                onClick={() => dispatchFilter({ name: 'statut', value: f.value })}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95"
                style={{
                  background: isActive ? activeBg : COLORS.BG_SECONDARY,
                  color: isActive ? activeColor : COLORS.TEXT_SECONDARY,
                  border: isActive ? activeBorder : '1px solid var(--color-border-subtle)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.02)' : 'none',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Selects */}
        <div className="flex gap-2">
          <select
            value={filterAppareil}
            onChange={(e) => dispatchFilter({ name: 'appareil', value: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
          >
            <option value="">Tous appareils</option>
            {appareils.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => dispatchFilter({ name: 'type', value: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
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
            <Hammer size={28} strokeWidth={1.5} style={{ color: COLORS.ACCENT }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Aucune intervention</p>
            <p className="text-sm mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Planifiez votre première intervention de maintenance.
            </p>
          </div>
          <button type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity"
            style={{ background: COLORS.ACCENT, color: 'white', opacity: creating ? 0.6 : 1 }}
          >
            <Plus size={16} />
            Nouvelle intervention
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>Aucune intervention pour ces filtres.</p>
          <button type="button" onClick={clearFilters}
            className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
            Effacer les filtres
          </button>
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
                className={`w-full text-left rounded-xl px-5 flex items-center gap-4 transition-colors relative cursor-pointer active:opacity-90 ${compact ? 'py-2' : 'py-4'}`}
                style={{
                  background: COLORS.BG_SECONDARY,
                  border: '1px solid var(--color-border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
                onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.BG_SECONDARY)}
              >
                {/* Icône type */}
                {!compact && (
                  <div className="size-11 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: typeCfg.bg }}>
                    <TypeIcon size={18} strokeWidth={1.8} color={typeCfg.color} />
                  </div>
                )}
                {compact && (
                  <div className="size-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: typeCfg.bg }}>
                    <TypeIcon size={11} strokeWidth={2} color={typeCfg.color} />
                  </div>
                )}

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                    {m.equipementNom || <span style={{ color: 'var(--color-text-tertiary)' }} className="font-sans">Équipement non défini</span>}
                  </p>
                  {!compact && m.description && (
                    <p className="text-xs truncate mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                      {m.description}
                    </p>
                  )}
                  {!compact && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      {[typeCfg.label, date].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Badge statut */}
                <div className="shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] inline-flex items-center gap-1.5"
                    style={{ color: statutCfg.color }}>
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: statutCfg.color }} />
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
              e.currentTarget.style.borderColor = COLORS.ACCENT
              e.currentTarget.style.color = COLORS.ACCENT
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = COLORS.BORDER
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
