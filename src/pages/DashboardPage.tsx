import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Route, BookOpen, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import DonutChart from '@/components/dashboard/DonutChart'
import { StatCard, SectionTitle, EmptyCard } from '@/components/dashboard/StatCard'
import { RapportsWidget } from '@/components/dashboard/RapportsWidget'
import { RetardWidget } from '@/components/dashboard/RetardWidget'
import { PluieWidget } from '@/components/dashboard/PluieWidget'
import { MaintenancesWidget } from '@/components/dashboard/MaintenancesWidget'
import { MetrologieWidget } from '@/components/dashboard/MetrologieWidget'
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
import { getGreeting, formatDate, localISO } from '@/lib/dashboardUtils'
import type { Sampling, Client, Plan } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const appUser   = useAuthStore(s => s.appUser)
  const prenom    = useAuthStore(selectPrenom)
  const initiales = useAuthStore(selectInitiales)
  const uid       = useAuthStore(selectUid)
  const role      = useAuthStore(selectRole)
  const isGeneraliste = role === 'charge_mission' || role === 'admin'

  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (appUser && appUser.hasSeenAide !== true) {
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

  const { clients }       = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { evenements }    = useEvenementsStore()
  const { maintenances }  = useMaintenancesStore()

  const [eventDetail, setEventDetail] = useState<{ event: ModalEvent; dateStr: string } | null>(null)
  const [planningMode, setPlanningMode] = useState<'today' | 'tomorrow'>('today')

  const {
    missionsCeMois, verifiTotal, verifiConformes, conformitePct,
    aCalibrrer, rapportsAFaireMoi, jourItems, lendemainItems, parcEtat,
    prelevementsEnRetard, prelevementsPluie, maintenancesActives, metrologieAlertes,
    techOptions: rawTechOptions,
  } = useDashboardStats({ clients, verifications, equipements, evenements, maintenances, uid, initiales, isGeneraliste })

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
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  } as const

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 pb-10 max-w-4xl"
    >

      {/* Salutation */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          {getGreeting()} {prenom || 'Thomas'} 👋
        </h1>
        <p className="text-base capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {formatDate()}
        </p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          value={missionsCeMois}
          label="Missions ce mois"
          sub="prélèvements réalisés"
          accent
          onClick={() => navigate('/missions')}
        />
        <StatCard
          value={rapportsAFaireMoi.length}
          label="Rapports à envoyer"
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
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Planning */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-2">
            <SectionTitle>{planningMode === 'today' ? 'Planning du jour' : 'Planning de demain'}</SectionTitle>
            {planningMode === 'today' && jourItems.filter(i => i.kind === 'sampling' && !i.modalEvent.isDone).length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02, y: -0.5 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                onClick={() => navigate('/tournee')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer shadow-sm"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                <Route size={13} />
                Démarrer la tournée
              </motion.button>
            )}
            <div className="relative flex gap-1 p-1 rounded-lg shrink-0" style={{ background: 'var(--color-bg-tertiary)' }}>
              <button
                onClick={() => setPlanningMode('today')}
                className="relative px-3 py-1.5 text-xs font-medium rounded-md z-10 transition-colors duration-200"
                style={{
                  color: planningMode === 'today' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {planningMode === 'today' && (
                  <motion.div
                    layoutId="active-dashboard-pill"
                    className="absolute inset-0 rounded-md -z-10"
                    style={{ background: 'var(--color-accent-light)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Aujourd'hui
              </button>
              <button
                onClick={() => setPlanningMode('tomorrow')}
                className="relative px-3 py-1.5 text-xs font-medium rounded-md z-10 transition-colors duration-200"
                style={{
                  color: planningMode === 'tomorrow' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {planningMode === 'tomorrow' && (
                  <motion.div
                    layoutId="active-dashboard-pill"
                    className="absolute inset-0 rounded-md -z-10"
                    style={{ background: 'var(--color-accent-light)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Demain
              </button>
            </div>
          </div>
          {activeItems.length === 0 ? (
            <EmptyCard>Aucune intervention ni événement{planningMode === 'today' ? " aujourd'hui" : " demain"}.</EmptyCard>
          ) : (
            <motion.div
              layout
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}
            >
              <AnimatePresence mode="popLayout">
                {activeItems.slice(0, 8).map((item, idx) => (
                  <motion.div
                    key={item.modalEvent?.id || `${planningMode}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={() => setEventDetail({ event: item.modalEvent as ModalEvent, dateStr: activeDateISO })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
                    style={{ borderBottom: idx < activeItems.slice(0, 8).length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
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
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <RapportsWidget rapports={rapportsAFaireMoi} onMarkEnvoye={markRapportEnvoye} />
        <RetardWidget items={prelevementsEnRetard} />
        <PluieWidget items={prelevementsPluie} />
        <MaintenancesWidget maintenances={maintenancesActives} />
        <MetrologieWidget equipements={metrologieAlertes} />
      </motion.div>

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

      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => dismissWelcome(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={18} />
              </button>

              <div className="p-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                  <BookOpen size={24} />
                </div>
                
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Bienvenue sur PMC V2 ! 👋
                </h3>
                
                <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  L'application a fait peau neuve. Pour découvrir les nouveautés et le fonctionnement général, n'hésite pas à consulter le mode d'emploi.
                </p>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => dismissWelcome(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-transform active:scale-95"
                    style={{ background: 'var(--color-accent)', color: 'white' }}
                  >
                    Lire le mode d'emploi
                  </button>
                  <button
                    onClick={() => dismissWelcome(false)}
                    className="w-full py-2 text-sm font-medium transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Plus tard
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
