import { useState } from 'react'
import { Check, PlusCircle } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { FrequenceType } from '@/types'

const FREQUENCES: FrequenceType[] = ['Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Personnalisé']

interface CreatePlanInlineProps {
  idSuffix: string
  pointNom: string
  onCreate: (frequence: FrequenceType, siteNom: string) => void
}

export default function CreatePlanInline({ idSuffix, pointNom, onCreate }: CreatePlanInlineProps) {
  const [expanded, setExpanded] = useState(false)
  const [frequence, setFrequence] = useState<FrequenceType>('Annuel')
  const [siteNom, setSiteNom] = useState('')

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-xs font-medium"
        style={{ color: COLORS.ACCENT }}>
        <PlusCircle size={13} /> Créer un point de prélèvement
      </button>
    )
  }

  return (
    <div className="p-3 rounded-xl flex flex-col gap-2"
      style={{ background: 'var(--color-accent-light)', border: `1px solid ${COLORS.ACCENT}33` }}>
      <p className="text-xs font-semibold" style={{ color: COLORS.ACCENT }}>Nouveau point : {pointNom || '…'}</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={`cpi-freq-${idSuffix}`} className="block text-xs mb-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>Fréquence</label>
          <select id={`cpi-freq-${idSuffix}`} value={frequence} onChange={e => setFrequence(e.target.value as FrequenceType)} className="field-input w-full text-sm">
            {FREQUENCES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor={`cpi-site-${idSuffix}`} className="block text-xs mb-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>Site</label>
          <input id={`cpi-site-${idSuffix}`} value={siteNom} onChange={e => setSiteNom(e.target.value)} className="field-input w-full text-sm" placeholder="Moreac, Brest…" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setExpanded(false)}
          className="text-xs px-3 py-1.5 rounded-lg" style={{ color: COLORS.TEXT_SECONDARY, background: COLORS.BG_TERTIARY }}>
          Annuler
        </button>
        <button type="button"
          onClick={() => { onCreate(frequence, siteNom); setExpanded(false) }}
          className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
          style={{ background: COLORS.ACCENT, color: 'white' }}>
          <Check size={12} /> Créer
        </button>
      </div>
    </div>
  )
}
