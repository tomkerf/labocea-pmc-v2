import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectUid, selectAppUser, selectRole } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { saveClient } from '@/services/clientService'
import type { Client, Plan, Sampling } from '@/types'

export default function RapportsPage() {
  const navigate = useNavigate()
  const { clients } = useMissionsStore()
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)
  const role = useAuthStore(selectRole)
  const { users } = useUsersStore()
  useUsersListener()

  const equipements = useEquipementsStore((s) => s.equipements)
  const verifications = useMetrologieStore((s) => s.verifications)
  const maintenances = useMaintenancesStore((s) => s.maintenances)

  const isGeneraliste = role === 'admin' || role === 'charge_mission'
  const initiales = appUser?.initiales ?? ''

  const [touteEquipe, setTouteEquipe] = useState(isGeneraliste)

  const { rapportsAFaire, rapportsEnvoyes } = useDashboardStats({
    clients, uid: uid ?? '', initiales, isGeneraliste: touteEquipe,
    equipements, verifications, maintenances, evenements: [],
  })

  async function markEnvoye(clientId: string, planId: string, samplingId: string) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    const today = new Date().toISOString().slice(0, 10)
    await saveClient({
      ...client,
      plans: client.plans.map((plan: Plan) => plan.id !== planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== samplingId ? s : { ...s, rapportDate: today }
        ),
      }),
    }, uid)
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
    return u ? `${u.prenom} ${u.nom}` : doneBy || '—'
  }

  return (
    <div className="p-6 pb-10 max-w-4xl">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={22} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Rapports</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
          <button
            onClick={() => setTouteEquipe(false)}
            className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            style={{
              background: !touteEquipe ? 'var(--color-bg-secondary)' : 'transparent',
              color: !touteEquipe ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: !touteEquipe ? 'var(--shadow-card)' : 'none',
            }}
          >
            Mes rapports
          </button>
          <button
            onClick={() => setTouteEquipe(true)}
            className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            style={{
              background: touteEquipe ? 'var(--color-bg-secondary)' : 'transparent',
              color: touteEquipe ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: touteEquipe ? 'var(--shadow-card)' : 'none',
            }}
          >
            Toute l'équipe
          </button>
        </div>
      </div>

      {/* Section À envoyer */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            À envoyer
          </h2>
          {rapportsAFaire.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              {rapportsAFaire.length}
            </span>
          )}
        </div>

        {rapportsAFaire.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-secondary)' }}>
            ✓ Tous les rapports ont été envoyés.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {rapportsAFaire.map((r, i) => {
              const fmtDone = r.doneDate
                ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const today = new Date().toISOString().slice(0, 10)
              const joursAvant = r.rapportDatePrevue
                ? Math.floor((new Date(r.rapportDatePrevue).getTime() - new Date(today).getTime()) / 86400000)
                : null
              const delaiColor = joursAvant === null ? 'var(--color-text-tertiary)'
                : joursAvant < 0 ? 'var(--color-danger)'
                : joursAvant <= 7 ? 'var(--color-warning)'
                : 'var(--color-success)'
              const delaiBg = joursAvant === null ? 'var(--color-bg-tertiary)'
                : joursAvant < 0 ? 'var(--color-danger-light)'
                : joursAvant <= 7 ? 'var(--color-warning-light)'
                : 'var(--color-success-light)'
              const delaiLabel = joursAvant === null ? '—'
                : joursAvant < 0 ? `${Math.abs(joursAvant)}j de retard`
                : joursAvant === 0 ? 'Aujourd\'hui'
                : `dans ${joursAvant}j`

              return (
                <div key={r.samplingId}
                  className="flex items-center gap-3 px-4 py-3 flex-wrap"
                  style={{ borderBottom: i < rapportsAFaire.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {r.clientNom}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.siteNom} · intervention le {fmtDone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="date"
                      value={r.rapportDatePrevue}
                      onChange={(e) => updateDatePrevue(r.clientId, r.planId, r.samplingId, e.target.value)}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                    />
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: delaiBg, color: delaiColor }}>
                      {delaiLabel}
                    </span>
                    <button
                      onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}?sampling=${r.samplingId}`)}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium shrink-0"
                      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      Fiche
                    </button>
                    <button
                      onClick={() => markEnvoye(r.clientId, r.planId, r.samplingId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
                      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent)', (e.currentTarget.style.color = 'white'))}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent-light)', (e.currentTarget.style.color = 'var(--color-accent)'))}
                    >
                      Envoyé ✓
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section Envoyés */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Envoyés
          </h2>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            {rapportsEnvoyes.length}
          </span>
        </div>

        {rapportsEnvoyes.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-secondary)' }}>
            Aucun rapport envoyé pour le moment.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {rapportsEnvoyes.map((r, i) => {
              const fmtDone = r.doneDate
                ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const fmtEnvoye = r.rapportDatePrevue
                ? new Date(r.rapportDatePrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              return (
                <div key={r.samplingId}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < rapportsEnvoyes.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {r.clientNom}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.siteNom} · intervention le {fmtDone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Envoyé le {fmtEnvoye}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {resolveNom(r.doneBy)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
