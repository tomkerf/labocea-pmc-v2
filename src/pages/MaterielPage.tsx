import { useState, useReducer } from 'react'
import { Plus, Search, Package, FileDown, AlignJustify, LayoutList, SlidersHorizontal, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useUsersListener } from '@/hooks/useUsers'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { createEquipement } from '@/services/equipementService'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import EquipementCard from '@/components/materiel/EquipementCard'
import { exportInventairePDF } from '@/components/materiel/inventaireExport'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Equipement } from '@/types'
import { COLORS } from '@/lib/constants'



const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'preleveur',    label: 'Préleveurs'     },
  { value: 'debitmetre',   label: 'Débitmètres'    },
  { value: 'multiparametre', label: 'Multiparamètres' },
  { value: 'glaciere',     label: 'Glacières'      },
  { value: 'enregistreur', label: 'Enregistreurs'  },
  { value: 'thermometre',  label: 'Thermomètres'   },
  { value: 'reglet',       label: 'Réglets'        },
  { value: 'eprouvette',   label: 'Éprouvettes'    },
  { value: 'flacon',       label: 'Flacons'        },
  { value: 'pompe_pz',     label: 'Pompes PZ'      },
  { value: 'chronometre',  label: 'Chronomètres'   },
  { value: 'manchon_deversoir', label: 'Manchons déversoirs' },
]

const ETATS = [
  { value: '', label: 'Tous états' },
  { value: 'operationnel', label: 'Opérationnel' },
  { value: 'en_maintenance', label: 'En maintenance' },
  { value: 'hors_service', label: 'Hors service' },
  { value: 'prete', label: 'Prêté' },
]

/** Correspondance anciens noms V1 → nouveaux noms V2 */
const CATEGORIE_ALIAS: Record<string, string> = {
  preleveur_auto:  'preleveur',
  turbidimetre:    'multiparametre',
  ph_metre:        'multiparametre',
  conductimetre:   'multiparametre',
  autre:           'autre',
}

function normalizeCategorie(cat: string): string {
  return CATEGORIE_ALIAS[cat] ?? cat
}

interface FiltersState {
  search: string
  filterCategorie: string
  filterEtat: string
  filterSite: string
  filterTechnicien: string
  filterMateriau: string
  filterMarque: string
}

type FiltersAction =
  | { type: 'setFilter'; name: keyof FiltersState; value: string }
  | { type: 'reset' }

const initialFilters: FiltersState = {
  search: '',
  filterCategorie: '',
  filterEtat: '',
  filterSite: '',
  filterTechnicien: '',
  filterMateriau: '',
  filterMarque: '',
}

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'setFilter':
      return { ...state, [action.name]: action.value }
    case 'reset':
      return initialFilters
    default:
      return state
  }
}

