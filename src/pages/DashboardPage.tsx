import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { motion, AnimatePresence } from 'framer-motion'

import DonutChart from '@/components/dashboard/DonutChart'
import { StatCard, SectionTitle } from '@/components/dashboard/StatCard'
import { RapportsWidget } from '@/components/dashboard/RapportsWidget'
import { RetardWidget } from '@/components/dashboard/RetardWidget'
import { PluieWidget } from '@/components/dashboard/PluieWidget'
import { MaintenancesWidget } from '@/components/dashboard/MaintenancesWidget'
import { MetrologieWidget } from '@/components/dashboard/MetrologieWidget'
import { EquipeSuiviWidget } from '@/components/dashboard/EquipeSuiviWidget'
import { WelcomeModal } from '@/components/dashboard/WelcomeModal'
import { DashboardPlanningWidget } from '@/components/dashboard/DashboardPlanningWidget'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EventDetailModal } from '@/components/EventDetailModal'
import type { ModalEvent, TechOption } from '@/components/EventDetailModal'
import { useAuthStore, selectPrenom, selectInitiales, selectUid, selectRole } from '@/stores/authStore'
import { updateUserProfile } from '@/services/userService'
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
import { localISO } from '@/lib/dashboardUtils'
import type { Sampling, Client, Plan } from '@/types'
import { TodosWidget } from '@/components/dashboard/TodosWidget'
import { useTodosListener } from '@/hooks/useTodos'
import { useTodosStore } from '@/stores/todosStore'
import { COLORS } from '@/lib/constants'


const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
} as const

