import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { isSamplingIncomplet, isSamplingOverdue } from '@/lib/overdue'
import { useUsersStore } from '@/stores/usersStore'
import type { Client, Sampling, NatureEauType } from '@/types'

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

export function EquipeSuiviWidget({ clients }: Props) {
  const navigate = useNavigate()
  const [openIncomplets, setOpenIncomplets] = useState(false)
  const [openRetard, setOpenRetard] = useState(false)
  const [openRapports, setOpenRapports] = useState(false)
  const users = useUsersStore(state => state.users)

  const resolveInitials = (uid: string, fallbackInitials?: string) => {
    if (!uid) return fallbackInitials || '—'
    const u = users.find(user => user.uid === uid)
    return u ? u.initiales : (fallbackInitials || '—')
  }

  const { kpis, incomplets, enRetardList, rapportsDusList } = useMemo(() => {
    let realises = 0
    let enRetard = 0
    let rapportsDus = 0
    const incompletsList: IncompletItem[] = []
    const enRetardListItems: EnRetardItem[] = []
    const rapportsDusListItems: RapportDuItem[] = []

    for (const client of clients) {
      const year = parseInt(client.annee ?? String(new Date().getFullYear()))
      for (const plan of client.plans) {
        for (const s of plan.samplings) {
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
          if (isSamplingOverdue(s, year)) {
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
          if (s.status === 'done' && s.rapportPrevu && !s.rapportDate) {
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
      kpis: { realises, incomplets: incompletsList.length, enRetard, rapportsDus },
      incomplets: incompletsList,
      enRetardList: enRetardListItems,
      rapportsDusList: rapportsDusListItems,
    }
  }, [clients])

  if (incomplets.length === 0 && enRetardList.length === 0 && rapportsDusList.length === 0) return null

  return (
    <div className="mb-6 animate-fade-in">
      <span className="text-xs font-semibold uppercase block mb-3"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        Suivi équipe
      </span>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Réalisés',    sub: "Faits sur l'année",          value: kpis.realises,   color: 'var(--color-success)' },
          { label: 'Incomplets',  sub: 'Date, tech ou nappe requis', value: kpis.incomplets, color: 'var(--color-warning)' },
          { label: 'En retard',   sub: 'Échéances dépassées',        value: kpis.enRetard,   color: 'var(--color-danger)'  },
          { label: 'Rapports dus',sub: 'Prévus non rédigés',        value: kpis.rapportsDus,color: 'var(--color-accent)'  },
        ].map(({ label, sub, value, color }) => (
          <div key={label} className="rounded-xl p-3 flex flex-col justify-between"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
            </div>
            <div className="text-[10px] mt-1.5 leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {/* Liste incomplets */}
        {incomplets.length > 0 && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <button
              type="button"
              onClick={() => setOpenIncomplets(o => !o)}
              className="flex items-center justify-between px-4 py-3 w-full text-left cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors"
              style={{ borderBottom: openIncomplets ? '1px solid var(--color-border-subtle)' : 'none' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Prélèvements incomplets
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                  {incomplets.length}
                </span>
              </div>
              <ChevronDown size={14} strokeWidth={2.5} style={{
                color: 'var(--color-text-secondary)',
                transform: openIncomplets ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s ease',
              }} />
            </button>
            {openIncomplets && incomplets.map((item, i) => (
              <div key={item.samplingId}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                style={{ borderBottom: i < incomplets.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {item.clientNom}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {[item.siteNom, item.planNom].filter(Boolean).join(' · ')} · tech: {resolveInitials(item.doneBy, item.preleveur)}{item.doneDate ? ` · fait le ${new Date(item.doneDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                  {item.champManquant}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 16 }}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* Liste en retard */}
        {enRetardList.length > 0 && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <button
              type="button"
              onClick={() => setOpenRetard(o => !o)}
              className="flex items-center justify-between px-4 py-3 w-full text-left cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors"
              style={{ borderBottom: openRetard ? '1px solid var(--color-border-subtle)' : 'none' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Prélèvements en retard (équipe)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                  {enRetardList.length}
                </span>
              </div>
              <ChevronDown size={14} strokeWidth={2.5} style={{
                color: 'var(--color-text-secondary)',
                transform: openRetard ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s ease',
              }} />
            </button>
            {openRetard && enRetardList.map((item, i) => {
              const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
              const dateStr = item.plannedDay ? `prévu le ${item.plannedDay} ${months[item.plannedMonth]}` : `prévu en ${months[item.plannedMonth]}`
              return (
                <div key={item.samplingId}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  style={{ borderBottom: i < enRetardList.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                  onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {item.clientNom}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {[item.siteNom, item.planNom].filter(Boolean).join(' · ')} · tech: {item.preleveur} · {dateStr}
                    </p>
                  </div>
                  {item.meteo === 'pluie' && (
                    <span title="Prélèvement temps de pluie" className="shrink-0 text-base leading-none">🌧</span>
                  )}
                  <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                    En retard
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 16 }}>›</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Liste rapports dus */}
        {rapportsDusList.length > 0 && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <button
              type="button"
              onClick={() => setOpenRapports(o => !o)}
              className="flex items-center justify-between px-4 py-3 w-full text-left cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors"
              style={{ borderBottom: openRapports ? '1px solid var(--color-border-subtle)' : 'none' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Rapports dus (équipe)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                  {rapportsDusList.length}
                </span>
              </div>
              <ChevronDown size={14} strokeWidth={2.5} style={{
                color: 'var(--color-text-secondary)',
                transform: openRapports ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s ease',
              }} />
            </button>
            {openRapports && rapportsDusList.map((item, i) => (
              <div key={item.samplingId}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                style={{ borderBottom: i < rapportsDusList.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {item.clientNom}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {[item.siteNom, item.planNom].filter(Boolean).join(' · ')} · tech: {resolveInitials(item.doneBy, item.preleveur)}{item.doneDate ? ` · fait le ${new Date(item.doneDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                  Rapport dû
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 16 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
