import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useDemandesListener, saveDemande, createDemande, deleteDemande } from '@/hooks/useDemandes'
import { useDemandesStore } from '@/stores/demandesStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useUsersStore } from '@/stores/usersStore'
import { createClient } from '@/services/clientService'
import type { Demande } from '@/types'
import { COLORS } from '@/lib/constants'
import { STATUTS } from '@/components/demandes/demandesConfig'
import { DemandeCard } from '@/components/demandes/DemandeCard'
import { DemandeModal } from '@/components/demandes/DemandeModal'

export default function DemandesPage() {
  useDemandesListener()
  useUsersListener()

  const { demandes, loading } = useDemandesStore()
  const users = useUsersStore(s => s.users)
  const uid = useAuthStore(selectUid)
  const navigate = useNavigate()

  const [modal, setModal] = useState<Partial<Demande> | null>(null)

  const actifs = STATUTS.map(s => ({
    ...s,
    items: demandes.filter(d => d.statut === s.key),
  }))
  const archives = demandes.filter(d => d.statut === 'refuse' || d.statut === 'converti')
  const activeCount = demandes.filter(d => d.statut !== 'refuse' && d.statut !== 'converti').length

  async function handleSave(d: Demande) {
    if (!uid) return
    if (d.id) {
      await saveDemande(d, uid)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdBy: _cb, createdAt: _ca, updatedAt: _ua, ...partial } = d as Demande & { id: string }
      await createDemande(partial, uid)
    }
    setModal(null)
  }

  async function handleDelete(id: string) {
    await deleteDemande(id)
    setModal(null)
  }

  async function handleConvertir(dem: Demande) {
    if (!uid) return
    await saveDemande({ ...dem, statut: 'converti' }, uid)
    const clientId = await createClient({
      annee: String(new Date().getFullYear()),
      nom: dem.contactSociete || dem.contactNom,
      numClient: '',
      nouvelleDemande: 'Ponctuelle',
      interlocuteur: dem.contactNom,
      telephone: dem.contactTel,
      mobile: '',
      email: dem.contactEmail,
      fonction: '',
      mission: dem.description,
      segment: (dem.segment as 'SRA' | 'Réseau de mesure' | 'RSDE') || 'SRA',
      numDevis: '',
      numConvention: '',
      preleveur: '',
      dureeContrat: '',
      periodeIntervention: '',
      sites: dem.lieu ? [dem.lieu] : [],
      montantTotal: dem.montantDevis ? Number(dem.montantDevis.replace(/\s/g, '')) || 0 : 0,
      partPMC: 0,
      partSousTraitance: 0,
    }, uid)
    setModal(null)
    navigate(`/missions/${clientId}`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Demandes clients</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {activeCount} demande{activeCount !== 1 ? 's' : ''} en cours
          </p>
        </div>
        <button type="button"
          onClick={() => setModal({})}
          className="flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg w-full sm:w-auto transition-transform active:scale-[0.98] cursor-pointer"
          style={{ background: COLORS.ACCENT, color: 'white' }}>
          <Plus size={15} /> Nouvelle demande
        </button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="size-6 rounded-full border-2 animate-spin"
              style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
          </div>
        ) : (
          <div className="flex gap-4 h-full min-h-0" style={{ minWidth: 'max-content' }}>
            {actifs.map(col => (
              <div key={col.key} className="flex flex-col" style={{ width: 260 }}>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl"
                  style={{ background: COLORS.BG_SECONDARY, borderTop: '1px solid var(--color-border-subtle)', borderLeft: '1px solid var(--color-border-subtle)', borderRight: '1px solid var(--color-border-subtle)' }}>
                  <span className="text-xs font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{col.label}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                    {col.items.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto rounded-b-xl p-2 flex flex-col gap-2"
                  style={{ borderLeft: '1px solid var(--color-border-subtle)', borderRight: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_PRIMARY, minHeight: 120 }}>
                  {col.items.length === 0 ? (
                    <div className="flex flex-col items-center py-8 gap-1.5">
                      <span className="text-lg">📭</span>
                      <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>Aucune demande</p>
                    </div>
                  ) : (
                    col.items.map(d => (
                      <DemandeCard key={d.id} dem={d} onClick={() => setModal(d)} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archives */}
        {archives.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Archivés ({archives.length})
            </p>
            <div className="flex flex-wrap gap-3">
              {archives.map(d => (
                <div key={d.id} style={{ width: 260, opacity: 0.7 }}>
                  <DemandeCard dem={d} onClick={() => setModal(d)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <DemandeModal
          demande={modal}
          users={users}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.id ? () => handleDelete(modal.id!) : undefined}
          onConvertir={modal.id ? handleConvertir : undefined}
        />
      )}
    </div>
  )
}
