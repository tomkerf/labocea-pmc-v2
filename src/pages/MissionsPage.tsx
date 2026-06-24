import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ClipboardList } from 'lucide-react'
import { useClientsListener } from '@/hooks/useClients'
import { createClient } from '@/services/clientService'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { isSamplingOverdue } from '@/lib/overdue'
import ClientCard from '@/components/client/ClientCard'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Client } from '@/types'
import { COLORS } from '@/lib/constants'


function hasOverdue(client: Client): boolean {
  const year = Number(client.annee) || undefined
  return client.plans.some((p) => p.samplings.some((s) => isSamplingOverdue(s, year, p.methode === 'Automatique')))
}

export default function MissionsPage() {
  useClientsListener()

  const navigate = useNavigate()
  const { clients, loading } = useMissionsStore()
  const uid = useAuthStore(selectUid)

  const [search, setSearch] = useState('')
  const [onlyRetard, setOnlyRetard] = useState(false)
  const [creating, setCreating] = useState(false)

  const overdueCount = clients.filter(hasOverdue).length

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.nom.toLowerCase().includes(q) ||
      (c.segment ?? '').toLowerCase().includes(q) ||
      (c.preleveur ?? '').toLowerCase().includes(q)
    const matchRetard = !onlyRetard || hasOverdue(c)
    return matchSearch && matchRetard
  })

  async function handleNewClient() {
    if (!uid || creating) return
    setCreating(true)
    try {
      const id = await createClient(
        {
          annee: String(new Date().getFullYear()),
          nom: 'Nouveau client',
          numClient: '',
          nouvelleDemande: 'Annuelle',
          interlocuteur: '',
          telephone: '',
          mobile: '',
          email: '',
          fonction: '',
          mission: '',
          segment: 'Réseau de mesure',
          numDevis: '',
          numConvention: '',
          preleveur: '',
          dureeContrat: '',
          periodeIntervention: '',
          sites: [],
          montantTotal: 0,
          partPMC: 0,
          partSousTraitance: 0,
        },
        uid,
      )
      navigate(`/missions/${id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            Missions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {loading ? '…' : `${clients.length} client${clients.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button type="button"
          onClick={handleNewClient}
          disabled={creating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold w-full sm:w-auto transition-transform active:scale-[0.98] cursor-pointer"
          style={{
            background: COLORS.ACCENT,
            color: 'white',
            boxShadow: '0 2px 8px rgba(52, 82, 122, 0.25)',
            opacity: creating ? 0.7 : 1,
          }}
        >
          <Plus size={16} />
          Nouveau client
        </button>
      </div>

      {/* Recherche + filtre retard */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            aria-label="Rechercher un client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client, segment, préleveur…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: COLORS.BG_SECONDARY,
              border: '1px solid var(--color-border-subtle)',
              color: COLORS.TEXT_PRIMARY,
            }}
          />
        </div>

        {overdueCount > 0 && (
          <button type="button"
            onClick={() => setOnlyRetard((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all cursor-pointer select-none active:scale-95"
            style={{
              background: onlyRetard ? 'var(--color-danger)' : 'var(--color-danger-light)',
              color: onlyRetard ? 'white' : 'var(--color-danger)',
              border: '1px solid transparent',
              boxShadow: onlyRetard ? '0 2px 6px rgba(229, 62, 62, 0.2)' : 'none',
            }}
          >
            <span className="size-1.5 rounded-full bg-current shrink-0" />
            {overdueCount} en retard
          </button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <SkeletonList count={5} variant="card" />
      ) : filtered.length === 0 ? (
        onlyRetard || search ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {onlyRetard ? 'Aucun client en retard.' : 'Aucun résultat pour cette recherche.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="size-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-accent-light)' }}>
              <ClipboardList size={28} strokeWidth={1.5} style={{ color: COLORS.ACCENT }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Aucun client</p>
              <p className="text-sm mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                Commencez par ajouter votre premier client.
              </p>
            </div>
            <button type="button" onClick={handleNewClient} disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: creating ? 0.7 : 1 }}>
              <Plus size={15} />
              Nouveau client
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
