import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import DonutChart from '@/components/dashboard/DonutChart'
import { StatCard, SectionTitle, EmptyCard } from '@/components/dashboard/StatCard'
import { RapportsWidget } from '@/components/dashboard/RapportsWidget'
import { RetardWidget } from '@/components/dashboard/RetardWidget'
import { PluieWidget } from '@/components/dashboard/PluieWidget'
import { MaintenancesWidget } from '@/components/dashboard/MaintenancesWidget'
import { EventDetailModal } from '@/components/EventDetailModal'
import type { ModalEvent, TechOption } from '@/components/EventDetailModal'
import { useAuthStore, selectPrenom, selectInitiales, selectUid, selectRole } from '@/stores/authStore'
import { useClientsListener } from '@/hooks/useClients'
import { saveClient } from '@/services/clientService'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useEvenementsListener } from '@/hooks/useEvenements'
import { deleteEvenement } from '@/services/evenementService'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import type { ModalEventRef } from '@/hooks/useDashboardStats'
import { getGreeting, formatDate, localISO } from '@/lib/dashboardUtils'
import type { Sampling, Client, Plan } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const prenom    = useAuthStore(selectPrenom)
  const initiales = useAuthStore(selectInitiales)
  const uid       = useAuthStore(selectUid)
  const role      = useAuthStore(selectRole)
  const isGeneraliste = role === 'charge_mission' || role === 'admin'

  useClientsListener()
  useEquipementsListener()
  useVerificationsListener()
  useEvenementsListener()
  useMaintenancesListener()

  const { clients }       = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { evenements }    = useEvenementsStore()
  const { maintenances }  = useMaintenancesStore()

  const [eventDetail, setEventDetail] = useState<{ event: ModalEvent; dateStr: string } | null>(null)

  const {
    missionsCeMois, verifiTotal, verifiConformes, conformitePct,
    aCalibrrer, rapportsAFaire, rapportsAFaireMoi, jourItems, parcEtat,
    prelevementsEnRetard, prelevementsPluie, maintenancesActives,
    techOptions: rawTechOptions,
  } = useDashboardStats({ clients, verifications, equipements, evenements, maintenances, uid, initiales, isGeneraliste })

  const techOptions = useMemo((): TechOption[] =>
    rawTechOptions.map(({ code, label }) => ({ code, label })),
    [rawTechOptions])

  const todayISO = localISO(new Date())

  // ── Actions ────────────────────────────────────────────────

  async function markRapportEnvoye(clientId: string, planId: string, samplingId: string) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    const today = new Date().toISOString().slice(0, 10)
    await saveClient({
      ...client,
      plans: client.plans.map((plan: Plan) => plan.id !== planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) => s.id !== samplingId ? s : { ...s, rapportDate: today }),
      }),
    }, uid)
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-6 pb-10 max-w-4xl">

      {/* Salutation */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          {getGreeting()} {prenom || 'Thomas'} 👋
        </h1>
        <p className="text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {formatDate()}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard value={missionsCeMois} label="Missions ce mois" sub="prélèvements réalisés" accent />
        <StatCard
          value={rapportsAFaire.length}
          label="Rapports à envoyer"
          sub={rapportsAFaire.length > 0 ? `${rapportsAFaire.filter(r => r.enRetard).length} en retard` : 'Tout est à jour'}
          danger={rapportsAFaire.some(r => r.enRetard)}
          warning={rapportsAFaire.length > 0 && !rapportsAFaire.some(r => r.enRetard)}
        />
        <StatCard
          value={conformitePct !== null ? `${conformitePct}%` : '—'}
          label="Conformité métrologie"
          sub={verifiTotal > 0 ? `${verifiConformes}/${verifiTotal} à jour` : 'Aucun instrument suivi'}
          warning={conformitePct !== null && conformitePct < 80}
          accent={conformitePct !== null && conformitePct >= 80}
        />
        <StatCard
          value={aCalibrrer}
          label="À calibrer (30j)"
          sub={aCalibrrer > 0 ? 'Étalonnages à prévoir' : 'Aucune échéance proche'}
          warning={aCalibrrer > 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Planning du jour */}
        <div>
          <SectionTitle>Planning du jour</SectionTitle>
          {jourItems.length === 0 ? (
            <EmptyCard>Aucune intervention ni événement aujourd'hui.</EmptyCard>
          ) : (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              {jourItems.slice(0, 8).map((item, i) => (
                <div key={i}
                  onClick={() => setEventDetail({ event: item.modalEvent as ModalEvent, dateStr: todayISO })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
                  style={{ borderBottom: i < jourItems.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.time ? (
                    <span className="text-xs font-semibold shrink-0 w-10 text-center px-1.5 py-1 rounded-lg"
                      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                      {item.time}
                    </span>
                  ) : (
                    <span className="shrink-0 w-2 h-2 rounded-full mt-0.5" style={{ background: item.dot }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.sub}</p>
                  </div>
                  {'meteo' in item && item.meteo === 'pluie' && (
                    <span title="Prélèvement temps de pluie" className="shrink-0 text-base leading-none">🌧</span>
                  )}
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                    style={{ background: item.badge.bg, color: item.badge.color }}>{item.badge.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* État du parc */}
        <div>
          <SectionTitle>État du parc matériel</SectionTitle>
          <div className="rounded-xl px-6 py-5"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <DonutChart
              total={equipements.length}
              segments={[
                { value: parcEtat.operationnel,   color: 'var(--color-success)', label: 'En service'     },
                { value: aCalibrrer,              color: 'var(--color-warning)', label: 'À calibrer'     },
                { value: parcEtat.en_maintenance, color: 'var(--color-accent)',  label: 'En maintenance' },
                { value: parcEtat.hors_service,   color: 'var(--color-danger)',  label: 'Hors service'   },
                { value: parcEtat.prete,          color: 'var(--color-neutral)', label: 'Prêté'          },
              ]}
            />
          </div>
          <button onClick={() => navigate('/materiel')} className="mt-2 text-xs" style={{ color: 'var(--color-accent)' }}>
            Voir tout le matériel →
          </button>
        </div>
      </div>

      <RapportsWidget rapports={rapportsAFaireMoi} onMarkEnvoye={markRapportEnvoye} />
      <RetardWidget items={prelevementsEnRetard} />
      <PluieWidget items={prelevementsPluie} />
      <MaintenancesWidget maintenances={maintenancesActives} />

      {eventDetail && (
        <EventDetailModal
          key={eventDetail.event.id}
          event={eventDetail.event}
          dateStr={eventDetail.dateStr}
          onClose={() => setEventDetail(null)}
          onCancel={async (ev, reason) => {
            if (!uid || !ev.clientId || !ev.planId || !ev.samplingId) return
            const client = clients.find((c: Client) => c.id === ev.clientId)
            if (!client) return
            await saveClient({
              ...client,
              plans: client.plans.map((plan: Plan) => plan.id !== ev.planId ? plan : {
                ...plan,
                samplings: plan.samplings.map((s: Sampling) => {
                  if (s.id !== ev.samplingId) return s
                  const fromDate = `${new Date().getFullYear()}-${String(s.plannedMonth + 1).padStart(2, '0')}-${String(s.plannedDay).padStart(2, '0')}`
                  return { ...s, plannedDay: 0, motif: reason, reportHistory: [...(s.reportHistory ?? []), { from: fromDate, to: '', by: uid, reason, at: new Date().toISOString() }] }
                }),
              }),
            }, uid)
          }}
          onMove={async (ev, newDate, reason) => {
            if (!uid || !ev.clientId || !ev.planId || !ev.samplingId) return
            const client = clients.find((c: Client) => c.id === ev.clientId)
            if (!client) return
            const d = new Date(newDate + 'T12:00:00')
            await saveClient({
              ...client,
              plans: client.plans.map((plan: Plan) => plan.id !== ev.planId ? plan : {
                ...plan,
                samplings: plan.samplings.map((s: Sampling) => {
                  if (s.id !== ev.samplingId) return s
                  const fromDate = `${new Date().getFullYear()}-${String(s.plannedMonth + 1).padStart(2, '0')}-${String(s.plannedDay).padStart(2, '0')}`
                  return { ...s, plannedDay: d.getDate(), plannedMonth: d.getMonth(), reportHistory: [...(s.reportHistory ?? []), { from: fromDate, to: newDate, by: uid, reason, at: new Date().toISOString() }] }
                }),
              }),
            }, uid)
          }}
          onDelete={(ev) => { if ((ev as unknown as ModalEventRef).evenementData) deleteEvenement((ev as unknown as ModalEventRef).evenementData!.id) }}
          onChangeTech={async (ev, initiales_) => {
            if (!uid || !ev.clientId) return
            const client = clients.find((c: Client) => c.id === ev.clientId)
            if (!client) return
            await saveClient({ ...client, preleveur: initiales_ }, uid)
          }}
          techOptions={techOptions}
        />
      )}
    </div>
  )
}