export default function DashboardPage() {
  const navigate = useNavigate()
  const appUser   = useAuthStore(s => s.appUser)
  const prenom    = useAuthStore(selectPrenom)
  const initiales = useAuthStore(selectInitiales)
  const uid       = useAuthStore(selectUid)
  const role      = useAuthStore(selectRole)
  const isGeneraliste = role === 'charge_mission' || role === 'admin'

  const [showWelcome, setShowWelcome] = useState(false)
  const [activeTab, setActiveTab] = useState<'technicien' | 'manager'>('technicien')

  useEffect(() => {
    if (appUser && appUser.hasSeenAide !== true) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWelcome(true)
    }
  }, [appUser])

  async function dismissWelcome(navigateAide: boolean) {
    setShowWelcome(false)
    if (uid) {
      await updateUserProfile(uid, { hasSeenAide: true })
      // Update local state optimisticly so it doesn't blink
      useAuthStore.setState(s => s.appUser ? { appUser: { ...s.appUser, hasSeenAide: true } } : s)
    }
    if (navigateAide) {
      navigate('/aide')
    }
  }

  useClientsListener()
  useEquipementsListener()
  useVerificationsListener()
  useEvenementsListener()
  useMaintenancesListener()
  useTodosListener()

  const { clients }       = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { evenements }    = useEvenementsStore()
  const { maintenances }  = useMaintenancesStore()
  const todos             = useTodosStore(s => s.todos)

  const [eventDetail, setEventDetail] = useState<{ event: ModalEvent; dateStr: string } | null>(null)
  const [planningMode, setPlanningMode] = useState<'today' | 'tomorrow'>('today')

  const {
    missionsCeMois, verifiTotal, verifiConformes, conformitePct,
    aCalibrrer, rapportsAFaireMoi, jourItems, lendemainItems, parcEtat,
    hasRainToday, hasRainTomorrow,
    prelevementsEnRetard, prelevementsPluie, maintenancesActives, metrologieAlertes,
    techOptions: rawTechOptions,
  } = useDashboardStats({ clients, verifications, equipements, evenements, maintenances, todos, uid, initiales, isGeneraliste })

  const techOptions = useMemo((): TechOption[] =>
    rawTechOptions.map(({ code, label }) => ({ code, label })),
    [rawTechOptions])

  const activeItems = planningMode === 'today' ? jourItems : lendemainItems
  const todayISO = localISO(new Date())
  const [nowMs] = useState(() => Date.now())
  const tomorrowISO = localISO(new Date(nowMs + 86_400_000))
  const activeDateISO = planningMode === 'today' ? todayISO : tomorrowISO

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 pb-10 max-w-4xl"
    >

      <DashboardHeader
        prenom={prenom}
        isGeneraliste={isGeneraliste}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <AnimatePresence mode="wait">
        {(!isGeneraliste || activeTab === 'technicien') ? (
          <motion.div
            key="technicien"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                value={missionsCeMois}
                label="Missions ce mois"
                sub="prélèvements réalisés"
                accent
                onClick={() => navigate('/missions')}
              />
              <StatCard
                value={rapportsAFaireMoi.length}
                label="Rapports à rédiger"
                sub={rapportsAFaireMoi.length > 0 ? `${rapportsAFaireMoi.filter(r => r.enRetard).length} en retard` : 'Tout est à jour'}
                danger={rapportsAFaireMoi.some(r => r.enRetard)}
                warning={rapportsAFaireMoi.length > 0 && !rapportsAFaireMoi.some(r => r.enRetard)}
                onClick={() => navigate('/rapports')}
              />
              <StatCard
                value={conformitePct !== null ? `${conformitePct}%` : '—'}
                label="Conformité métrologie"
                sub={verifiTotal > 0 ? `${verifiConformes}/${verifiTotal} à jour` : 'Aucun instrument suivi'}
                warning={conformitePct !== null && conformitePct < 80}
                accent={conformitePct !== null && conformitePct >= 80}
                onClick={() => navigate('/metrologie')}
              />
              <StatCard
                value={aCalibrrer}
                label="À calibrer (30j)"
                sub={aCalibrrer > 0 ? 'Étalonnages à prévoir' : 'Aucune échéance proche'}
                warning={aCalibrrer > 0}
                onClick={() => navigate('/metrologie')}
              />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Planning */}
              <DashboardPlanningWidget
                planningMode={planningMode}
                setPlanningMode={setPlanningMode}
                hasRainToday={hasRainToday}
                hasRainTomorrow={hasRainTomorrow}
                activeItems={activeItems}
                activeDateISO={activeDateISO}
                setEventDetail={setEventDetail}
              />

              {/* État du parc */}
              <div>
                <SectionTitle>État du parc matériel</SectionTitle>
                <div className="rounded-xl px-6 py-5"
                  style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <DonutChart
                    total={equipements.length}
                    segments={[
                      { value: parcEtat.operationnel,   color: COLORS.SUCCESS, label: 'En service'     },
                      { value: aCalibrrer,              color: COLORS.WARNING, label: 'À calibrer'     },
                      { value: parcEtat.en_maintenance, color: COLORS.ACCENT,  label: 'En maintenance' },
                      { value: parcEtat.hors_service,   color: COLORS.DANGER,  label: 'Hors service'   },
                      { value: parcEtat.prete,          color: 'var(--color-neutral)', label: 'Prêté'          },
                    ]}
                  />
                </div>
                <button type="button" onClick={() => navigate('/materiel')} className="mt-2 text-xs cursor-pointer" style={{ color: COLORS.ACCENT }}>
                  Voir tout le matériel →
                </button>
              </div>
            </div>

            {/* Bottom Widgets */}
            <TodosWidget todos={todos} uid={uid || ''} />
            <RapportsWidget rapports={rapportsAFaireMoi} onMarkEnvoye={markRapportEnvoye} />
            <RetardWidget items={prelevementsEnRetard} />
            <PluieWidget items={prelevementsPluie} />
            <MaintenancesWidget maintenances={maintenancesActives} />
            <MetrologieWidget equipements={metrologieAlertes} />
          </motion.div>
        ) : (
          <motion.div
            key="manager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <EquipeSuiviWidget clients={clients} />
          </motion.div>
        )}
      </AnimatePresence>

      {eventDetail && (
        <EventDetailModal
          event={eventDetail?.event || null}
          dateStr={eventDetail?.dateStr || ''}
          onClose={() => setEventDetail(null)}
          techOptions={techOptions}
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
        />
      )}

      <WelcomeModal show={showWelcome} onDismiss={dismissWelcome} />
    </motion.div>
  )
}
