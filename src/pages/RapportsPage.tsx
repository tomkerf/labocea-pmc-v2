import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ChevronLeft } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectUid, selectAppUser } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { saveClient } from '@/services/clientService'
import type { Client, Plan, Sampling } from '@/types'
import type { RapportItem } from '@/hooks/useDashboardStats'
import { COLORS } from '@/lib/constants'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import RapportClientGroup from '@/components/rapports/RapportClientGroup'
import RapportRow from '@/components/rapports/RapportRow'
import RapportEnvoyeRow from '@/components/rapports/RapportEnvoyeRow'

function groupByClient(items: RapportItem[]) {
  return Object.entries(
    items.reduce<Record<string, RapportItem[]>>((acc, r) => {
      ;(acc[r.clientId] ??= []).push(r)
      return acc
    }, {})
  ).map(([clientId, clientRows]) => {
    const bySite = clientRows.reduce<Record<string, RapportItem[]>>((acc, r) => {
      ;(acc[r.siteNom] ??= []).push(r)
      return acc
    }, {})
    return { clientId, clientNom: clientRows[0].clientNom, siteEntries: Object.entries(bySite) }
  })
}

export default function RapportsPage() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const { clients } = useMissionsStore()
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)
  const { users } = useUsersStore()

  const equipements = useEquipementsStore((s) => s.equipements)
  const verifications = useMetrologieStore((s) => s.verifications)
  const maintenances = useMaintenancesStore((s) => s.maintenances)

  const initiales = appUser?.initiales ?? ''
  const [touteEquipe, setTouteEquipe] = useState(false)
  const [sending, setSending] = useState<Set<string>>(new Set())

  const { rapportsAFaire, rapportsEnvoyes } = useDashboardStats({
    clients, uid: uid ?? '', initiales, isGeneraliste: touteEquipe,
    equipements, verifications, maintenances, evenements: [], todos: [],
  })

  async function markEnvoye(clientId: string, planId: string, samplingId: string) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    setSending(prev => new Set(prev).add(samplingId))
    try {
      const today = new Date().toISOString().slice(0, 10)
      await saveClient({
        ...client,
        plans: client.plans.map((plan: Plan) => plan.id !== planId ? plan : {
          ...plan,
          samplings: plan.samplings.map((s: Sampling) =>
            s.id !== samplingId ? s : { ...s, rapportDate: today, rapportPrevu: true }
          ),
        }),
      }, uid)
    } finally {
      setSending(prev => { const next = new Set(prev); next.delete(samplingId); return next })
    }
  }

  async function updateDatePrevue(clientId: string, planId: string, samplingId: string, date: string) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    await saveClient({
      ...client,
      plans: client.plans.map((plan: Plan) => plan.id !== planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== samplingId ? s : { ...s, rapportDatePrevue: date }
        ),
      }),
    }, uid)
  }

  function resolveNom(doneBy: string) {
    const u = users.find((u) => u.uid === doneBy)
    return u ? `${u.prenom} ${u.nom}` : '—'
  }

  const aFaireGroups = useMemo(() => groupByClient(rapportsAFaire), [rapportsAFaire])
  const envoyesGroups = useMemo(() => groupByClient(rapportsEnvoyes), [rapportsEnvoyes])

  return (
    <div className="px-4 py-6 pb-10 sm:px-6 max-w-4xl">
      {/* Bouton retour mobile */}
      <div className="md:hidden mb-4">
        <Link to="/plus" className="inline-flex items-center gap-1 font-semibold text-sm transition-opacity active:opacity-80" style={{ color: COLORS.ACCENT }}>
          <ChevronLeft size={16} />
          Plus
        </Link>
      </div>

      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={22} strokeWidth={1.5} style={{ color: COLORS.ACCENT }} />
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Rapports</h1>
        </div>
        <SegmentedControl
          options={[
            { value: 'moi', label: 'Mes rapports' },
            { value: 'equipe', label: "Équipe" },
          ]}
          value={touteEquipe ? 'equipe' : 'moi'}
          onChange={(v) => setTouteEquipe(v === 'equipe')}
        />
      </div>

      {/* Section À rédiger */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>À rédiger</h2>
          {rapportsAFaire.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
              {rapportsAFaire.length}
            </span>
          )}
        </div>
        {rapportsAFaire.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: COLORS.TEXT_SECONDARY }}>
            ✓ Tous les rapports ont été rédigés.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {aFaireGroups.map(({ clientId, clientNom, siteEntries }) => (
              <RapportClientGroup key={clientId} clientNom={clientNom} siteEntries={siteEntries}
                renderRow={(r, isLast) => (
                  <RapportRow key={r.samplingId} r={r} isLast={isLast} todayStr={todayStr}
                    touteEquipe={touteEquipe} resolveNom={resolveNom} sending={sending}
                    onMark={markEnvoye} onUpdateDate={updateDatePrevue} />
                )}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section Rédigés */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>Rédigés</h2>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-success-light)', color: COLORS.SUCCESS }}>
            {rapportsEnvoyes.length}
          </span>
        </div>
        {rapportsEnvoyes.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: COLORS.TEXT_SECONDARY }}>
            Aucun rapport rédigé pour le moment.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {envoyesGroups.map(({ clientId, clientNom, siteEntries }) => (
              <RapportClientGroup key={clientId} clientNom={clientNom} siteEntries={siteEntries}
                renderRow={(r, isLast) => (
                  <RapportEnvoyeRow key={r.samplingId} r={r} isLast={isLast} resolveNom={resolveNom} />
                )}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
