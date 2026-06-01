import { useState } from 'react'
import { Plus, Search, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useUsersListener } from '@/hooks/useUsers'
import { createEquipement } from '@/services/equipementService'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import EquipementCard from '@/components/materiel/EquipementCard'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Equipement } from '@/types'


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

export default function MaterielPage() {
  useEquipementsListener()
  useUsersListener()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  const { equipements, loading } = useEquipementsStore()

  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterEtat, setFilterEtat] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterTechnicien, setFilterTechnicien] = useState('')
  const [filterMateriau, setFilterMateriau] = useState('')
  const [filterMarque, setFilterMarque] = useState('')

  const users = useUsersStore(s => s.users)
  const techniciens = users.filter(u => u.role !== 'charge_mission')

  const [creating, setCreating] = useState(false)

  const isFlacon = filterCategorie === 'flacon'

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Matériel</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {equipements.length} équipement{equipements.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-opacity"
          style={{ background: 'var(--color-accent)', color: 'white', opacity: creating ? 0.6 : 1 }}
        >
          <Plus size={16} />
          Ajouter un équipement
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un équipement…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterCategorie}
            onChange={(e) => { setFilterCategorie(e.target.value); setFilterMateriau(''); setFilterMarque('') }}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filterEtat}
            onChange={(e) => setFilterEtat(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          >
            {ETATS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          >
            <option value="">Tous sites</option>
            <option value="quimper">Quimper</option>
            <option value="brest">Brest</option>
          </select>
          <select
            value={filterTechnicien}
            onChange={(e) => setFilterTechnicien(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
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
              onChange={(e) => setFilterMateriau(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
            >
              <option value="">Tous matériaux</option>
              <option value="plastique">Plastique</option>
              <option value="verre">Verre</option>
            </select>
            <select
              value={filterMarque}
              onChange={(e) => setFilterMarque(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
            >
              <option value="">Toutes marques</option>
              {marquesFlacon.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Légende anneau métrologique */}
      <div className="flex gap-4 flex-wrap mb-4">
        {[
          { color: 'var(--color-success)', label: 'Étalonnage à jour' },
          { color: 'var(--color-warning)', label: 'À prévoir (< 30%)' },
          { color: 'var(--color-danger)',  label: 'En retard / urgent' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="size-3 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
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
            <Package size={28} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Aucun équipement</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Commencez par ajouter votre premier équipement.
            </p>
          </div>
          <button type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity"
            style={{ background: 'var(--color-accent)', color: 'white', opacity: creating ? 0.6 : 1 }}
          >
            <Plus size={16} />
            Ajouter un équipement
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Aucun résultat pour ces filtres.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((e: Equipement) => (
            <EquipementCard key={e.id} equipement={e} />
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
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
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
