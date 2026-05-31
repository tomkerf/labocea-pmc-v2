import { useState } from 'react'
import { X } from 'lucide-react'
import { MOIS_LONG } from '@/lib/planningUtils'
import type { TypeEvenement } from '@/types'

interface DragCreateModalProps {
  dateDebut: string
  dateFin: string
  onClose: () => void
  onSave: (titre: string, type: TypeEvenement, dateDebut: string, dateFin: string, heure: string, notes: string) => Promise<void>
}

export default function DragCreateModal({ dateDebut, dateFin, onClose, onSave }: DragCreateModalProps) {
  const [titre,  setTitre]  = useState('')
  const [type,   setType]   = useState<TypeEvenement>(dateDebut !== dateFin ? 'conge' : 'autre')
  const [debut,  setDebut]  = useState(dateDebut)
  const [fin,    setFin]    = useState(dateFin)
  const [heure,  setHeure]  = useState('')
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)

  const isMultiDay = debut !== fin

  const TYPES: { value: TypeEvenement; label: string; emoji: string }[] = [
    { value: 'rappel',  label: 'Rappel',    emoji: '🔔' },
    { value: 'reunion', label: 'Réunion',   emoji: '👥' },
    { value: 'rapport', label: 'Rapport',   emoji: '📋' },
    { value: 'conge',   label: 'Congé/RTT', emoji: '🏖️' },
    { value: 'autre',   label: 'Autre',     emoji: '📌' },
  ]

  async function handleSave() {
    const effectiveTitre = titre.trim() || (type === 'conge' ? 'Congé/RTT' : '')
    if (!effectiveTitre) return
    setSaving(true)
    try {
      await onSave(effectiveTitre, type, debut, isMultiDay ? fin : '', heure, notes)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function fmtDate(d: string) {
    const dt = new Date(d + 'T12:00:00')
    return `${dt.getDate()} ${MOIS_LONG[dt.getMonth()]}`
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <div className="w-full md:w-[400px] rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-bg-secondary)',
          boxShadow: 'var(--shadow-modal)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Nouvel événement
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {isMultiDay ? `${fmtDate(debut)} → ${fmtDate(fin)}` : fmtDate(debut)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

        <div className="px-5 py-4 space-y-3">
          <input
            autoFocus
            aria-label="Titre de l'événement"
            placeholder={type === 'conge' ? 'Titre (optionnel)' : 'Titre de l\'événement'}
            value={titre}
            onChange={e => setTitre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--color-bg-tertiary)',
              border: `1px solid ${type === 'conge' && !titre.trim() ? 'var(--color-border-subtle)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
              opacity: type === 'conge' && !titre.trim() ? 0.6 : 1,
            }} />

          <div className="grid grid-cols-5 gap-1.5">
            {TYPES.map(t => (
              <button type="button" key={t.value} onClick={() => setType(t.value)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-medium"
                style={{
                  background: type === t.value ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                  color: type === t.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  border: `1px solid ${type === t.value ? 'var(--color-accent)' : 'transparent'}`,
                }}>
                <span className="text-base">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Début
              </label>
              <input type="date" value={debut} onChange={e => setDebut(e.target.value)} aria-label="Date de début"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Fin
              </label>
              <input type="date" value={fin} min={debut} onChange={e => setFin(e.target.value)} aria-label="Date de fin"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>

          {!isMultiDay && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Heure (optionnel)
              </label>
              <input type="time" value={heure} onChange={e => setHeure(e.target.value)} aria-label="Heure"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Notes (optionnel)
            </label>
            <textarea rows={2} placeholder="Remarques…" value={notes} onChange={e => setNotes(e.target.value)} aria-label="Notes"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
          </div>

          {(() => {
            const canSave = type === 'conge' ? true : !!titre.trim()
            return (
              <button type="button" onClick={handleSave} disabled={!canSave || saving}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: canSave ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  color: canSave ? 'white' : 'var(--color-text-tertiary)',
                }}>
                {saving ? 'Enregistrement…' : 'Créer l\'événement'}
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
