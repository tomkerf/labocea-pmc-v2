import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudRain } from 'lucide-react'
import { daysDiff } from '@/lib/dashboardUtils'
import type { Maintenance, Equipement } from '@/types'
import type { RapportItem, RetardItem, PluieItem } from '@/hooks/useDashboardStats'
import { SectionTitle } from '@/components/dashboard/StatCard'

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

type TabKey = 'rapports' | 'retards' | 'pluie' | 'maintenances' | 'metrologie'
type Tone = 'danger' | 'warning' | 'accent'

const TONE_CLASSES: Record<Tone, { pillBg: string; pillText: string; badgeSelectedBg: string; badgeSelectedText: string }> = {
  danger:  { pillBg: 'bg-[var(--color-danger-light)]',  pillText: 'text-[var(--color-danger)]',  badgeSelectedBg: 'bg-[var(--color-danger-light)]',  badgeSelectedText: 'text-[var(--color-danger)]' },
  warning: { pillBg: 'bg-[var(--color-warning-light)]', pillText: 'text-[var(--color-warning)]', badgeSelectedBg: 'bg-[var(--color-warning-light)]', badgeSelectedText: 'text-[var(--color-warning)]' },
  accent:  { pillBg: 'bg-[var(--color-accent-light)]',  pillText: 'text-[var(--color-accent)]',  badgeSelectedBg: 'bg-[var(--color-accent-light)]',  badgeSelectedText: 'text-[var(--color-accent)]' },
}

