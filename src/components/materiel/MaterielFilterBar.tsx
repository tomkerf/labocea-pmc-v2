import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { AppUser } from '@/types'

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'preleveur',          label: 'Préleveurs'          },
  { value: 'debitmetre',         label: 'Débitmètres'         },
  { value: 'multiparametre',     label: 'Multiparamètres'     },
  { value: 'glaciere',           label: 'Glacières'           },
  { value: 'enregistreur',       label: 'Enregistreurs'       },
  { value: 'thermometre',        label: 'Thermomètres'        },
  { value: 'reglet',             label: 'Réglets'             },
  { value: 'eprouvette',         label: 'Éprouvettes'         },
  { value: 'flacon',             label: 'Flacons'             },
  { value: 'pompe_pz',           label: 'Pompes PZ'           },
  { value: 'chronometre',        label: 'Chronomètres'        },
  { value: 'manchon_deversoir',  label: 'Manchons déversoirs' },
]

const ETATS = [
  { value: '', label: 'Tous états' },
  { value: 'operationnel',    label: 'Opérationnel'    },
  { value: 'en_maintenance',  label: 'En maintenance'  },
  { value: 'hors_service',    label: 'Hors service'    },
  { value: 'prete',           label: 'Prêté'           },
]

export interface FiltersState {
  search: string
  filterCategorie: string
  filterEtat: string
  filterSite: string
  filterTechnicien: string
  filterMateriau: string
  filterMarque: string
}

export type FiltersAction =
  | { type: 'setFilter'; name: keyof FiltersState; value: string }
  | { type: 'reset' }

export const initialFilters: FiltersState = {
  search: '',
  filterCategorie: '',
  filterEtat: '',
  filterSite: '',
  filterTechnicien: '',
  filterMateriau: '',
  filterMarque: '',
}

export function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'setFilter': return { ...state, [action.name]: action.value }
    case 'reset':     return initialFilters
    default:          return state
  }
}

interface Props {
  filters: FiltersState
  dispatch: React.Dispatch<FiltersAction>
  techniciens: AppUser[]
  marquesFlacon: string[]
}

export default function MaterielFilterBar({ filters, dispatch, techniciens, marquesFlacon }: Props) {
  const { search, filterCategorie, filterEtat, filterSite, filterTechnicien, filterMateriau, filterMarque } = filters
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const isFlacon = filterCategorie === 'flacon'

  const activeChips = ([
    filterCategorie  && { key: 'filterCategorie'  as const, label: CATEGORIES.find(c => c.value === filterCategorie)?.label ?? filterCategorie },
    filterEtat       && { key: 'filterEtat'        as const, label: ETATS.find(e => e.value === filterEtat)?.label ?? filterEtat               },
    filterSite       && { key: 'filterSite'        as const, label: filterSite === 'quimper' ? 'Quimper' : 'Brest'                             },
    filterTechnicien && { key: 'filterTechnicien'  as const, label: techniciens.find(t => t.initiales === filterTechnicien)?.prenom ?? filterTechnicien },
    filterMateriau   && { key: 'filterMateriau'    as const, label: filterMateriau === 'plastique' ? 'Plastique' : 'Verre'                     },
    filterMarque     && { key: 'filterMarque'      as const, label: filterMarque                                                               },
  ].filter(Boolean) as { key: keyof FiltersState; label: string }[])

  return (
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
  )
}