export default function MaterielPage() {
  useEquipementsListener()
  useUsersListener()
  useVerificationsListener()
  useMaintenancesListener()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  const { equipements, loading } = useEquipementsStore()

  const [filters, dispatch] = useReducer(filtersReducer, initialFilters)
  const { search, filterCategorie, filterEtat, filterSite, filterTechnicien, filterMateriau, filterMarque } = filters

  const users = useUsersStore(s => s.users)
  const techniciens = users.filter(u => u.role !== 'charge_mission')

  const [creating, setCreating] = useState(false)
  const [compact, setCompact] = useState(false)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  const isFlacon = filterCategorie === 'flacon'

  const activeChips = ([
    filterCategorie && { key: 'filterCategorie' as const, label: CATEGORIES.find(c => c.value === filterCategorie)?.label ?? filterCategorie },
    filterEtat      && { key: 'filterEtat'      as const, label: ETATS.find(e => e.value === filterEtat)?.label ?? filterEtat                 },
    filterSite      && { key: 'filterSite'      as const, label: filterSite === 'quimper' ? 'Quimper' : 'Brest'                              },
    filterTechnicien && { key: 'filterTechnicien' as const, label: techniciens.find(t => t.initiales === filterTechnicien)?.prenom ?? filterTechnicien },
    filterMateriau  && { key: 'filterMateriau'  as const, label: filterMateriau === 'plastique' ? 'Plastique' : 'Verre'                      },
    filterMarque    && { key: 'filterMarque'    as const, label: filterMarque                                                                 },
  ].filter(Boolean) as { key: keyof FiltersState; label: string }[])

  const marquesFlacon = Array.from(
    new Set(
      equipements
        .flatMap((e: Equipement) => normalizeCategorie(e.categorie) === 'flacon' && e.marque ? [e.marque] : [])
    )
  ).sort()

  const filtered = equipements.filter((e: Equipement) => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.nom.toLowerCase().includes(q) || e.marque.toLowerCase().includes(q) || e.modele.toLowerCase().includes(q) || e.numSerie.toLowerCase().includes(q)
    const matchCategorie = !filterCategorie || normalizeCategorie(e.categorie) === filterCategorie
    const matchEtat = !filterEtat || e.etat === filterEtat
    const matchSite = !filterSite || e.site === filterSite
    const matchTechnicien = !filterTechnicien || e.technicien === filterTechnicien
    const matchMateriau = !isFlacon || !filterMateriau || e.materiau === filterMateriau
    const matchMarque = !isFlacon || !filterMarque || e.marque === filterMarque
    return matchSearch && matchCategorie && matchEtat && matchSite && matchTechnicien && matchMateriau && matchMarque
  })

  function handleExport() {
    exportInventairePDF(filtered, {
      categorie: filterCategorie || undefined,
      etat: filterEtat || undefined,
      site: filterSite || undefined,
      technicien: filterTechnicien || undefined,
      search: search || undefined,
    })
  }

  async function handleCreate() {
    if (!uid || creating) return
    setCreating(true)
    try {
      const id = await createEquipement(uid)
      navigate(`/materiel/${id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Matériel</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_PRIMARY }}>
            {filtered.length !== equipements.length
              ? `${filtered.length} / ${equipements.length} équipements`
              : `${equipements.length} équipement${equipements.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button type="button"
            onClick={() => setCompact((c) => !c)}
            className="flex items-center justify-center p-2 rounded-lg transition-colors"
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
            onClick={handleExport}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border transition-all active:scale-[0.98] flex-1 sm:flex-none cursor-pointer"
            style={{ background: COLORS.BG_SECONDARY, borderColor: 'var(--color-border)', color: COLORS.TEXT_PRIMARY }}
          >
            <FileDown size={16} />
            Exporter
          </button>
          <button type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-all active:scale-[0.98] flex-1 sm:flex-none cursor-pointer"
            style={{
              background: COLORS.ACCENT,
              color: 'white',
              boxShadow: '0 2px 8px rgba(52, 82, 122, 0.25)',
              opacity: creating ? 0.6 : 1
            }}
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-2.5 mb-5">
        {/* Barre search + bouton filtres */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              aria-label="Rechercher un équipement"
              value={search}
              onChange={(e) => dispatch({ type: 'setFilter', name: 'search', value: e.target.value })}
              placeholder="Rechercher un équipement…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
              style={{
                background: COLORS.BG_SECONDARY,
                border: '1px solid var(--color-border-subtle)',
                color: COLORS.TEXT_PRIMARY,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterPanelOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium shrink-0 transition-colors"
            style={{
              background: activeChips.length > 0 ? 'var(--color-accent-light)' : COLORS.BG_SECONDARY,
              border: '1px solid var(--color-border-subtle)',
              color: activeChips.length > 0 ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
            }}
          >
            <SlidersHorizontal size={15} />
            <span>Filtres</span>
            {activeChips.length > 0 && (
              <span className="ml-0.5 size-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: COLORS.ACCENT, color: 'white' }}>
                {activeChips.length}
              </span>
            )}
          </button>
        </div>

        {/* Chips filtres actifs */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => dispatch({ type: 'setFilter', name: key, value: '' })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}
              >
                {label}
                <X size={11} strokeWidth={2.5} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => dispatch({ type: 'reset' })}
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Panneau filtres (collapsible) */}
        {filterPanelOpen && (
          <div className="flex flex-col gap-2 p-3 rounded-xl"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <div className="flex gap-2">
              <select
                value={filterCategorie}
                onChange={(e) => {
                  dispatch({ type: 'setFilter', name: 'filterCategorie', value: e.target.value })
                  dispatch({ type: 'setFilter', name: 'filterMateriau', value: '' })
                  dispatch({ type: 'setFilter', name: 'filterMarque', value: '' })
                }}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select
                value={filterEtat}
                onChange={(e) => dispatch({ type: 'setFilter', name: 'filterEtat', value: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
              >
                {ETATS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={filterSite}
                onChange={(e) => dispatch({ type: 'setFilter', name: 'filterSite', value: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
              >
                <option value="">Tous sites</option>
                <option value="quimper">Quimper</option>
                <option value="brest">Brest</option>
              </select>
              <select
                value={filterTechnicien}
                onChange={(e) => dispatch({ type: 'setFilter', name: 'filterTechnicien', value: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
              >
                <option value="">Tous techniciens</option>
                {techniciens.map(t => (
                  <option key={t.uid} value={t.initiales}>{t.prenom} {t.nom}</option>
                ))}
              </select>
            </div>
            {isFlacon && (
              <div className="flex gap-2">
                <select
                  value={filterMateriau}
                  onChange={(e) => dispatch({ type: 'setFilter', name: 'filterMateriau', value: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
                >
                  <option value="">Tous matériaux</option>
                  <option value="plastique">Plastique</option>
                  <option value="verre">Verre</option>
                </select>
                <select
                  value={filterMarque}
                  onChange={(e) => dispatch({ type: 'setFilter', name: 'filterMarque', value: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
                >
                  <option value="">Toutes marques</option>
                  {marquesFlacon.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Légende anneau métrologique */}
      <div className="flex gap-4 flex-wrap mb-4">
        {[
          { color: COLORS.SUCCESS, label: 'Étalonnage à jour' },
          { color: COLORS.WARNING, label: 'À prévoir (< 30%)' },
          { color: COLORS.DANGER,  label: 'En retard / urgent' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="size-3 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <SkeletonList count={4} variant="card" />
      ) : equipements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-accent-light)' }}>
            <Package size={28} strokeWidth={1.5} style={{ color: COLORS.ACCENT }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Aucun équipement</p>
            <p className="text-sm mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Commencez par ajouter votre premier équipement.
            </p>
          </div>
          <button type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity"
            style={{ background: COLORS.ACCENT, color: 'white', opacity: creating ? 0.6 : 1 }}
          >
            <Plus size={16} />
            Ajouter un équipement
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>Aucun résultat pour ces filtres.</p>
          <button type="button"
            onClick={() => {
              dispatch({ type: 'setFilter', name: 'search', value: '' })
              dispatch({ type: 'setFilter', name: 'filterCategorie', value: '' })
              dispatch({ type: 'setFilter', name: 'filterEtat', value: '' })
              dispatch({ type: 'setFilter', name: 'filterSite', value: '' })
              dispatch({ type: 'setFilter', name: 'filterTechnicien', value: '' })
              dispatch({ type: 'setFilter', name: 'filterMateriau', value: '' })
              dispatch({ type: 'setFilter', name: 'filterMarque', value: '' })
            }}
            className="text-sm font-medium px-4 py-1.5 rounded-lg"
            style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
            Effacer les filtres
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((e: Equipement) => (
            <EquipementCard key={e.id} equipement={e} compact={compact} />
          ))}
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
            Ajouter un équipement
          </button>
        </div>
      )}
    </div>
  )
}
