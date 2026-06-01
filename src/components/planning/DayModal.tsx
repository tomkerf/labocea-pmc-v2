import { useState } from 'react'
import { ChevronDown, X, Plus } from 'lucide-react'
import { createEvenement } from '@/services/evenementService'
import { isSamplingOverdue } from '@/lib/overdue'
import { SAMPLING_LABEL, isVeilleJourFerie } from '@/lib/planningUtils'
import type { PoolItem } from '@/lib/planningUtils'
import type { TypeEvenement } from '@/types'

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

const EVENEMENT_TYPES: { value: TypeEvenement; label: string; emoji: string }[] = [
  { value: 'rappel',  label: 'Rappel',    emoji: '🔔' },
  { value: 'reunion', label: 'Réunion',   emoji: '👥' },
  { value: 'rapport', label: 'Rapport',   emoji: '📋' },
  { value: 'conge',   label: 'Congé/RTT', emoji: '🏖️' },
  { value: 'autre',   label: 'Autre',     emoji: '📌' },
]

export default function DayModal({
  dateStr, onClose, pool, overduePool, uid, initiales, onValidatePool, initialTab, holidays,
}: DayModalProps) {
  const [activeTab,   setActiveTab]   = useState<'pool' | 'evt'>(initialTab ?? 'pool')
  const [poolValidId, setPoolValidId] = useState<string | null>(null)
  const [poolDate,    setPoolDate]    = useState(dateStr)
  const [poolSaving,  setPoolSaving]  = useState(false)
  const [evtTitre,    setEvtTitre]    = useState('')
  const [evtType,     setEvtType]     = useState<TypeEvenement>('rappel')
  const [evtHeure,    setEvtHeure]    = useState('')
  const [evtNotes,    setEvtNotes]    = useState('')
  const [evtSaving,   setEvtSaving]   = useState(false)
  const [openGroups,  setOpenGroups]  = useState<Record<string, boolean>>({
    'En retard': false, 'Planifié': false, 'À planifier': false,
  })

  const date     = new Date(dateStr + 'T12:00:00')
  const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  async function handleValidatePool(item: PoolItem) {
    if (poolSaving) return
    setPoolSaving(true)
    try { await onValidatePool(item, poolDate); setPoolValidId(null) }
    finally { setPoolSaving(false) }
  }

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

  const totalPool = pool.length + overduePool.filter(x => !pool.some(p => p.sampling.id === x.sampling.id)).length
  const TABS = [
    { id: 'pool' as const, label: 'Interventions à planifier', count: totalPool },
    { id: 'evt'  as const, label: 'Événement',                 count: 0 },
  ]

  return (
    <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-lg flex flex-col overflow-hidden rounded-t-[20px] md:rounded-2xl"
        style={{ background: 'var(--color-bg-primary)', maxHeight: '88vh', boxShadow: 'var(--shadow-modal)' }}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Header : date + fermer */}
        <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="flex-1 text-base font-semibold capitalize" style={{ color: 'var(--color-text-primary)' }}>
            {dayLabel}
          </p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)' }}>
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
                background: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
              }}>
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] font-bold size-4 flex items-center justify-center rounded-full"
                  style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--color-border)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu — onglet Événement */}
        {activeTab === 'evt' && (
          <div className="px-4 py-4 space-y-3 flex-1 overflow-y-auto">
            <input
              autoFocus
              aria-label="Titre de l'événement"
              placeholder={evtType === 'conge' ? 'Titre (optionnel)' : 'Titre de l\'événement'}
              value={evtTitre}
              onChange={e => setEvtTitre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateEvt()}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{
                background: 'var(--color-bg-secondary)',
                border: `1px solid ${evtType === 'conge' && !evtTitre.trim() ? 'var(--color-border-subtle)' : 'var(--color-border)'}`,
                color: 'var(--color-text-primary)',
                opacity: evtType === 'conge' && !evtTitre.trim() ? 0.6 : 1,
              }} />
            <div className="grid grid-cols-5 gap-1.5">
              {EVENEMENT_TYPES.map(t => (
                <button type="button" key={t.value} onClick={() => setEvtType(t.value)}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-medium"
                  style={{
                    background: evtType === t.value ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
                    color: evtType === t.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    border: `1px solid ${evtType === t.value ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                  }}>
                  <span className="text-base">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <input type="time" value={evtHeure} onChange={e => setEvtHeure(e.target.value)}
              aria-label="Heure de l'événement"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            <textarea rows={2} aria-label="Notes de l'événement" placeholder="Notes (optionnel)" value={evtNotes} onChange={e => setEvtNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            {(() => {
              const canCreate = evtType === 'conge' ? true : !!evtTitre.trim()
              return (
                <button type="button" onClick={handleCreateEvt} disabled={!canCreate || evtSaving}
                  className="w-full py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: canCreate ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: canCreate ? 'white' : 'var(--color-text-tertiary)',
                  }}>
                  {evtSaving ? 'Enregistrement…' : 'Créer l\'événement'}
                </button>
              )
            })()}
          </div>
        )}

        {/* Contenu scrollable — onglet pool */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            {activeTab === 'pool' && (
              pool.length === 0 && overduePool.length === 0 ? (
                <div className="rounded-xl py-8 text-center"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Tout est planifié ce mois ✓</p>
                </div>
              ) : (() => {
                const overdueIds = new Set(overduePool.map(x => x.sampling.id))
                const planifie   = pool.filter(x => x.sampling.plannedDay > 0 && !overdueIds.has(x.sampling.id))
                const aplanifier = pool.filter(x => x.sampling.plannedDay === 0 && !overdueIds.has(x.sampling.id))
                type Group = { label: string; items: typeof pool }
                const groups: Group[] = [
                  { label: 'En retard',   items: overduePool },
                  { label: 'Planifié',    items: planifie },
                  { label: 'À planifier', items: aplanifier },
                ].filter(g => g.items.length > 0)

                const renderItem = (item: typeof pool[0], i: number, groupItems: typeof pool) => {
                  const overdue  = isSamplingOverdue(item.sampling)
                  const cfgLabel = overdue ? SAMPLING_LABEL.overdue : SAMPLING_LABEL[item.sampling.status] ?? SAMPLING_LABEL.planned
                  const cfgColor = overdue ? 'var(--color-danger)'
                    : item.sampling.status === 'non_effectue' ? 'var(--color-warning)'
                    : item.sampling.status === 'done' ? 'var(--color-success)'
                    : 'var(--color-text-secondary)'
                  const cfgBg = overdue ? 'var(--color-danger-light)'
                    : item.sampling.status === 'non_effectue' ? 'var(--color-warning-light)'
                    : item.sampling.status === 'done' ? 'var(--color-success-light)'
                    : 'var(--color-bg-tertiary)'
                  const cfg = { label: cfgLabel, color: cfgColor, bg: cfgBg }
                  const isValidating = poolValidId === item.sampling.id
                  return (
                    <div key={item.sampling.id}
                      style={{ borderBottom: i < groupItems.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                      <button type="button"
                        aria-label={isValidating ? 'Annuler la planification' : `Planifier : ${item.clientNom}`}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                        onClick={() => isValidating
                          ? setPoolValidId(null)
                          : (setPoolValidId(item.sampling.id), setPoolDate(dateStr))
                        }>
                        <span className="size-2 rounded-full shrink-0 mt-0.5" style={{ background: cfg.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {item.clientNom}
                          </p>
                          <p className="text-xs mt-0.5 truncate flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="truncate">{item.planNom}{item.siteNom ? ` · ${item.siteNom}` : ''}
                            {item.frequence && (
                              <span className="ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                — {item.frequence}
                              </span>
                            )}</span>
                            {item.cofrac && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                                COFRAC
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                            {item.techInitiales && item.techInitiales !== '—' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                {item.techInitiales}
                              </span>
                            )}
                            {item.sampling.plannedDay > 0 && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                                prévu j{item.sampling.plannedDay}
                              </span>
                            )}
                            {item.meteo === 'pluie' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: '#EFF6FF', color: '#3B82F6' }}
                                title="Prélèvement à réaliser par temps de pluie">
                                🌧 Pluie
                              </span>
                            )}
                            {item.analysesSousTraitees && isVeilleJourFerie(dateStr) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}
                                title={`Analyses sous-traitées — veille de ${isVeilleJourFerie(dateStr)}`}>
                                ⚠️ Veille de férié
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 size-7 flex items-center justify-center rounded-full transition-colors"
                          style={{
                            background: isValidating ? 'var(--color-bg-tertiary)' : 'var(--color-success-light)',
                            border: isValidating ? '1px solid var(--color-border)' : 'none',
                          }}>
                          {isValidating
                            ? <X size={13} style={{ color: 'var(--color-text-secondary)' }} />
                            : <Plus size={13} style={{ color: 'var(--color-success)' }} />
                          }
                        </span>
                      </button>
                      {isValidating && (() => {
                        const poolHoliday = holidays[poolDate]
                        return (
                          <div className="px-4 py-3 flex flex-col gap-2"
                            style={{ background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
                            <div className="flex items-end gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  Planifier le
                                </label>
                                <input type="date" value={poolDate} onChange={e => setPoolDate(e.target.value)}
                                  aria-label="Date de planification"
                                  className="w-full px-3 py-2 rounded-lg text-sm"
                                  style={{
                                    background: 'var(--color-bg-secondary)',
                                    border: `1px solid ${poolHoliday ? 'var(--color-danger)' : 'var(--color-border)'}`,
                                    color: 'var(--color-text-primary)',
                                  }} />
                              </div>
                              <button type="button" onClick={() => handleValidatePool(item)} disabled={poolSaving || !poolDate || !!poolHoliday}
                                className="px-4 py-2 rounded-lg text-sm font-medium"
                                style={{
                                  background: poolHoliday ? 'var(--color-bg-tertiary)' : 'var(--color-success)',
                                  color: poolHoliday ? 'var(--color-text-tertiary)' : 'white',
                                  opacity: poolSaving ? 0.6 : 1,
                                  cursor: poolHoliday ? 'not-allowed' : 'pointer',
                                }}>
                                {poolSaving ? '…' : 'Confirmer'}
                              </button>
                            </div>
                            {poolHoliday && (
                              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-danger)' }}>
                                <span>⛔</span>
                                <span>{poolHoliday} — planification impossible sur un jour férié.</span>
                              </p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                }

                return (
                  <div className="flex flex-col gap-4">
                    {groups.map(group => {
                      const isOpen = openGroups[group.label] !== false
                      return (
                        <div key={group.label}>
                          <button type="button"
                            className="w-full flex items-center justify-between px-1 py-1 mb-1.5"
                            onClick={() => setOpenGroups(prev => ({ ...prev, [group.label]: !isOpen }))}>
                            <p className="text-[11px] font-semibold uppercase tracking-wider"
                              style={{ color: group.label === 'En retard' ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}>
                              {group.label} · {group.items.length}
                            </p>
                            <ChevronDown size={14}
                              style={{
                                color: 'var(--color-text-tertiary)',
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 200ms ease',
                              }} />
                          </button>
                          {isOpen && (
                            <div style={{ position: 'relative' }}>
                              <div className="overflow-y-auto rounded-xl"
                                style={{
                                  maxHeight: '35vh',
                                  background: 'var(--color-bg-secondary)',
                                  border: '1px solid var(--color-border-subtle)',
                                  boxShadow: 'var(--shadow-card)',
                                }}>
                                {group.items.map((item, i) => renderItem(item, i, group.items))}
                              </div>
                              {group.items.length > 3 && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: 1, left: 1, right: 1,
                                  height: 48,
                                  background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.95))',
                                  borderRadius: '0 0 11px 11px',
                                  pointerEvents: 'none',
                                }} />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