function Row({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 w-full text-left border-b border-[var(--color-border-subtle)] last:border-b-0 transition-colors ${onClick ? 'cursor-pointer hover:bg-[var(--color-bg-tertiary)]' : ''}`}
    >
      {children}
    </Tag>
  )
}

function Dot({ color }: { color: string }) {
  return <span className="shrink-0 size-2 rounded-full mt-0.5" style={{ background: color }} />
}

interface ATraiterWidgetProps {
  rapports: RapportItem[]
  onMarkEnvoye: (clientId: string, planId: string, samplingId: string) => void
  retards: RetardItem[]
  pluie: PluieItem[]
  maintenances: Maintenance[]
  metrologie: Equipement[]
}

export function ATraiterWidget({ rapports, onMarkEnvoye, retards, pluie, maintenances, metrologie }: ATraiterWidgetProps) {
  const navigate = useNavigate()

  const tabs = useMemo(() => {
    const rapportsEnRetard = rapports.some(r => r.enRetard)
    const metrologieEnRetard = metrologie.some(eq => eq.prochainEtalonnage && daysDiff(eq.prochainEtalonnage.split('T')[0]) < 0)
    return [
      { key: 'rapports' as TabKey,     label: 'Rapports',     count: rapports.length,     tone: (rapportsEnRetard ? 'danger' : 'warning') as Tone },
      { key: 'retards' as TabKey,      label: 'Retards',      count: retards.length,      tone: 'danger' as Tone },
      { key: 'pluie' as TabKey,        label: 'Pluie',         count: pluie.length,        tone: 'accent' as Tone },
      { key: 'maintenances' as TabKey, label: 'Maintenances', count: maintenances.length, tone: 'accent' as Tone },
      { key: 'metrologie' as TabKey,   label: 'Métrologie',   count: metrologie.length,   tone: (metrologieEnRetard ? 'danger' : 'warning') as Tone },
    ].filter(t => t.count > 0)
  }, [rapports, retards, pluie, maintenances, metrologie])

  const defaultTab = useMemo((): TabKey | null => {
    if (retards.length > 0) return 'retards'
    if (rapports.some(r => r.enRetard)) return 'rapports'
    if (metrologie.some(eq => eq.prochainEtalonnage && daysDiff(eq.prochainEtalonnage.split('T')[0]) < 0)) return 'metrologie'
    return tabs[0]?.key ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [activeTab, setActiveTab] = useState<TabKey | null>(defaultTab)
  const totalCount = rapports.length + retards.length + pluie.length + maintenances.length + metrologie.length

  if (tabs.length === 0 || !activeTab) return null

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <SectionTitle>
          <>À traiter <span className="text-[var(--color-text-tertiary)] normal-case font-medium">· {totalCount} élément{totalCount > 1 ? 's' : ''}</span></>
        </SectionTitle>
      </div>

      <div className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
        <div className="flex gap-1 px-2.5 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] overflow-x-auto">
          {tabs.map(tab => {
            const selected = tab.key === activeTab
            const t = TONE_CLASSES[tab.tone]
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-selected={selected}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selected ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {tab.label}
                <b className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selected ? `${t.badgeSelectedBg} ${t.badgeSelectedText}` : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}>
                  {tab.count}
                </b>
              </button>
            )
          })}
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {activeTab === 'rapports' && rapports.map(r => {
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const fmtDone = new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
            const joursAvant = r.rapportDatePrevue ? Math.floor((new Date(r.rapportDatePrevue).getTime() - today.getTime()) / 86400000) : null
            const dotColor = joursAvant === null ? 'var(--color-neutral)' : joursAvant < 0 ? 'var(--color-danger)' : joursAvant <= 7 ? 'var(--color-warning)' : 'var(--color-success)'
            const tone: Tone = joursAvant === null ? 'accent' : joursAvant < 0 ? 'danger' : joursAvant <= 7 ? 'warning' : 'accent'
            const tagLabel = joursAvant === null ? '—' : joursAvant < 0 ? `${Math.abs(joursAvant)}j de retard` : joursAvant === 0 ? "aujourd'hui" : `dans ${joursAvant}j`
            const t = TONE_CLASSES[tone]
            return (
              <Row key={r.samplingId}>
                <Dot color={dotColor} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{r.clientNom}</p>
                  <p className="text-xs truncate text-[var(--color-text-secondary)]">
                    {r.siteNom === r.planNom ? r.siteNom : [r.siteNom, r.planNom].filter(Boolean).join(' · ')} · intervention {fmtDone}
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.pillBg} ${t.pillText}`}>{tagLabel}</span>
                <button type="button"
                  onClick={() => onMarkEnvoye(r.clientId, r.planId, r.samplingId)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent-light)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  Rédigé ✓
                </button>
              </Row>
            )
          })}

          {activeTab === 'retards' && retards.map(r => (
            <Row key={r.samplingId} onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}`)}>
              <Dot color="var(--color-danger)" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{r.clientNom}</p>
                <p className="text-xs truncate text-[var(--color-text-secondary)]">{[r.siteNom, r.planNom].filter(Boolean).join(' · ')}</p>
              </div>
              {r.meteo === 'pluie' && <CloudRain size={15} strokeWidth={1.7} className="shrink-0 text-[var(--color-accent)]" />}
              <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-danger-light)] text-[var(--color-danger)]">En retard</span>
            </Row>
          ))}

          {activeTab === 'pluie' && pluie.map(r => (
            <Row key={r.samplingId} onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}`)}>
              <CloudRain size={15} strokeWidth={1.7} className="shrink-0 text-[var(--color-accent)]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{r.clientNom}</p>
                <p className="text-xs truncate text-[var(--color-text-secondary)]">{[r.siteNom, r.planNom].filter(Boolean).join(' · ')}</p>
              </div>
              <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${r.overdue ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}>
                {r.plannedDay > 0 ? `${r.overdue ? '⚠ ' : ''}${MOIS_COURT[r.plannedMonth]} j${r.plannedDay}` : MOIS_COURT[r.plannedMonth]}
              </span>
            </Row>
          ))}

          {activeTab === 'maintenances' && maintenances.map(m => {
            const enCours = m.statut === 'en_cours'
            const enRetard = m.statut === 'planifiee' && daysDiff(m.datePrevue) < 0
            const dotColor = enCours ? 'var(--color-accent)' : enRetard ? 'var(--color-danger)' : 'var(--color-warning)'
            const tone: Tone = enCours ? 'accent' : enRetard ? 'danger' : 'warning'
            const label = enCours ? 'En cours' : enRetard ? 'En retard' : `Dans ${daysDiff(m.datePrevue)}j`
            const typeLabel = m.type === 'preventive' ? 'Préventive' : m.type === 'corrective' ? 'Corrective' : 'Panne'
            const t = TONE_CLASSES[tone]
            return (
              <Row key={m.id} onClick={() => navigate(`/maintenances/${m.id}`)}>
                <Dot color={dotColor} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{m.equipementNom || '—'}</p>
                  <p className="text-xs truncate text-[var(--color-text-secondary)]">{typeLabel}{m.description ? ` · ${m.description}` : ''}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.pillBg} ${t.pillText}`}>{label}</span>
              </Row>
            )
          })}

          {activeTab === 'metrologie' && metrologie.map(eq => {
            if (!eq.prochainEtalonnage) return null
            const diff = daysDiff(eq.prochainEtalonnage.split('T')[0])
            const enRetard = diff < 0
            const tone: Tone = enRetard ? 'danger' : 'warning'
            const label = enRetard ? 'En retard' : diff === 0 ? "Aujourd'hui" : `Dans ${diff}j`
            const t = TONE_CLASSES[tone]
            return (
              <Row key={eq.id} onClick={() => navigate(`/materiel/${eq.id}`)}>
                <Dot color={enRetard ? 'var(--color-danger)' : 'var(--color-warning)'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{eq.nom}</p>
                  <p className="text-xs truncate text-[var(--color-text-secondary)]">{eq.marque} {eq.modele} — {eq.numSerie}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.pillBg} ${t.pillText}`}>{label}</span>
              </Row>
            )
          })}
        </div>
      </div>
    </div>
  )
}
