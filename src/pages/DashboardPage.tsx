import { useMemo, useEffect, useReducer, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { m, AnimatePresence } from 'framer-motion'

import { FlaskConical, FileText, Gauge, Crosshair } from 'lucide-react'
import DonutChart from '@/components/dashboard/DonutChart'
import { StatCard, SectionTitle } from '@/components/dashboard/StatCard'
import { ATraiterWidget } from '@/components/dashboard/ATraiterWidget'
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
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import type { Sampling, Client, Plan } from '@/types'
import { useTodosStore } from '@/stores/todosStore'
import { useActusStore } from '@/stores/actusStore'
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

function renderMarkdownSnippet(text: string) {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n+/g, ' ')

  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>')
  escaped = escaped.replace(/\[(.*?)\]\(.*?\)/g, '$1')

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />
}

function DashboardNewsWidget() {
  const navigate = useNavigate()
  const actus = useActusStore(s => s.actus)
  const uid = useAuthStore(selectUid)
  const recentActus = useMemo(() => actus.slice(0, 2), [actus])
  const unreadCount = useMemo(() => {
    if (!uid) return 0
    return actus.filter(a => !a.lectureUids.includes(uid)).length
  }, [actus, uid])

  if (recentActus.length === 0) return null

  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <SectionTitle>Actualités</SectionTitle>
        {unreadCount > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
        {recentActus.map((actu, i) => {
          const isUnread = uid && !actu.lectureUids.includes(uid)
          return (
            <div
              key={actu.id}
              onClick={() => navigate('/actus')}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--color-bg-tertiary)] ${
                i < recentActus.length - 1 ? 'border-b border-[var(--color-border-subtle)]' : ''
              }`}
            >
              <span className={`shrink-0 size-1.5 rounded-full mt-1.5 ${isUnread ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate text-[var(--color-text-primary)]">
                  {actu.titre}
                </p>
                <p className="text-[11.5px] leading-relaxed line-clamp-2 mt-0.5 text-[var(--color-text-secondary)]">
                  {renderMarkdownSnippet(actu.contenu)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
  usePreleveursListener()
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

  const { clients, loading } = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { evenements }    = useEvenementsStore()
  const { maintenances }  = useMaintenancesStore()
  const todos             = useTodosStore(s => s.todos)


  const {
    missionsCeMoisMoi, missionsMoisMoiTotal, verifiTotal, verifiConformes, conformitePct,
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
      className="px-4 py-6 md:px-8 max-w-6xl mx-auto"
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
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-[var(--radius-md)] p-[15px] h-[124px] animate-pulse bg-[var(--color-bg-tertiary)]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={<FlaskConical size={16} strokeWidth={1.6} />}
                  value={missionsCeMoisMoi}
                  label="Missions ce mois"
                  sub={missionsMoisMoiTotal > 0 ? `${missionsCeMoisMoi}/${missionsMoisMoiTotal} ce mois` : 'prélèvements réalisés'}
                  tone="accent"
                  progressPct={missionsMoisMoiTotal > 0 ? Math.round((missionsCeMoisMoi / missionsMoisMoiTotal) * 100) : undefined}
                  onClick={() => navigate('/missions/bilan')}
                />
                <StatCard
                  icon={<FileText size={16} strokeWidth={1.6} />}
                  value={rapportsAFaireMoi.length}
                  label="Rapports à rédiger"
                  sub={rapportsAFaireMoi.length > 0 ? `${rapportsAFaireMoi.filter(r => r.enRetard).length} en retard` : 'Tout est à jour'}
                  tone={rapportsAFaireMoi.some(r => r.enRetard) ? 'danger' : rapportsAFaireMoi.length > 0 ? 'warning' : 'accent'}
                  pill={rapportsAFaireMoi.some(r => r.enRetard) ? `${rapportsAFaireMoi.filter(r => r.enRetard).length} en retard` : undefined}
                  onClick={() => navigate('/rapports')}
                />
                <StatCard
                  icon={<Gauge size={16} strokeWidth={1.6} />}
                  value={conformitePct !== null ? `${conformitePct}%` : '—'}
                  label="Conformité métrologie"
                  sub={verifiTotal > 0 ? `${verifiConformes}/${verifiTotal} à jour` : 'Aucun instrument suivi'}
                  tone={conformitePct !== null && conformitePct < 80 ? 'warning' : 'success'}
                  progressPct={conformitePct ?? undefined}
                  onClick={() => navigate('/metrologie')}
                />
                <StatCard
                  icon={<Crosshair size={16} strokeWidth={1.6} />}
                  value={aCalibrrer}
                  label="À calibrer"
                  sub={aCalibrrer > 0 ? 'Étalonnages à prévoir' : 'Aucune échéance proche'}
                  tone={aCalibrrer > 0 ? 'warning' : 'accent'}
                  pill={aCalibrrer > 0 ? '≤ 30 j' : undefined}
                  onClick={() => navigate('/metrologie')}
                />
              </div>
            )}

            {/* Hero : planning dominant + rail droit */}
            <div className="grid grid-cols-1 md:grid-cols-[2.2fr_1fr] gap-[18px]">
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

              {/* Rail droit : État du parc + Actualités */}
              <div className="flex flex-col gap-[18px]">
                <div>
                  <SectionTitle>État du parc matériel</SectionTitle>
                  <div className="rounded-[var(--radius-md)] px-[17px] py-[17px] bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
                    <DonutChart
                      total={parcDonut.en_service + parcDonut.a_calibrer + parcDonut.en_maintenance + parcDonut.hors_service + parcDonut.prete}
                      segments={[
                        { value: parcDonut.en_service,     color: '#34C759',      label: 'En service'     },
                        { value: parcDonut.a_calibrer,     color: '#FF9F0A',      label: 'À calibrer'     },
                        { value: parcDonut.en_maintenance, color: 'var(--color-accent)',  label: 'En maintenance' },
                        { value: parcDonut.hors_service,   color: '#FF3B30',      label: 'Hors service'   },
                        { value: parcDonut.prete,          color: 'var(--color-neutral)', label: 'Prêté'          },
                      ]}
                    />
                  </div>
                  <button type="button" onClick={() => navigate('/materiel')} className="mt-2.5 text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer">
                    Voir tout le matériel →
                  </button>
                </div>

                <DashboardNewsWidget />
              </div>
            </div>

            {/* À traiter — carte à onglets (remplace les 5 accordéons + Todos) */}
            <ATraiterWidget
              todos={todos}
              uid={uid || ''}
              rapports={rapportsAFaireMoi}
              onMarkEnvoye={markRapportEnvoye}
              retards={prelevementsEnRetard}
              pluie={prelevementsPluie}
              maintenances={maintenancesActives}
              metrologie={metrologieAlertes}
            />
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
