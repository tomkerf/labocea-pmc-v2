import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEquipementsListener, createEquipement } from '@/hooks/useEquipements'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useAuthStore } from '@/stores/authStore'
import EquipementCard from '@/components/materiel/EquipementCard'
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
  { value: 'sonde_niveau', label: 'Sondes niveau'  },
  { value: 'chronometre',  label: 'Chronomètres'   },
]

const ETATS = [
  { value: '', label: 'Tous états' },
  { value: 'operationnel', label: 'Opérationnel' },
  { value: 'en_maintenance', label: 'En maintenance' },
  { value: 'hors_service', label: 'Hors service' },
  { value: 'prete', label: 'Prêté' },
]

export default function MaterielPage() {
  useEquipementsListener()
  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.uid())
  const { equipements, loading } = useEquipementsStore()

  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterEtat, setFilterEtat] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = equipements.filter((e: Equipement) => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.nom.toLowerCase().includes(q) || e.marque.toLowerCase().includes(q) || e.modele.toLowerCase().includes(q) || e.numSerie.toLowerCase().includes(q)
    const matchCategorie = !filterCategorie || e.categorie === filterCategorie
    const matchEtat = !filterEtat || e.etat === filterEtat
    return matchSearch && matchCategorie && matchEtat
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
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-opacity"
          style={{ background: 'var(--color-accent)', color: 'white', opacity: creating ? 0.6 : 1 }}
        >
          <Plus size={16} />
          Ajouter
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
            onChange={(e) => setFilterCategorie(e.target.value)}
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
            {equipements.length === 0
              ? 'Aucun équipement — cliquez sur "Ajouter" pour commencer.'
              : 'Aucun résultat pour ces filtres.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((e: Equipement) => (
            <EquipementCard key={e.id} equipement={e} />
          ))}
        </div>
      )}
    </div>
  )
}
