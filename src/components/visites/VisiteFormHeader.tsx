import { ArrowLeft, FileText } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface VisiteFormHeaderProps {
  isNew: boolean
  linkedNom: string
  onBack: () => void
  onExport: () => void
}

export default function VisiteFormHeader({ isNew, linkedNom, onBack, onExport }: VisiteFormHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button type="button" onClick={onBack} aria-label="Retour" className="p-1.5 rounded-lg"
        style={{ color: COLORS.TEXT_SECONDARY }}>
        <ArrowLeft size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
          {isNew ? 'Nouvelle visite préliminaire' : 'Visite préliminaire'}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{linkedNom}</p>
      </div>
      {!isNew && (
        <button type="button" onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_SECONDARY }}>
          <FileText size={14} />
          Exporter
        </button>
      )}
    </div>
  )
}
