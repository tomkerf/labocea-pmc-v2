import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Inbox } from 'lucide-react'
import { useDemandesListener, saveDemande, createDemande, deleteDemande } from '@/hooks/useDemandes'
import { useDemandesStore } from '@/stores/demandesStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { createClient } from '@/services/clientService'
import type { Demande } from '@/types'
import { STATUTS, EMPTY } from '@/components/demandes/demandesConfig'
import { DemandeCard } from '@/components/demandes/DemandeCard'
import { DemandeModal } from '@/components/demandes/DemandeModal'

export default function DemandesPage() {
  useDemandesListener()

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
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Demandes clients</h1>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mt-0.5">
            {activeCount} demande{activeCount !== 1 ? 's' : ''} en cours
          </p>
        </div>
        <button type="button"
          onClick={() => setModal({})}
          className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full sm:w-auto transition-all bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-sm hover:shadow active:scale-[0.98] cursor-pointer">
          <Plus size={16} /> Nouvelle demande
        </button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="size-6 rounded-full border-2 animate-spin border-[var(--color-border)] border-t-[var(--color-accent)]" />
          </div>
        ) : (
          <div className="flex gap-5 h-full min-h-0 py-1.5" style={{ minWidth: 'max-content' }}>
            {actifs.map(col => (
              <div key={col.key} className="flex flex-col w-[275px] shrink-0 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
                {/* Header de colonne */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">{col.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[rgba(0,113,227,0.12)]">
                    {col.items.length}
                  </span>
                </div>
                {/* Corps de colonne */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-[var(--color-bg-primary)]/40 min-h-[200px]">
                  {col.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 px-2 gap-3 flex-1">
                      <div className="size-10 rounded-full flex items-center justify-center bg-[var(--color-accent-light)] border border-[rgba(0,113,227,0.08)] text-[var(--color-accent)]">
                        <Inbox size={18} strokeWidth={1.5} />
                      </div>
                      <p className="text-[11px] font-semibold text-center text-[var(--color-text-secondary)]">Aucune demande</p>
                      <button type="button"
                        onClick={() => setModal({ ...EMPTY, statut: col.key })}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-sm text-[var(--color-accent)] hover:bg-[var(--color-bg-tertiary)] active:scale-95 transition-all cursor-pointer">
                        + Ajouter
                      </button>
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
          <div className="mt-8 border-t border-[var(--color-border-subtle)] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded border border-[var(--color-border-subtle)]">
                Archivés
              </span>
              <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">({archives.length})</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {archives.map(d => (
                <div key={d.id} className="w-[275px] opacity-75 hover:opacity-100 transition-opacity duration-200">
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
