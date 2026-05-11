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
import { useClientsListener, saveClient } from '@/hooks/useClients'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useEvenementsListener, deleteEvenement } from '@/hooks/useEvenements'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { getGreeting, formatDate, isThisMonth, localISO, isToday, daysDiff } from '@/lib/dashboardUtils'
import { isSamplingOverdue } from '@/lib/overdue'
import type { Sampling, Verification, Equipement, Client, Plan, EvenementPersonnel, Maintenance } from '@/types'

const EVENEMENT_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  rappel:  { label: 'Rappel',  bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
  reunion: { label: 'Réunion', bg: '#F3EEFF',                   color: '#7C3AED',                     dot: '#7C3AED'                    },
  rapport: { label: 'Rapport', bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
  autre:   { label: 'Autre',   bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
}

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

  // ── KPIs ──────────────────────────────────────────────────

  const missionsCeMois = clients.reduce((count, client) =>
    count + client.plans.reduce((c, plan) =>
      c + plan.samplings.filter((s: Sampling) => s.status === 'done' && isThisMonth(s.doneDate)).length, 0), 0)

  const verifiTotal     = verifications.length
  const verifiConformes = verifications.filter((v: Verification) => v.resultat === 'conforme').length
  const conformitePct   = verifiTotal > 0 ? Math.round((verifiConformes / verifiTotal) * 100) : null

  const equipementsWithoutVerif = equipements.filter((e: Equipement) => {
    if (!e.prochainEtalonnage) return false
    return !verifications.some((v: Verification) => v.equipementId === e.id || v.equipementNom === e.nom)
  })

  const aCalibrrer = [
    ...verifications.filter((v: Verification) => v.prochainControle && daysDiff(v.prochainControle) < 30),
    ...equipementsWithoutVerif.filter((e: Equipement) => daysDiff(e.prochainEtalonnage) < 30),
  ].length

  // ── Rapports à envoyer ────────────────────────────────────

  const rapportsAFaire = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10)
    const result: {
      clientId: string; planId: string; samplingId: string
      clientNom: string; siteNom: string; planNom: string
      doneDate: string; joursDepuis: number; enRetard: boolean
    }[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach((plan: Plan) => {
        plan.samplings.forEach((s: Sampling) => {
          if (!s.rapportPrevu || s.rapportDate) return
          if (s.status !== 'done' || !s.doneDate) return
          if (!isGeneraliste) {
            const estMonRapport = s.doneBy ? s.doneBy === uid : client.preleveur === initiales
            if (!estMonRapport) return
          }
          const msDay = 1000 * 60 * 60 * 24
          const joursDepuis = Math.floor((new Date(todayISO).getTime() - new Date(s.doneDate).getTime()) / msDay)
          result.push({
            clientId: client.id, planId: plan.id, samplingId: s.id,
            clientNom: client.nom, siteNom: plan.siteNom || plan.nom || '—', planNom: plan.nom || '—',
            doneDate: s.doneDate, joursDepuis, enRetard: joursDepuis > 30,
          })
        })
      })
    })
    return result.sort((a, b) => b.joursDepuis - a.joursDepuis)
  }, [clients, isGeneraliste, uid, initiales])

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

  // ── Planning du jour ──────────────────────────────────────

  const todayISO     = localISO(new Date())
  const yesterdayISO = localISO(new Date(Date.now() - 86_400_000))
  const nowMinutes   = new Date().getHours() * 60 + new Date().getMinutes()

  function getSamplingBadge(s: Sampling): { label: string; bg: string; color: string } {
    if (s.status === 'done')         return { label: 'Réalisé',  bg: 'var(--color-success-light)', color: 'var(--color-success)' }
    if (s.status === 'overdue')      return { label: 'Urgent',   bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' }
    if (s.status === 'non_effectue') return { label: 'Non fait', bg: 'var(--color-warning-light)', color: 'var(--color-warning)' }
    if (s.plannedTime) {
      const [h, m] = s.plannedTime.split(':').map(Number)
      const tMin = h * 60 + m
      if (nowMinutes >= tMin && nowMinutes < tMin + 120) return { label: 'En cours', bg: 'var(--color-accent-light)', color: 'var(--color-accent)' }
    }
    return { label: 'À faire', bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
  }

  const techOptions = useMemo((): TechOption[] => {
    const codes = new Set(clients.map((c: Client) => c.preleveur).filter(Boolean) as string[])
    return Array.from(codes).sort().map(code => ({ code, label: code }))
  }, [clients])

  type JourItem =
    | { kind: 'sampling';  time: string; title: string; sub: string; badge: { label: string; bg: string; color: string }; dot: string; meteo: string; modalEvent: ModalEvent }
    | { kind: 'evenement'; time: string; title: string; sub: string; badge: { label: string; bg: string; color: string }; dot: string; modalEvent: ModalEvent }

  const jourItems: JourItem[] = []

  clients.forEach((client) => {
    client.plans.forEach((plan) => {
      const jMatch = `${plan.nom || ''} ${plan.siteNom || ''}`.match(/\bJ(\d+)\b/)
      const dayOffset = jMatch ? parseInt(jMatch[1]) - 1 : 0
      plan.samplings.forEach((s: Sampling) => {
        if (!s.plannedDay && !s.doneDate) return
        if (initiales) {
          const techSampling = s.assignedTo || client.preleveur
          if (techSampling && techSampling !== initiales) return
        }
        const baseDate = s.doneDate || localISO(new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay + dayOffset))
        const isJ2Today = baseDate === yesterdayISO && s.status === 'planned'
        if (!isToday(baseDate) && !isJ2Today) return
        const badge = getSamplingBadge(s)
        const dot = s.status === 'done' ? 'var(--color-success)' : s.status === 'overdue' ? 'var(--color-danger)' : 'var(--color-accent)'
        const sub = [plan.siteNom, plan.nom].filter(Boolean).join(' · ') || '—'
        const modalEvent: ModalEvent = {
          id: s.id, type: 'prelevement', title: client.nom, subtitle: sub,
          statusLabel: badge.label, statusBg: badge.bg, statusColor: dot,
          link: `/missions/${client.id}/plan/${plan.id}`,
          isDone: s.status === 'done', technicien: client.preleveur || '—',
          clientId: client.id, planId: plan.id, samplingId: s.id, plannedTime: s.plannedTime,
        }
        jourItems.push({ kind: 'sampling', time: s.plannedTime ?? '', title: client.nom, sub, badge, dot, meteo: plan.meteo || '', modalEvent })
      })
    })
  })

  evenements
    .filter((ev: EvenementPersonnel) => {
      if (!isGeneraliste && initiales && ev.createdByInitiales && ev.createdByInitiales !== initiales) return false
      if (ev.dateFin && ev.dateFin > ev.date) return ev.date <= todayISO && ev.dateFin >= todayISO
      return ev.date === todayISO
    })
    .forEach((ev: EvenementPersonnel) => {
      const cfg = EVENEMENT_CFG[ev.type] ?? EVENEMENT_CFG.autre
      const evSub = [ev.createdByInitiales, ev.notes].filter(Boolean).join(' · ') || cfg.label
      const evModalEvent: ModalEvent = {
        id: ev.id, type: 'evenement', title: ev.titre, subtitle: evSub,
        statusLabel: cfg.label, statusBg: cfg.bg, statusColor: cfg.color,
        link: '', isDone: false, technicien: ev.createdByInitiales || '—', evenementData: ev,
      }
      jourItems.push({ kind: 'evenement', time: ev.heure ?? '', title: ev.titre, sub: evSub, badge: { label: cfg.label, bg: cfg.bg, color: cfg.color }, dot: cfg.dot, modalEvent: evModalEvent })
    })

  jourItems.sort((a, b) => {
    if (!a.time && !b.time) return 0
    if (!a.time) return -1
    if (!b.time) return 1
    return a.time.localeCompare(b.time)
  })

  // ── État du parc ──────────────────────────────────────────

  const parcEtat = {
    operationnel:   equipements.filter((e: Equipement) => e.etat === 'operationnel').length,
    en_maintenance: equipements.filter((e: Equipement) => e.etat === 'en_maintenance').length,
    hors_service:   equipements.filter((e: Equipement) => e.etat === 'hors_service').length,
    prete:          equipements.filter((e: Equipement) => e.etat === 'prete').length,
  }

  // ── Alertes ───────────────────────────────────────────────

  const prelevementsEnRetard: { clientNom: string; siteNom: string; planNom: string; clientId: string; planId: string; samplingId: string; meteo: string }[] = []
  clients.forEach((client: Client) => {
    const clientYear = Number(client.annee) || undefined
    client.plans.forEach((plan: Plan) =>
      plan.samplings.forEach((s: Sampling) => {
        if (isSamplingOverdue(s, clientYear) && plan.meteo !== 'pluie')
          prelevementsEnRetard.push({ clientNom: client.nom, siteNom: plan.siteNom, planNom: plan.nom, clientId: client.id, planId: plan.id, samplingId: s.id, meteo: plan.meteo || '' })
      })
    )
  })

  type PluieItem = { clientNom: string; siteNom: string; planNom: string; clientId: string; planId: string; samplingId: string; plannedMonth: number; plannedDay: number; overdue: boolean }
  const prelevementsPluie: PluieItem[] = []
  clients.forEach((client: Client) => {
    if (!isGeneraliste && initiales && client.preleveur && client.preleveur !== initiales) return
    const clientYear = Number(client.annee) || undefined
    client.plans.forEach((plan: Plan) => {
      if (plan.meteo !== 'pluie') return
      plan.samplings.forEach((s: Sampling) => {
        if (s.status === 'done' || s.status === 'non_effectue') return
        prelevementsPluie.push({ clientNom: client.nom, siteNom: plan.siteNom, planNom: plan.nom, clientId: client.id, planId: plan.id, samplingId: s.id, plannedMonth: s.plannedMonth, plannedDay: s.plannedDay, overdue: isSamplingOverdue(s, clientYear) })
      })
    })
  })
  prelevementsPluie.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    if (a.plannedMonth !== b.plannedMonth) return a.plannedMonth - b.plannedMonth
    return a.plannedDay - b.plannedDay
  })

  const maintenancesActives = maintenances.filter((m: Maintenance) => {
    if (m.statut === 'en_cours') return true
    if (m.statut === 'planifiee') return daysDiff(m.datePrevue) <= 14
    return false
  }).slice(0, 8)

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
          value={conformitePct !== null ? `${conformitePct}%` : '—'}
          label="Conformité métrologie"
          sub={verifiTotal > 0 ? `${verifiConformes}/${verifiTotal} conformes` : 'Aucune vérification'}
          warning={conformitePct !== null && conformitePct < 80}
          accent={conformitePct !== null && conformitePct >= 80}
        />
        <StatCard
          value={rapportsAFaire.length}
          label="Rapports à envoyer"
          sub={rapportsAFaire.length > 0 ? `${rapportsAFaire.filter(r => r.enRetard).length} en retard` : 'Tout est à jour'}
          danger={rapportsAFaire.some(r => r.enRetard)}
          warning={rapportsAFaire.length > 0 && !rapportsAFaire.some(r => r.enRetard)}
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
                  onClick={() => setEventDetail({ event: item.modalEvent, dateStr: todayISO })}
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

      <RapportsWidget rapports={rapportsAFaire} onMarkEnvoye={markRapportEnvoye} />
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
          onDelete={(ev) => { if (ev.evenementData) deleteEvenement(ev.evenementData.id) }}
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
