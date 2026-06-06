import { COLORS } from '@/lib/constants'

interface VisiteGeneralFieldsProps {
  date: string
  technicienNom: string
  notes: string
  onDateChange: (v: string) => void
  onTechnicienChange: (v: string) => void
  onNotesChange: (v: string) => void
}

export default function VisiteGeneralFields({ date, technicienNom, notes, onDateChange, onTechnicienChange, onNotesChange }: VisiteGeneralFieldsProps) {
  return (
    <div className="rounded-xl p-5 mb-4"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="vf-date" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Date de visite</label>
          <input id="vf-date" type="date" value={date} onChange={e => onDateChange(e.target.value)}
            className="field-input w-full" />
        </div>
        <div>
          <label htmlFor="vf-technicien" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Technicien</label>
          <input id="vf-technicien" value={technicienNom} onChange={e => onTechnicienChange(e.target.value)}
            className="field-input w-full" placeholder="Prénom Nom" />
        </div>
        <div className="col-span-2">
          <label htmlFor="vf-notes" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Notes générales</label>
          <textarea id="vf-notes" value={notes} onChange={e => onNotesChange(e.target.value)}
            rows={2} className="field-input w-full resize-none"
            placeholder="Remarques générales sur le site…" />
        </div>
      </div>
    </div>
  )
}
