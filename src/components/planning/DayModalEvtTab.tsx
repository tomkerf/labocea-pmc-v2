import { useState } from 'react'
import { createEvenement } from '@/services/evenementService'
import type { TypeEvenement } from '@/types'
import { COLORS } from '@/lib/constants'

const EVENEMENT_TYPES: { value: TypeEvenement; label: string; emoji: string }[] = [
  { value: 'rappel',  label: 'Rappel',    emoji: '🔔' },
  { value: 'reunion', label: 'Réunion',   emoji: '👥' },
  { value: 'rapport', label: 'Rapport',   emoji: '📋' },
  { value: 'conge',   label: 'Congé/RTT', emoji: '🏖️' },
  { value: 'autre',   label: 'Autre',     emoji: '📌' },
]

interface DayModalEvtTabProps {
  dateStr: string
  uid: string | null
  initiales: string
  onClose: () => void
}

export default function DayModalEvtTab({ dateStr, uid, initiales, onClose }: DayModalEvtTabProps) {
  const [evtTitre,  setEvtTitre]  = useState('')
  const [evtType,   setEvtType]   = useState<TypeEvenement>('rappel')
  const [evtHeure,  setEvtHeure]  = useState('')
  const [evtNotes,  setEvtNotes]  = useState('')
  const [evtSaving, setEvtSaving] = useState(false)

  async function handleCreateEvt() {
    const isConge = evtType === 'conge'
    const titre = evtTitre.trim() || (isConge ? 'Congé/RTT' : '')
    if (!titre || !uid) return
    setEvtSaving(true)
    try {
      await createEvenement(titre, dateStr, evtType, evtHeure, evtNotes, uid, initiales)
      setEvtTitre(''); setEvtHeure(''); setEvtNotes('')
      onClose()
    } finally { setEvtSaving(false) }
  }

  const canCreate = evtType === 'conge' ? true : !!evtTitre.trim()

  return (
    <div className="px-4 py-4 space-y-3 flex-1 overflow-y-auto">
      <input

        aria-label="Titre de l'événement"
        placeholder={evtType === 'conge' ? 'Titre (optionnel)' : 'Titre de l\'événement'}
        value={evtTitre}
        onChange={e => setEvtTitre(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreateEvt()}
        className="w-full px-3 py-2.5 rounded-xl text-sm"
        style={{
          background: COLORS.BG_SECONDARY,
          border: `1px solid ${evtType === 'conge' && !evtTitre.trim() ? 'var(--color-border-subtle)' : COLORS.BORDER}`,
          color: COLORS.TEXT_PRIMARY,
          opacity: evtType === 'conge' && !evtTitre.trim() ? 0.6 : 1,
        }} />
      <div className="grid grid-cols-5 gap-1.5">
        {EVENEMENT_TYPES.map(t => (
          <button type="button" key={t.value} onClick={() => setEvtType(t.value)}
            className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-medium"
            style={{
              background: evtType === t.value ? 'var(--color-accent-light)' : COLORS.BG_SECONDARY,
              color: evtType === t.value ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
              border: `1px solid ${evtType === t.value ? COLORS.ACCENT : 'var(--color-border-subtle)'}`,
            }}>
            <span className="text-base">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>
      <input type="time" value={evtHeure} onChange={e => setEvtHeure(e.target.value)}
        aria-label="Heure de l'événement"
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
      <textarea rows={2} aria-label="Notes de l'événement" placeholder="Notes (optionnel)" value={evtNotes} onChange={e => setEvtNotes(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
      <button type="button" onClick={handleCreateEvt} disabled={!canCreate || evtSaving}
        className="w-full py-3 rounded-xl text-sm font-semibold"
        style={{
          background: canCreate ? COLORS.ACCENT : COLORS.BG_TERTIARY,
          color: canCreate ? 'white' : 'var(--color-text-tertiary)',
        }}>
        {evtSaving ? 'Enregistrement…' : 'Créer l\'événement'}
      </button>
    </div>
  )
}
