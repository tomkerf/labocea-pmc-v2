// src/components/tournee/SaisieRapideModal.tsx
import { useReducer, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import type { NappeType } from '@/types'
import { COLORS } from '@/lib/constants'


const STATUS_LABELS = { done: 'Réalisé', non_effectue: 'Non effectué', reporte: 'Reporter' } as const
const STATUS_COLORS = {
  done:         { bg: 'var(--color-success-light)', text: 'var(--color-success-text)' },
  non_effectue: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-text)' },
  reporte:      { bg: 'var(--color-accent-light)',  text: COLORS.ACCENT               },
} as const

export interface SaisieRapideData {
  status: 'done' | 'non_effectue' | 'reporte'
  doneDate: string
  nappe: NappeType
  commentaire: string
  motif: string
  newPlannedDate: string
  rapportPrevu: boolean
}

interface Props {
  clientNom: string
  siteNom: string
  nature: string
  initialStatus: 'done' | 'non_effectue' | 'reporte'
  initialRapportPrevu?: boolean
  hideRealise?: boolean
  onConfirm: (data: SaisieRapideData) => void
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

interface FormState {
  status: 'done' | 'non_effectue' | 'reporte'
  doneDate: string
  newPlannedDate: string
  nappe: NappeType
  commentaire: string
  motif: string
  rapportPrevu: boolean
}

type FormAction = { type: 'field'; name: keyof FormState; value: string | boolean | NappeType | 'done' | 'non_effectue' | 'reporte' }

function formReducer(state: FormState, action: FormAction): FormState {
  if (action.type === 'field') {
    return { ...state, [action.name]: action.value }
  }
  return state
}

export function SaisieRapideModal({ clientNom, siteNom, nature, initialStatus, initialRapportPrevu, hideRealise, onConfirm, onClose }: Props) {
  const [form, dispatch] = useReducer(formReducer, undefined, (): FormState => ({
    status:         initialStatus === 'done' && hideRealise ? 'non_effectue' : initialStatus,
    doneDate:       todayISO(),
    newPlannedDate: todayISO(),
    nappe:          '',
    commentaire:    '',
    motif:          '',
    rapportPrevu:   initialRapportPrevu ?? false,
  }))
  const { status, doneDate, newPlannedDate, nappe, commentaire, motif, rapportPrevu } = form
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSouterraine = nature === 'Souterraine'

  function handleConfirm() {
    if (status === 'non_effectue' && !motif.trim()) {
      setError('Motif obligatoire pour un prélèvement non effectué.')
      return
    }
    if (status === 'reporte' && !newPlannedDate) {
      setError('Nouvelle date obligatoire pour reporter.')
      return
    }
    setError('')
    setSubmitting(true)
    onConfirm({ status, doneDate, nappe, commentaire, motif: motif.trim(), newPlannedDate, rapportPrevu })
  }

  return (
    <AnimatePresence>
      <div role="presentation" className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
        <m.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full rounded-t-2xl px-6 pt-5 pb-10 md:rounded-2xl md:max-w-lg md:pb-6"
          style={{ background: COLORS.BG_SECONDARY }}
          onClick={e => e.stopPropagation()}>

          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: COLORS.BORDER }} />

          <p className="text-base font-semibold mb-0.5" style={{ color: COLORS.TEXT_PRIMARY }}>{clientNom}</p>
          <p className="text-sm mb-5" style={{ color: COLORS.TEXT_SECONDARY }}>{siteNom}</p>

          {/* Statut */}
          <div className="flex gap-2 mb-4">
            {(['done', 'non_effectue', 'reporte'] as const).flatMap(s => {
              if (s === 'done' && hideRealise) return []
              const isActive = status === s
              return [(
                <button type="button" key={s}
                  onClick={() => dispatch({ type: 'field', name: 'status', value: s })}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isActive ? STATUS_COLORS[s].bg : COLORS.BG_TERTIARY,
                    color:      isActive ? STATUS_COLORS[s].text : COLORS.TEXT_SECONDARY,
                  }}>
                  {STATUS_LABELS[s]}
                </button>
              )]
            })}
          </div>

          {/* Date réalisée — uniquement si done */}
          {status === 'done' && (
            <label className="block mb-3">
              <span className="text-xs font-medium mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Date réalisée</span>
              <input type="date" value={doneDate} onChange={e => dispatch({ type: 'field', name: 'doneDate', value: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
            </label>
          )}

          {/* Rapport d'intervention prévu — uniquement si done */}
          {status === 'done' && (
            <label className="flex items-center gap-2.5 mb-3 px-3 py-2.5 rounded-lg cursor-pointer"
              style={{ background: COLORS.BG_TERTIARY }}>
              <input type="checkbox" aria-label="Rapport d'intervention prévu"
                checked={rapportPrevu}
                onChange={e => dispatch({ type: 'field', name: 'rapportPrevu', value: e.target.checked })}
                className="size-4 rounded cursor-pointer" />
              <span className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
                Rapport d'intervention prévu
              </span>
            </label>
          )}

          {/* Nouvelle date planifiée — uniquement si reporté */}
          {status === 'reporte' && (
            <label className="block mb-3">
              <span className="text-xs font-medium mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Nouvelle date prévue *</span>
              <input type="date" value={newPlannedDate} onChange={e => dispatch({ type: 'field', name: 'newPlannedDate', value: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
            </label>
          )}

          {/* Nappe — uniquement eau souterraine */}
          {isSouterraine && (
            <div className="block mb-3">
              <label htmlFor="nappe-select" className="text-xs font-medium mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Nappe</label>
              <select id="nappe-select" aria-label="nappe" value={nappe} onChange={e => dispatch({ type: 'field', name: 'nappe', value: e.target.value as NappeType })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
                <option value="">—</option>
                <option value="haute">Haute</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          )}

          {/* Motif (requis si non_effectue) */}
          {status === 'non_effectue' && (
            <label className="block mb-3">
              <span className="text-xs font-medium mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Motif *</span>
              <input type="text" value={motif} onChange={e => dispatch({ type: 'field', name: 'motif', value: e.target.value })}
                placeholder="Accès impossible, conditions météo..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
            </label>
          )}

          {/* Commentaire */}
          <label className="block mb-4">
            <span className="text-xs font-medium mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Commentaire (optionnel)</span>
            <textarea value={commentaire} onChange={e => dispatch({ type: 'field', name: 'commentaire', value: e.target.value })} rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ border: '1px solid var(--color-border)', background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          </label>

          {error && <p className="text-xs mb-3" style={{ color: COLORS.DANGER }}>{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} aria-label="Annuler"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
              Annuler
            </button>
            <button type="button" onClick={handleConfirm} aria-label="Valider"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Enregistrement…' : 'Valider'}
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  )
}
