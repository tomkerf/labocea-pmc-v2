import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Trash2 } from 'lucide-react'
import { useDemandesListener, saveDemande, createDemande, deleteDemande } from '@/hooks/useDemandes'
import { useDemandesStore } from '@/stores/demandesStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useUsersStore } from '@/stores/usersStore'
import { createClient } from '@/hooks/useClients'
import type { AppUser, Demande, DemandeStatut } from '@/types'

// ── Config statuts ────────────────────────────────────────────

const STATUTS: { key: DemandeStatut; label: string; color: string }[] = [
  { key: 'attente_devis', label: 'En attente de devis', color: 'var(--color-warning)'  },
  { key: 'devis_envoye',  label: 'Devis envoyé',        color: 'var(--color-accent)'   },
  { key: 'visite_prelim', label: 'Visite préliminaire', color: 'var(--color-neutral)'  },
  { key: 'devis_signe',   label: 'Devis signé',         color: 'var(--color-success)'  },
]

const STATUTS_ARCHIVES: { key: DemandeStatut; label: string; color: string }[] = [
  { key: 'refuse',    label: 'Refusé',        color: '#ff3b30' },
  { key: 'converti',  label: 'Mission créée', color: '#34c759' },
]

function statutCfg(key: string) {
  return STATUTS.find(s => s.key === key) ?? STATUTS_ARCHIVES.find(s => s.key === key) ?? STATUTS[0]
}

function joursEcoules(dateStr: string) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

// ── Formulaire (modal) ────────────────────────────────────────

const EMPTY: Omit<Demande, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  contactNom: '', contactSociete: '', contactEmail: '', contactTel: '',
  lieu: '', segment: 'SRA', description: '', frequence: '',
  nbPoints: '', montantDevis: '', dateDevis: '',
  statut: 'attente_devis', preleveurUid: '', notes: '',
  dateReception: new Date().toISOString().slice(0, 10),
}

const SEGMENTS = ['SRA', 'AEP', 'STEP', 'TAR', 'Réseau de mesure', 'RSDE']
const FREQUENCES = ['', 'Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Ponctuel']

interface ModalProps {
  demande: Partial<Demande>
  onClose: () => void
  onSave: (d: Demande) => void
  onDelete?: () => void
  onConvertir?: (d: Demande) => void
  users: AppUser[]
}

