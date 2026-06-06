import { useState } from 'react'
import { MATERIAUX } from '@/lib/tuyauxUtils'
import type { Tuyau, MateriauTuyau } from '@/types'
import { COLORS } from '@/lib/constants'


interface TuyauFormProps {
  tuyau?: Partial<Tuyau>
  onSave: (t: Omit<Tuyau, 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
}

export function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0 w-14"
        style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}
        style={{ color: COLORS.TEXT_PRIMARY, background: COLORS.BG_TERTIARY, padding: '1px 6px', borderRadius: 4 }}>
        {value}
      </span>
    </div>
  )
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_SECONDARY }}>
      {children}
    </span>
  )
}

const lbl = { color: COLORS.TEXT_SECONDARY } as const

function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={lbl}>
        {label}{req && <span className="ml-0.5" style={{ color: COLORS.DANGER }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const wrap = {
  background: COLORS.BG_TERTIARY,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 11px',
} as const

export default function TuyauForm({ tuyau = {}, onSave, onClose }: TuyauFormProps) {
  const [refLabo,      setRefLabo]      = useState(tuyau.refLabo      ?? '')
  const [materiau,     setMateriau]     = useState<MateriauTuyau>(tuyau.materiau ?? 'TEFLON')
  const [objet,        setObjet]        = useState(tuyau.objet        ?? '')
  const [materiel,     setMateriel]     = useState(tuyau.materiel     ?? '')
  const [dateCreation, setDateCreation] = useState(tuyau.dateCreation ?? '')
  const [marque,       setMarque]       = useState(tuyau.marque       ?? '')
  const [numSerie,     setNumSerie]     = useState(tuyau.numSerie     ?? '')
  const [type,         setType]         = useState(tuyau.type         ?? '')
  const [fournisseur,  setFournisseur]  = useState(tuyau.fournisseur  ?? 'SEFI Quimper')
  const [notes,        setNotes]        = useState(tuyau.notes        ?? '')

  const canSave = refLabo.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const ref = refLabo.trim().toUpperCase()
    const yr = parseInt('20' + ref.slice(1, 3))
    const annee = isNaN(yr) || yr < 2020 || yr > 2040 ? new Date().getFullYear() : yr
    onSave({
      id: tuyau.id ?? crypto.randomUUID(),
      refLabo: ref, materiau, annee, objet: objet.trim(),
      materiel: materiel.trim(), dateCreation,
      marque: marque.trim(), numSerie: numSerie.trim(),
      type: type.trim(), fournisseur: fournisseur.trim(),
      notes: notes.trim(), createdBy: tuyau.createdBy ?? '',
    })
  }

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl overflow-hidden"
        style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-modal)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            {tuyau.id ? 'Modifier le tuyau' : 'Nouveau tuyau'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="size-7 flex items-center justify-center rounded-full text-sm"
            style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <F label="Réf Labo" req>
              <div style={{ ...wrap, borderColor: refLabo ? COLORS.BORDER : undefined }}>
                <input value={refLabo} onChange={e => setRefLabo(e.target.value.toUpperCase())}
                  placeholder="Q25TFE1"
                  aria-label="Référence labo"
                  className="field-input text-sm font-bold tracking-widest"
                  />
              </div>
            </F>
            <F label="Matériau">
              <div style={wrap}>
                <select value={materiau} onChange={e => setMateriau(e.target.value as MateriauTuyau)}
                  aria-label="Matériau"
                  className="field-input text-sm">
                  {MATERIAUX.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </F>
            <F label="Objet">
              <div style={wrap}>
                <input value={objet} onChange={e => setObjet(e.target.value)}
                  placeholder="RSDE DZ, SRA…" aria-label="Objet" className="field-input text-sm" />
              </div>
            </F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Code matériel">
              <div style={wrap}>
                <input value={materiel} onChange={e => setMateriel(e.target.value)}
                  placeholder="PLV07 / FLC22" aria-label="Code matériel" className="field-input text-sm" />
              </div>
            </F>
            <F label="Date création">
              <div style={wrap}>
                <input type="date" value={dateCreation} onChange={e => setDateCreation(e.target.value)}
                  aria-label="Date de création" className="field-input text-sm" />
              </div>
            </F>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <F label="Marque">
              <div style={wrap}>
                <input value={marque} onChange={e => setMarque(e.target.value)}
                  aria-label="Marque" className="field-input text-sm" />
              </div>
            </F>
            <F label="N° de série">
              <div style={wrap}>
                <input value={numSerie} onChange={e => setNumSerie(e.target.value)}
                  aria-label="Numéro de série" className="field-input text-sm" />
              </div>
            </F>
            <F label="Type">
              <div style={wrap}>
                <input value={type} onChange={e => setType(e.target.value)}
                  aria-label="Type de tuyau" className="field-input text-sm" />
              </div>
            </F>
          </div>

          <F label="Fournisseur">
            <div style={wrap}>
              <input value={fournisseur} onChange={e => setFournisseur(e.target.value)}
                placeholder="SEFI Quimper" aria-label="Fournisseur" className="field-input text-sm" />
            </div>
          </F>

          <F label="Notes">
            <div style={{ ...wrap, padding: '8px 11px' }}>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Observations, lot de campagne…"
                aria-label="Notes"
                className="field-input text-sm resize-none" />
            </div>
          </F>
        </div>

        <div className="flex gap-2 px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
            style={{
              background: COLORS.ACCENT,
              color: 'white',
              opacity: canSave ? 1 : 0.4,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}>
            {tuyau.id ? 'Enregistrer' : 'Créer le tuyau'}
          </button>
        </div>
      </div>
    </div>
  )
}
