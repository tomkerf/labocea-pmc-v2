import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Clock, FileText, CloudRain, FlaskConical } from 'lucide-react'
import { isSamplingIncomplet, isSamplingOverdue } from '@/lib/overdue'
import { useUsersStore } from '@/stores/usersStore'
import type { Client, Sampling, NatureEauType } from '@/types'
import { StatCard, SectionTitle } from '@/components/dashboard/StatCard'


interface IncompletItem {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  planNom: string
  doneDate: string
  champManquant: string
  doneBy: string
  preleveur: string
}

interface EnRetardItem {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  planNom: string
  plannedMonth: number
  plannedDay: number
  preleveur: string
  meteo: string
}

interface RapportDuItem {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  planNom: string
  doneDate: string
  doneBy: string
  preleveur: string
}

function getChampManquant(s: Sampling, nature: NatureEauType): string {
  if (!s.doneDate) return 'Date manquante'
  if (!s.doneBy) return 'Technicien manquant'
  if (nature === 'Souterraine') {
    const isPeriodeNappe = [0, 1, 2, 8, 9, 10].includes(s.plannedMonth)
    if (isPeriodeNappe && !s.nappe) return 'Nappe manquante'
  }
  return ''
}

interface Props {
  clients: Client[]
}

type TabKey = 'retards' | 'incomplets' | 'rapports'
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