function DemandeModal({ demande, onClose, onSave, onDelete, onConvertir, users }: ModalProps) {
  const isNew = !demande.id
  const [form, setForm] = useState<Omit<Demande, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>({
    ...EMPTY,
    ...demande,
  })

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function handleSave() {
    if (!form.contactNom.trim() && !form.contactSociete.trim()) return
    onSave({ ...demande, ...form } as Demande)
  }

  const cfg = statutCfg(form.statut)
  const j = joursEcoules(form.dateReception)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-5 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-6 mt-5 mb-10"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-modal)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {isNew ? 'Nouvelle demande' : (form.contactSociete || form.contactNom || 'Demande')}
            </h2>
            {!isNew && j !== null && (
              <p className="text-xs mt-0.5" style={{ color: j > 30 ? 'var(--color-danger)' : j > 14 ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }}>
                {j === 0 ? "Reçue aujourd'hui" : `Reçue il y a ${j} jour${j > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Contact */}
          <Sec label="Contact" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom"><input value={form.contactNom} onChange={e => set('contactNom', e.target.value)} placeholder="Prénom Nom" className="field-input w-full" /></Field>
            <Field label="Société"><input value={form.contactSociete} onChange={e => set('contactSociete', e.target.value)} placeholder="Organisme" className="field-input w-full" /></Field>
            <Field label="Email"><input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="email@…" className="field-input w-full" /></Field>
            <Field label="Téléphone"><input value={form.contactTel} onChange={e => set('contactTel', e.target.value)} placeholder="06 XX…" className="field-input w-full" /></Field>
          </div>

          {/* Prestation */}
          <Sec label="Prestation" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lieu"><input value={form.lieu} onChange={e => set('lieu', e.target.value)} placeholder="Commune (29)" className="field-input w-full" /></Field>
            <Field label="Segment">
              <select value={form.segment} onChange={e => set('segment', e.target.value)} className="field-input w-full">
                {SEGMENTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Fréquence">
              <select value={form.frequence} onChange={e => set('frequence', e.target.value)} className="field-input w-full">
                {FREQUENCES.map(f => <option key={f} value={f}>{f || '— Non précisée —'}</option>)}
              </select>
            </Field>
            <Field label="Nb points / sites"><input value={form.nbPoints} onChange={e => set('nbPoints', e.target.value)} placeholder="ex: 3 piézomètres" className="field-input w-full" /></Field>
          </div>
          <Field label="Description technique">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Nature, conditions, contraintes terrain…" className="field-input w-full resize-none" />
          </Field>

          {/* Suivi */}
          <Sec label="Suivi commercial" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut">
              <select value={form.statut} onChange={e => set('statut', e.target.value as DemandeStatut)} className="field-input w-full" style={{ color: cfg.color, fontWeight: 600 }}>
                {[...STATUTS, ...STATUTS_ARCHIVES].map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Technicien assigné">
              <select value={form.preleveurUid} onChange={e => set('preleveurUid', e.target.value)} className="field-input w-full">
                <option value="">— Non assigné —</option>
                {users.map(u => <option key={u.uid} value={u.uid}>{u.prenom} {u.nom} ({u.initiales})</option>)}
              </select>
            </Field>
            <Field label="Date de réception"><input type="date" value={form.dateReception} onChange={e => set('dateReception', e.target.value)} className="field-input w-full" /></Field>
            <Field label="Date envoi devis"><input type="date" value={form.dateDevis} onChange={e => set('dateDevis', e.target.value)} className="field-input w-full" /></Field>
            <Field label="Montant devis (€ HT)"><input value={form.montantDevis} onChange={e => set('montantDevis', e.target.value)} placeholder="ex: 2 400" className="field-input w-full" /></Field>
          </div>
          <Field label="Notes internes">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Remarques, points d'attention…" className="field-input w-full resize-none" />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {onDelete && !isNew ? (
            <button
              onClick={() => { if (confirm('Supprimer cette demande ?')) onDelete() }}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium"
              style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)' }}
            >
              <Trash2 size={13} /> Supprimer
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg font-medium" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              Annuler
            </button>
            {form.statut === 'devis_signe' && !isNew && onConvertir && (
              <button
                onClick={() => { handleSave(); onConvertir({ ...demande, ...form } as Demande) }}
                className="text-sm px-4 py-2 rounded-lg font-semibold"
                style={{ background: 'var(--color-success)', color: 'white' }}
              >
                → Créer la mission
              </button>
            )}
            <button onClick={handleSave} className="text-sm px-4 py-2 rounded-lg font-medium" style={{ background: 'var(--color-accent)', color: 'white' }}>
              {isNew ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Sec({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
      {label}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Carte kanban ──────────────────────────────────────────────

function DemandeCard({ dem, onClick }: { dem: Demande; onClick: () => void }) {
  const titre = dem.contactSociete || dem.contactNom || 'Sans nom'
  const sous = dem.contactSociete && dem.contactNom ? dem.contactNom : dem.contactEmail
  const j = joursEcoules(dem.dateReception)
  const jColor = j === null ? 'var(--color-text-tertiary)' : j > 30 ? 'var(--color-danger)' : j > 14 ? 'var(--color-warning)' : 'var(--color-text-tertiary)'

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-shadow"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
    >
      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{titre}</p>
      {sous && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{sous}</p>}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {dem.lieu && <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>📍 {dem.lieu}</span>}
        {dem.segment && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            {dem.segment}
          </span>
        )}
      </div>
      {j !== null && (
        <p className="text-[10px] mt-1.5 font-medium" style={{ color: jColor }}>
          {j > 14 ? '⚠ ' : ''}{j === 0 ? "Reçue aujourd'hui" : `Il y a ${j}j`}
        </p>
      )}
    </button>
  )
}

// ── Page principale ───────────────────────────────────────────

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

  async function handleSave(d: Demande) {
    if (!uid) return
    if (d.id) {
      await saveDemande(d, uid)
    } else {
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
    // Marquer la demande comme convertie
    await saveDemande({ ...dem, statut: 'converti' }, uid)
    // Créer le client avec les données pré-remplies
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

  const activeCount = demandes.filter(d => d.statut !== 'refuse' && d.statut !== 'converti').length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Demandes clients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {activeCount} demande{activeCount !== 1 ? 's' : ''} en cours
          </p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          <Plus size={15} /> Nouvelle demande
        </button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
          </div>
        ) : (
          <div className="flex gap-4 h-full min-h-0" style={{ minWidth: 'max-content' }}>
            {actifs.map(col => (
              <div key={col.key} className="flex flex-col" style={{ width: 260 }}>
                {/* En-tête colonne */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-t-xl"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    borderTop: '1px solid var(--color-border-subtle)',
                    borderLeft: '1px solid var(--color-border-subtle)',
                    borderRight: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{col.label}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                    {col.items.length}
                  </span>
                </div>
                {/* Cartes */}
                <div
                  className="flex-1 overflow-y-auto rounded-b-xl p-2 flex flex-col gap-2"
                  style={{
                    borderLeft: '1px solid var(--color-border-subtle)',
                    borderRight: '1px solid var(--color-border-subtle)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-bg-primary)',
                    minHeight: 120,
                  }}
                >
                  {col.items.length === 0 ? (
                    <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>—</p>
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

        {/* Archives (refuse + converti) */}
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
