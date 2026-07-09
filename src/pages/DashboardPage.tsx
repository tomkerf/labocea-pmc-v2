import { useMemo, useEffect, useReducer, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { m, AnimatePresence } from 'framer-motion'

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
import EventDetailModal from '@/components/planning/EventDetailModal'
import type { PlanningEvent, TechOption } from '@/lib/planningUtils'
import { shiftDateFin } from '@/lib/planningUtils'
import { useAuthStore, selectPrenom, selectInitiales, selectUid, selectRole } from '@/stores/authStore'
import { updateUserProfile } from '@/services/userService'
import { saveClient } from '@/services/clientService'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { deleteEvenement, updateEvenementDate } from '@/services/evenementService'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { localISO } from '@/lib/dashboardUtils'
import type { Sampling, Client, Plan } from '@/types'
import { TodosWidget } from '@/components/dashboard/TodosWidget'
import { useTodosStore } from '@/stores/todosStore'
import { COLORS } from '@/lib/constants'
import { uploadSamplingPhoto, ImageValidationError } from '@/lib/uploadPhoto'
import { toast } from '@/stores/toastStore'


// ── useReducer ────────────────────────────────────────────────

type State = {
  showWelcome: boolean
  activeTab: 'technicien' | 'manager'
  eventDetail: { event: PlanningEvent; dateStr: string } | null
  planningMode: 'today' | 'tomorrow'
}

type Action =
  | { type: 'SET_SHOW_WELCOME'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'technicien' | 'manager' }
  | { type: 'SET_EVENT_DETAIL'; payload: { event: PlanningEvent; dateStr: string } | null }
  | { type: 'SET_PLANNING_MODE'; payload: 'today' | 'tomorrow' }

const initialState: State = {
  showWelcome: false,
  activeTab: 'technicien',
  eventDetail: null,
  planningMode: 'today',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SHOW_WELCOME':   return { ...state, showWelcome: action.payload }
    case 'SET_ACTIVE_TAB':     return { ...state, activeTab: action.payload }
    case 'SET_EVENT_DETAIL':   return { ...state, eventDetail: action.payload }
    case 'SET_PLANNING_MODE':  return { ...state, planningMode: action.payload }
  }
}

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

  const [state, dispatch] = useReducer(reducer, initialState)
  const { showWelcome, activeTab, eventDetail, planningMode } = state

  useEffect(() => {
    if (appUser && appUser.hasSeenAide !== true) {
      dispatch({ type: 'SET_SHOW_WELCOME', payload: true })
    }
  }, [appUser])

  async function dismissWelcome(navigateAide: boolean) {
    dispatch({ type: 'SET_SHOW_WELCOME', payload: false })
    if (uid) {
      await updateUserProfile(uid, { hasSeenAide: true })
      // Update local state optimisticly so it doesn't blink
      useAuthStore.setState(s => s.appUser ? { appUser: { ...s.appUser, hasSeenAide: true } } : s)
    }
    if (navigateAide) {
      navigate('/aide')
    }
  }

  const { clients }       = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { evenements }    = useEvenementsStore()
  const { maintenances }  = useMaintenancesStore()
  const todos             = useTodosStore(s => s.todos)


  const {
    missionsCeMoisMoi, verifiTotal, verifiConformes, conformitePct,
    aCalibrrer, rapportsAFaireMoi, jourItems, lendemainItems,
    hasRainToday, hasRainTomorrow,
    parcDonut,
    prelevementsEnRetard, prelevementsPluie, maintenancesActives, metrologieAlertes,
    techOptions: rawTechOptions,
  } = useDashboardStats({ clients, verifications, equipements, evenements, maintenances, todos, uid, initiales, isGeneraliste })

  const techOptions = useMemo((): TechOption[] =>
    rawTechOptions.map(({ code, label }) => ({ code, label })),
    [rawTechOptions])

  const activeItems = planningMode === 'today' ? jourItems : lendemainItems
  const now = new Date()
  const todayISO = localISO(now)
  const tomorrowISO = localISO(new Date(now.getTime() + 86_400_000))
  const activeDateISO = planningMode === 'today' ? todayISO : tomorrowISO

  // ── Actions ────────────────────────────────────────────────

  async function handleDashboardPhotoUpload(clientId: string, planId: string, samplingId: string, file: File) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    try {
      const url = await uploadSamplingPhoto(file, clientId, planId, samplingId)
      await saveClient({
        ...client,
        plans: client.plans.map((p: Plan) => p.id !== planId ? p : {
          ...p,
          samplings: p.samplings.map((s: Sampling) =>
            s.id !== samplingId ? s : { ...s, photos: [...(s.photos ?? []), url] }
          ),
        }),
      }, uid)
      toast.success('Photo ajoutée')
    } catch (err) {
      if (err instanceof ImageValidationError) toast.error(err.message)
      else toast.error('Échec de l\'envoi de la photo. Vérifie ta connexion.')
    }
  }

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

  const handleCancelEvent = useCallback(async (ev: PlanningEvent, reason: string) => {
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
  }, [uid, clients])

  const handleMoveEvent = useCallback(async (ev: PlanningEvent, newDate: string, reason: string) => {
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
  }, [uid, clients])

  // ── Render ────────────────────────────────────────────────

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 pb-10 max-w-4xl"
    >

      <DashboardHeader
        prenom={prenom}
        isGeneraliste={isGeneraliste}
        activeTab={activeTab}
        setActiveTab={(tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })}
        avatarColor={appUser?.avatarColor}
        initiales={appUser?.initiales}
      />

      <AnimatePresence mode="wait">
        {(!isGeneraliste || activeTab === 'technicien') ? (
          <m.div
            key="technicien"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* KPIs — grille 2×2 mobile, 4 colonnes desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <StatCard
                  value={missionsCeMoisMoi}
                  label="Missions ce mois"
                  sub="prélèvements réalisés"
                  accent
                  onClick={() => navigate('/missions')}
                />
              </div>
              <div>
                <StatCard
                  value={rapportsAFaireMoi.length}
                  label="Rapports à rédiger"
                  sub={rapportsAFaireMoi.length > 0 ? `${rapportsAFaireMoi.filter(r => r.enRetard).length} en retard` : 'Tout est à jour'}
                  danger={rapportsAFaireMoi.some(r => r.enRetard)}
                  warning={rapportsAFaireMoi.length > 0 && !rapportsAFaireMoi.some(r => r.enRetard)}
                  onClick={() => navigate('/rapports')}
                />
              </div>
              <div>
                <StatCard
                  value={conformitePct !== null ? `${conformitePct}%` : '—'}
                  label="Conformité métrologie"
                  sub={verifiTotal > 0 ? `${verifiConformes}/${verifiTotal} à jour` : 'Aucun instrument suivi'}
                  warning={conformitePct !== null && conformitePct < 80}
                  accent={conformitePct !== null && conformitePct >= 80}
                  onClick={() => navigate('/metrologie')}
                />
              </div>
              <div>
                <StatCard
                  value={aCalibrrer}
                  label="À calibrer (30j)"
                  sub={aCalibrrer > 0 ? 'Étalonnages à prévoir' : 'Aucune échéance proche'}
                  warning={aCalibrrer > 0}
                  onClick={() => navigate('/metrologie')}
                />
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Planning */}
              <DashboardPlanningWidget
                planningMode={planningMode}
                setPlanningMode={(mode) => dispatch({ type: 'SET_PLANNING_MODE', payload: mode })}
                hasRainToday={hasRainToday}
                hasRainTomorrow={hasRainTomorrow}
                activeItems={activeItems}
                activeDateISO={activeDateISO}
                setEventDetail={(detail) => dispatch({ type: 'SET_EVENT_DETAIL', payload: detail })}
                onUploadPhoto={handleDashboardPhotoUpload}
              />

              {/* État du parc */}
              <div>
                <SectionTitle>État du parc matériel</SectionTitle>
                <div className="rounded-xl px-6 py-5"
                  style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <DonutChart
                    total={equipements.length}
                    segments={[
                      { value: parcDonut.en_service,     color: '#34C759',      label: 'En service'     },
                      { value: parcDonut.a_calibrer,     color: '#FF9F0A',      label: 'À calibrer'     },
                      { value: parcDonut.en_maintenance, color: COLORS.ACCENT,  label: 'En maintenance' },
                      { value: parcDonut.hors_service,   color: '#FF3B30',      label: 'Hors service'   },
                      { value: parcDonut.prete,          color: 'var(--color-neutral)', label: 'Prêté'          },
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
          </m.div>
        ) : (
          <m.div
            key="manager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <EquipeSuiviWidget clients={clients} />
          </m.div>
        )}
      </AnimatePresence>

      {eventDetail && (
        <EventDetailModal
          event={eventDetail?.event || null}
          dateStr={eventDetail?.dateStr || ''}
          onClose={() => dispatch({ type: 'SET_EVENT_DETAIL', payload: null })}
          techOptions={techOptions}
          onCancel={handleCancelEvent}
          onMove={handleMoveEvent}
          onMoveEvenement={async (ev, newDate) => {
            const data = ev.evenementData
            if (!data || !newDate) return
            await updateEvenementDate(data.id, newDate, shiftDateFin(data.date, newDate, data.dateFin))
          }}
          onDelete={(ev) => { if (ev.evenementData) deleteEvenement(ev.evenementData.id) }}
          onChangeTech={async (ev, initiales_) => {
            if (!uid || !ev.clientId) return
            const client = clients.find((c: Client) => c.id === ev.clientId)
            if (!client) return
            await saveClient({ ...client, preleveur: initiales_ }, uid)
          }}
          onChangeEquipements={async (ev, eqIds) => {
            if (!uid || !ev.clientId || !ev.planId || !ev.samplingId) return
            const client = clients.find((c: Client) => c.id === ev.clientId)
            if (!client) return
            await saveClient({
              ...client,
              plans: client.plans.map(p => p.id !== ev.planId ? p : {
                ...p,
                samplings: p.samplings.map(s => s.id !== ev.samplingId ? s : { ...s, equipementsAssignes: eqIds })
              })
            }, uid)
          }}
        />
      )}

      <WelcomeModal show={showWelcome} onDismiss={dismissWelcome} />
    </m.div>
  )
}
