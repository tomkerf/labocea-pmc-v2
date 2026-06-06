import { useState } from 'react'
import { X } from 'lucide-react'
import type { PoolItem } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'
import DayModalEvtTab  from '@/components/planning/DayModalEvtTab'
import DayModalPoolTab from '@/components/planning/DayModalPoolTab'

export interface DayModalProps {
  dateStr: string
  onClose: () => void
  pool: PoolItem[]
  overduePool: PoolItem[]
  uid: string | null
  initiales: string
  onValidatePool: (item: PoolItem, date: string) => Promise<void>
  initialTab?: 'pool' | 'evt'
  holidays: Record<string, string>
}

const TABS = [
  { id: 'pool' as const, label: 'Interventions à planifier' },
  { id: 'evt'  as const, label: 'Événement' },
]

export default function DayModal({
  dateStr, onClose, pool, overduePool, uid, initiales, onValidatePool, initialTab, holidays,
}: DayModalProps) {
  const [activeTab, setActiveTab] = useState<'pool' | 'evt'>(initialTab ?? 'pool')

  const date     = new Date(dateStr + 'T12:00:00')
  const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const totalPool = pool.length + overduePool.filter(x => !pool.some(p => p.sampling.id === x.sampling.id)).length

  return (
    <div role="presentation" className="fixed inset-0 z-[55] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-lg flex flex-col overflow-hidden rounded-t-[20px] md:rounded-2xl"
        style={{ background: COLORS.BG_PRIMARY, maxHeight: '88vh', boxShadow: 'var(--shadow-modal)' }}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: COLORS.BORDER }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="flex-1 text-base font-semibold capitalize" style={{ color: COLORS.TEXT_PRIMARY }}>
            {dayLabel}
          </p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)', background: COLORS.BG_TERTIARY }}>
            <X size={16} />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex px-4 pt-3 pb-2.5 gap-1.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          {TABS.map(tab => (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: activeTab === tab.id ? COLORS.ACCENT : COLORS.BG_TERTIARY,
                color: activeTab === tab.id ? 'white' : COLORS.TEXT_SECONDARY,
              }}>
              {tab.label}
              {tab.id === 'pool' && totalPool > 0 && (
                <span className="text-[10px] font-bold size-4 flex items-center justify-center rounded-full"
                  style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : COLORS.BORDER }}>
                  {totalPool}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'evt' ? (
            <DayModalEvtTab
              dateStr={dateStr}
              uid={uid}
              initiales={initiales}
              onClose={onClose}
            />
          ) : (
            <DayModalPoolTab
              dateStr={dateStr}
              pool={pool}
              overduePool={overduePool}
              holidays={holidays}
              onValidatePool={onValidatePool}
            />
          )}
        </div>
      </div>
    </div>
  )
}