export function EquipeSuiviWidget({ clients }: Props) {
  const navigate = useNavigate()
  const users = useUsersStore(state => state.users)

  const resolveInitials = (uid: string, fallbackInitials?: string) => {
    if (!uid) return fallbackInitials || '—'
    const u = users.find(user => user.uid === uid)
    return u ? u.initiales : (fallbackInitials || '—')
  }

  const { kpis, incomplets, enRetardList, rapportsDusList } = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10)
    let realises = 0
    let enRetard = 0
    let rapportsDus = 0
    let moisTotal = 0
    let moisDone = 0
    const moisCourant = new Date().getMonth()
    const incompletsList: IncompletItem[] = []
    const enRetardListItems: EnRetardItem[] = []
    const rapportsDusListItems: RapportDuItem[] = []

    const currentYear = String(new Date().getFullYear())
    for (const client of clients) {
      if (client.annee && client.annee !== currentYear) continue
      const year = parseInt(client.annee ?? currentYear)
      for (const plan of client.plans) {
        for (const s of plan.samplings) {
          if (s.plannedMonth === moisCourant) {
            moisTotal++
            if (s.status === 'done') moisDone++
          }
          if (s.status === 'done') {
            realises++
            if (isSamplingIncomplet(s, plan.nature)) {
              incompletsList.push({
                samplingId: s.id,
                clientId: client.id,
                planId: plan.id,
                clientNom: client.nom,
                siteNom: plan.siteNom,
                planNom: plan.nom,
                doneDate: s.doneDate,
                champManquant: getChampManquant(s, plan.nature),
                doneBy: s.doneBy || '',
                preleveur: s.assignedTo || client.preleveur || '—',
              })
            }
          }
          if (isSamplingOverdue(s, year, plan.methode === 'Automatique')) {
            enRetard++
            enRetardListItems.push({
              samplingId: s.id,
              clientId: client.id,
              planId: plan.id,
              clientNom: client.nom,
              siteNom: plan.siteNom,
              planNom: plan.nom,
              plannedMonth: s.plannedMonth,
              plannedDay: s.plannedDay,
              preleveur: s.assignedTo || client.preleveur || '—',
              meteo: plan.meteo || '',
            })
          }
          const rapportEnvoye = s.rapportDate && s.rapportDate <= todayISO
          if (s.status === 'done' && s.rapportPrevu && !rapportEnvoye) {
            rapportsDus++
            rapportsDusListItems.push({
              samplingId: s.id,
              clientId: client.id,
              planId: plan.id,
              clientNom: client.nom,
              siteNom: plan.siteNom,
              planNom: plan.nom,
              doneDate: s.doneDate || '',
              doneBy: s.doneBy || '',
              preleveur: s.assignedTo || client.preleveur || '—',
            })
          }
        }
      }
    }

    incompletsList.sort((a, b) => b.doneDate.localeCompare(a.doneDate))
    enRetardListItems.sort((a, b) => a.plannedMonth - b.plannedMonth || a.plannedDay - b.plannedDay)
    rapportsDusListItems.sort((a, b) => b.doneDate.localeCompare(a.doneDate))

    return {
      kpis: { realises, incomplets: incompletsList.length, enRetard, rapportsDus, moisTotal, moisDone },
      incomplets: incompletsList,
      enRetardList: enRetardListItems,
      rapportsDusList: rapportsDusListItems,
    }
  }, [clients])

  const tabs = useMemo(() => {
    return [
      { key: 'retards' as TabKey,      label: 'Retards',      count: enRetardList.length,  tone: 'danger' as Tone },
      { key: 'incomplets' as TabKey,   label: 'Incomplets',   count: incomplets.length,    tone: 'warning' as Tone },
      { key: 'rapports' as TabKey,     label: 'Rapports dus', count: rapportsDusList.length, tone: 'accent' as Tone },
    ].filter(t => t.count > 0)
  }, [enRetardList, incomplets, rapportsDusList])

  const autoTab = useMemo((): TabKey | null => {
    if (enRetardList.length > 0) return 'retards'
    if (incomplets.length > 0) return 'incomplets'
    if (rapportsDusList.length > 0) return 'rapports'
    return tabs[0]?.key ?? null
  }, [enRetardList, incomplets, rapportsDusList, tabs])

  const [userPickedTab, setUserPickedTab] = useState<TabKey | null>(null)
  const activeTab = userPickedTab && tabs.some(t => t.key === userPickedTab)
    ? userPickedTab
    : autoTab

  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({})

  function handleTablistKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex(t => t.key === activeTab)
    if (currentIndex === -1) return
    let nextIndex: number | null = null
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') nextIndex = 0
    else if (e.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === null) return
    e.preventDefault()
    const nextTab = tabs[nextIndex]
    setUserPickedTab(nextTab.key)
    tabRefs.current[nextTab.key]?.focus()
  }

  const totalCount = enRetardList.length + incomplets.length + rapportsDusList.length

  if (incomplets.length === 0 && enRetardList.length === 0 && rapportsDusList.length === 0) return null

  return (
    <div className="mb-6 animate-fade-in space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<CheckCircle2 size={16} strokeWidth={1.6} />}
          value={kpis.realises}
          label="Réalisés"
          sub="Faits sur l'année"
          tone="success"
        />
        <StatCard
          icon={<FlaskConical size={16} strokeWidth={1.6} />}
          value={kpis.moisDone}
          label="Missions ce mois"
          sub={kpis.moisTotal > 0 ? `${kpis.moisDone}/${kpis.moisTotal} ce mois` : 'Équipe'}
          tone="accent"
          progressPct={kpis.moisTotal > 0 ? Math.round((kpis.moisDone / kpis.moisTotal) * 100) : undefined}
          onClick={() => navigate('/missions/bilan?scope=equipe')}
        />
        <StatCard
          icon={<AlertCircle size={16} strokeWidth={1.6} />}
          value={kpis.incomplets}
          label="Incomplets"
          sub="Données manquantes"
          tone={kpis.incomplets > 0 ? 'warning' : 'success'}
          pill={kpis.incomplets > 0 ? `${kpis.incomplets} à corriger` : undefined}
        />
        <StatCard
          icon={<Clock size={16} strokeWidth={1.6} />}
          value={kpis.enRetard}
          label="En retard"
          sub="Échéances dépassées"
          tone={kpis.enRetard > 0 ? 'danger' : 'accent'}
          pill={kpis.enRetard > 0 ? 'Urgent' : undefined}
        />
        <StatCard
          icon={<FileText size={16} strokeWidth={1.6} />}
          value={kpis.rapportsDus}
          label="Rapports dus"
          sub="Prévus non rédigés"
          tone={kpis.rapportsDus > 0 ? 'warning' : 'accent'}
          pill={kpis.rapportsDus > 0 ? `${kpis.rapportsDus} dus` : undefined}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <SectionTitle>
            <>À traiter (Équipe) <span className="text-[var(--color-text-tertiary)] normal-case font-medium">· {totalCount} élément{totalCount > 1 ? 's' : ''}</span></>
          </SectionTitle>
        </div>

        {tabs.length > 0 && activeTab && (
          <div className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
            <div
              role="tablist"
              aria-label="Catégories à traiter (Équipe)"
              onKeyDown={handleTablistKeyDown}
              className="flex gap-1 px-2.5 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] overflow-x-auto"
            >
              {tabs.map(tab => {
                const selected = tab.key === activeTab
                const t = TONE_CLASSES[tab.tone]
                return (
                  <button
                    key={tab.key}
                    ref={el => { tabRefs.current[tab.key] = el }}
                    type="button"
                    role="tab"
                    id={`tab-eq-${tab.key}`}
                    aria-controls={`panel-eq-${tab.key}`}
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setUserPickedTab(tab.key)}
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

            <div
              role="tabpanel"
              id={`panel-eq-${activeTab}`}
              aria-labelledby={`tab-eq-${activeTab}`}
              tabIndex={0}
              className="max-h-80 overflow-y-auto"
            >
              {activeTab === 'incomplets' && incomplets.map(item => (
                <Row key={item.samplingId} onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}>
                  <Dot color="var(--color-warning)" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{item.clientNom}</p>
                    <p className="text-xs truncate text-[var(--color-text-secondary)]">
                      {[item.siteNom, item.planNom].filter(Boolean).join(' · ')} · tech: {resolveInitials(item.doneBy, item.preleveur)}{item.doneDate ? ` · fait le ${new Date(item.doneDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)]">
                    {item.champManquant}
                  </span>
                </Row>
              ))}

              {activeTab === 'retards' && enRetardList.map(item => {
                const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
                const dateStr = item.plannedDay ? `prévu le ${item.plannedDay} ${months[item.plannedMonth]}` : `prévu en ${months[item.plannedMonth]}`
                return (
                  <Row key={item.samplingId} onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}>
                    <Dot color="var(--color-danger)" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{item.clientNom}</p>
                      <p className="text-xs truncate text-[var(--color-text-secondary)]">
                        {[item.siteNom, item.planNom].filter(Boolean).join(' · ')} · tech: {item.preleveur} · {dateStr}
                      </p>
                    </div>
                    {item.meteo === 'pluie' && <CloudRain size={15} strokeWidth={1.7} className="shrink-0 text-[var(--color-accent)]" />}
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-danger-light)] text-[var(--color-danger)]">
                      En retard
                    </span>
                  </Row>
                )
              })}

              {activeTab === 'rapports' && rapportsDusList.map(item => (
                <Row key={item.samplingId} onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}>
                  <Dot color="var(--color-accent)" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{item.clientNom}</p>
                    <p className="text-xs truncate text-[var(--color-text-secondary)]">
                      {[item.siteNom, item.planNom].filter(Boolean).join(' · ')} · tech: {resolveInitials(item.doneBy, item.preleveur)}{item.doneDate ? ` · fait le ${new Date(item.doneDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                    Rapport dû
                  </span>
                </Row>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
