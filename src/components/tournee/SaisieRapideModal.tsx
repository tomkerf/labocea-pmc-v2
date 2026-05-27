// src/components/tournee/SaisieRapideModal.tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { NappeType } from '@/types'

export interface SaisieRapideData {
  status: 'done' | 'non_effectue' | 'reporte'
  doneDate: string
  nappe: NappeType
  commentaire: string
  motif: string
  newPlannedDate: string
}

interface Props {
  clientNom: string
  siteNom: string
  nature: string
  initialStatus: 'done' | 'non_effectue'
  onConfirm: (data: SaisieRapideData) => void
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export function SaisieRapideModal({ clientNom, siteNom, nature, initialStatus, onConfirm, onClose }: Props) {
  const [status, setStatus]           = useState<'done' | 'non_effectue' | 'reporte'>(initialStatus)
  const [doneDate, setDoneDate]       = useState(todayISO())
  const [newPlannedDate, setNewPlannedDate] = useState(todayISO())
  const [nappe, setNappe]             = useState<NappeType>('')
  const [commentaire, setCommentaire] = useState('')
  const [motif, setMotif]             = useState('')
  const [error, setError]             = useState('')

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
    onConfirm({ status, doneDate, nappe, commentaire, motif: motif.trim(), newPlannedDate })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full rounded-t-2xl px-6 pt-5 pb-10 md:rounded-2xl md:max-w-lg md:pb-6"
          style={{ background: 'var(--color-bg-secondary)' }}
          onClick={e => e.stopPropagation()}>

          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--color-border)' }} />

          <p className="text-base font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{clientNom}</p>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>{siteNom}</p>

          {/* Statut */}
          <div className="flex gap-2 mb-4">
            {(['done', 'non_effectue', 'reporte'] as const).map(s => {
              const labels = { done: 'Réalisé', non_effectue: 'Non effectué', reporte: 'Reporter' }
              const activeColors = {
                done:         { bg: 'var(--color-success-light)',  text: 'var(--color-success)' },
                non_effectue: { bg: 'var(--color-warning-light)',  text: 'var(--color-warning)' },
                reporte:      { bg: 'var(--color-accent-light)',   text: 'var(--color-accent)'  },
              }
              const isActive = status === s
              return (
                <button key={s}
                  onClick={() => setStatus(s)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isActive ? activeColors[s].bg : 'var(--color-bg-tertiary)',
                    color:      isActive ? activeColors[s].text : 'var(--color-text-secondary)',
                  }}>
                  {labels[s]}
                </button>
              )
            })}
          </div>

          {/* Date réalisée — uniquement si done */}
          {status === 'done' && (
            <label className="block mb-3">
              <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Date réalisée</span>
              <input type="date" value={doneDate} onChange={e => setDoneDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} />
            </label>
          )}

          {/* Nouvelle date planifiée — uniquement si reporté */}
          {status === 'reporte' && (
            <label className="block mb-3">
              <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Nouvelle date prévue *</span>
              <input type="date" value={newPlannedDate} onChange={e => setNewPlannedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} />
            </label>
          )}

          {/* Nappe — uniquement eau souterraine */}
          {isSouterraine && (
            <div className="block mb-3">
              <label htmlFor="nappe-select" className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Nappe</label>
              <select id="nappe-select" aria-label="nappe" value={nappe} onChange={e => setNappe(e.target.value as NappeType)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                <option value="">—</option>
                <option value="haute">Haute</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          )}

          {/* Motif (requis si non_effectue) */}
          {status === 'non_effectue' && (
            <label className="block mb-3">
              <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Motif *</span>
              <input type="text" value={motif} onChange={e => setMotif(e.target.value)}
                placeholder="Accès impossible, conditions météo..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} />
            </label>
          )}

          {/* Commentaire */}
          <label className="block mb-4">
            <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Commentaire (optionnel)</span>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} />
          </label>

          {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} aria-label="Annuler"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              Annuler
            </button>
            <button onClick={handleConfirm} aria-label="Valider"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white' }}>
              Valider
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
