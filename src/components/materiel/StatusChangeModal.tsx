import { useState } from 'react'
import BaseModal from '@/components/ui/BaseModal'
import { COLORS } from '@/lib/constants'

interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  newLabel: string
}

export function StatusChangeModal({ isOpen, onClose, onConfirm, newLabel }: StatusChangeModalProps) {
  const [reason, setReason] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm(reason)
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Passage en statut "${newLabel}"`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
          Souhaitez-vous ajouter un commentaire ou indiquer la raison de ce changement d'état ?
        </p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Joint fissuré, calibrage impossible..."
          className="w-full p-3 rounded-lg text-sm resize-none focus:outline-none"
          rows={3}
          style={{
            background: COLORS.BG_TERTIARY,
            border: '1px solid var(--color-border)',
            color: COLORS.TEXT_PRIMARY
          }}
          onFocus={(e) => (e.target.style.borderColor = COLORS.ACCENT)}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
        <div className="flex gap-3 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
            style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-border-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ background: COLORS.ACCENT, color: 'white' }}
          >
            Confirmer
          </button>
        </div>
      </form>
    </BaseModal>
  )
}
