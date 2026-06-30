import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { AppUser, Demande, DemandeStatut } from '@/types'
import { COLORS } from '@/lib/constants'
import { STATUTS, STATUTS_ARCHIVES, SEGMENTS, FREQUENCES, EMPTY, statutCfg, joursEcoules } from './demandesConfig'
import { DemandeVisites } from './DemandeVisites'

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
      <label className="text-xs font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>{label}</label>
      {children}
    </div>
  )
}

interface DemandeModalProps {
  demande: Partial<Demande>
  users: AppUser[]
  onClose: () => void
  onSave: (d: Demande) => void
  onDelete?: () => void
  onConvertir?: (d: Demande) => void
}

export function DemandeModal({ demande, users, onClose, onSave, onDelete, onConvertir }: DemandeModalProps) {
  const isNew = !demande.id
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Omit<Demande, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>({
    ...EMPTY,
    ...demande,
  })

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function handleSave() {
    if (!form.contactNom.trim() && !form.contactSociete.trim()) return
    setSaving(true)
    onSave({ ...demande, ...form } as Demande)
  }

  const cfg = statutCfg(form.statut)
  const j = joursEcoules(form.dateReception)

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center p-5 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-6 mt-5 mb-10"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-modal)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
              {isNew ? 'Nouvelle demande' : (form.contactSociete || form.contactNom || 'Demande')}
            </h2>
            {!isNew && j !== null && (
              <p className="text-xs mt-0.5" style={{ color: j > 30 ? COLORS.DANGER : j > 14 ? COLORS.WARNING : 'var(--color-text-tertiary)' }}>
                {j === 0 ? "Reçue aujourd'hui" : `Reçue il y a ${j} jour${j > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Contact */}
          <Sec label="Contact" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom"><input aria-label="Nom" value={form.contactNom} onChange={e => set('contactNom', e.target.value)} placeholder="Prénom Nom" className="field-input w-full" /></Field>
            <Field label="Société"><input aria-label="Société" value={form.contactSociete} onChange={e => set('contactSociete', e.target.value)} placeholder="Organisme" className="field-input w-full" /></Field>
            <Field label="Email"><input aria-label="Email" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="email@…" className="field-input w-full" /></Field>
            <Field label="Téléphone"><input aria-label="Téléphone" value={form.contactTel} onChange={e => set('contactTel', e.target.value)} placeholder="06 XX…" className="field-input w-full" /></Field>
          </div>

          {/* Prestation */}
          <Sec label="Prestation" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lieu"><input aria-label="Lieu" value={form.lieu} onChange={e => set('lieu', e.target.value)} placeholder="Commune (29)" className="field-input w-full" /></Field>
            <Field label="Segment">
              <select aria-label="Segment" value={form.segment} onChange={e => set('segment', e.target.value)} className="field-input w-full">
                {SEGMENTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Fréquence">
              <select aria-label="Fréquence" value={form.frequence} onChange={e => set('frequence', e.target.value)} className="field-input w-full">
                {FREQUENCES.map(f => <option key={f} value={f}>{f || '— Non précisée —'}</option>)}
              </select>
            </Field>
            <Field label="Nb points / sites"><input aria-label="Nb points / sites" value={form.nbPoints} onChange={e => set('nbPoints', e.target.value)} placeholder="ex: 3 piézomètres" className="field-input w-full" /></Field>
          </div>
          <Field label="Description technique">
            <textarea aria-label="Description technique" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Nature, conditions, contraintes terrain…" className="field-input w-full resize-none" />
          </Field>

          {/* Suivi commercial */}
          <Sec label="Suivi commercial" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut">
              <select aria-label="Statut" value={form.statut} onChange={e => set('statut', e.target.value as DemandeStatut)} className="field-input w-full" style={{ color: cfg.color, fontWeight: 600 }}>
                {[...STATUTS, ...STATUTS_ARCHIVES].map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Technicien assigné">
              <select aria-label="Technicien assigné" value={form.preleveurUid} onChange={e => set('preleveurUid', e.target.value)} className="field-input w-full">
                <option value="">— Non assigné —</option>
                {users.map(u => <option key={u.uid} value={u.uid}>{u.prenom} {u.nom} ({u.initiales})</option>)}
              </select>
            </Field>
            <Field label="Date de réception"><input aria-label="Date de réception" type="date" value={form.dateReception} onChange={e => set('dateReception', e.target.value)} className="field-input w-full" /></Field>
            <Field label="Date envoi devis"><input aria-label="Date envoi devis" type="date" value={form.dateDevis} onChange={e => set('dateDevis', e.target.value)} className="field-input w-full" /></Field>
            <Field label="Montant devis (€ HT)"><input aria-label="Montant devis (€ HT)" value={form.montantDevis} onChange={e => set('montantDevis', e.target.value)} placeholder="ex: 2 400" className="field-input w-full" /></Field>
          </div>
          <Field label="Notes internes">
            <textarea aria-label="Notes internes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Remarques, points d'attention…" className="field-input w-full resize-none" />
          </Field>

          {!isNew && demande.id && (
            <>
              <Sec label="Visites préliminaires" />
              <DemandeVisites
                demandeId={demande.id}
                demandeNom={form.contactSociete || form.contactNom || 'Demande'}
                onNavigate={onClose}
              />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {onDelete && !isNew ? (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={onDelete}
                  className="text-sm px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: COLORS.DANGER, color: 'white' }}>
                  Confirmer la suppression
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="text-sm px-2 py-1.5 rounded-lg"
                  style={{ color: COLORS.TEXT_SECONDARY }}>
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium"
                style={{ color: COLORS.DANGER, background: 'var(--color-danger-light)' }}>
                <Trash2 size={13} /> Supprimer
              </button>
            )
          ) : <div />}

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg font-medium"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
              Annuler
            </button>
            {form.statut === 'devis_signe' && !isNew && onConvertir && (
              <button type="button"
                disabled={saving}
                onClick={() => { handleSave(); onConvertir({ ...demande, ...form } as Demande) }}
                className="text-sm px-4 py-2 rounded-lg font-semibold"
                style={{ background: COLORS.SUCCESS, color: 'white', opacity: saving ? 0.6 : 1 }}>
                → Créer la mission
              </button>
            )}
            <button type="button" onClick={handleSave}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg font-medium"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: saving ? 0.6 : 1 }}>
              {isNew ? (saving ? 'Création…' : 'Créer') : (saving ? 'Enregistrement…' : 'Enregistrer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
