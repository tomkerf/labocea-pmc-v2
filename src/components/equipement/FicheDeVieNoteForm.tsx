import { useState } from 'react'
import type { FicheDeVieNote } from '@/types'
import { COLORS } from '@/lib/constants'

interface FicheDeVieNoteFormProps {
  editingNote: FicheDeVieNote | null
  initiales: string
  onSave: (note: FicheDeVieNote) => void
  onCancel: () => void
}

export function FicheDeVieNoteForm({ editingNote, initiales, onSave, onCancel }: FicheDeVieNoteFormProps) {
  const [formDate,  setFormDate]  = useState(editingNote?.date  ?? new Date().toISOString().slice(0, 10))
  const [formTitre, setFormTitre] = useState(editingNote?.titre ?? '')
  const [formNotes, setFormNotes] = useState(editingNote?.notes ?? '')

  function handleSubmit() {
    if (!formTitre.trim()) return
    if (editingNote) {
      onSave({ ...editingNote, date: formDate, titre: formTitre.trim(), notes: formNotes.trim() })
    } else {
      onSave({ id: crypto.randomUUID(), date: formDate, titre: formTitre.trim(), notes: formNotes.trim(), auteur: initiales })
    }
  }

  return (
    <div className="rounded-xl p-4 mb-3"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-accent)', boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-semibold mb-3" style={{ color: COLORS.ACCENT }}>
        {editingNote ? 'Modifier la note' : 'Nouvelle note'}
      </p>
      <div className="flex gap-3 mb-2">
        <div className="flex-1">
          <label htmlFor="fdv-titre" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Titre</label>
          <input id="fdv-titre" value={formTitre} onChange={(e) => setFormTitre(e.target.value)}
            placeholder="Ex : Inspection terrain, Réglage, Nettoyage…" className="field-input w-full" />
        </div>
        <div>
          <label htmlFor="fdv-date" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Date</label>
          <input id="fdv-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="field-input" />
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor="fdv-notes" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Détails (optionnel)</label>
        <textarea id="fdv-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
          placeholder="Observations, actions effectuées…" className="field-input w-full resize-none" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          Annuler
        </button>
        <button type="button" onClick={handleSubmit} disabled={!formTitre.trim()} className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: COLORS.ACCENT, color: 'white', opacity: formTitre.trim() ? 1 : 0.5 }}>
          Enregistrer
        </button>
      </div>
    </div>
  )
}
