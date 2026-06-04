import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectUid, selectAppUser } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useClientsListener } from '@/hooks/useClients'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { saveClient } from '@/services/clientService'
import type { Client, Plan, Sampling } from '@/types'
import { COLORS } from '@/lib/constants'


export default function RapportsPage() {
  const navigate = useNavigate()
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const { clients } = useMissionsStore()
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)
  const { users } = useUsersStore()
  useUsersListener()
  useClientsListener()

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

  return (
    <div className="px-4 py-6 pb-10 sm:px-6 max-w-4xl">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <FileText size={22} strokeWidth={1.5} style={{ color: COLORS.ACCENT }} />
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Rapports</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}>
          <button type="button"
            onClick={() => setTouteEquipe(false)}
            className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            style={{
              background: !touteEquipe ? COLORS.BG_SECONDARY : 'transparent',
              color: !touteEquipe ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
              boxShadow: !touteEquipe ? 'var(--shadow-card)' : 'none',
            }}
          >
            Mes rapports
          </button>
          <button type="button"
            onClick={() => setTouteEquipe(true)}
            className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            style={{
              background: touteEquipe ? COLORS.BG_SECONDARY : 'transparent',
              color: touteEquipe ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
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
            À rédiger
          </h2>
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
            {Object.entries(
              rapportsAFaire.reduce<Record<string, typeof rapportsAFaire>>((acc, r) => {
                ;(acc[r.clientId] ??= []).push(r)
                return acc
              }, {})
            ).map(([clientId, clientRows]) => {
              const bySite = clientRows.reduce<Record<string, typeof clientRows>>((acc, r) => {
                ;(acc[r.siteNom] ??= []).push(r)
                return acc
              }, {})
              const siteEntries = Object.entries(bySite)
              return (
                <div key={clientId} className="rounded-xl overflow-hidden"
                  style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_TERTIARY }}>
                    <p className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{clientRows[0].clientNom}</p>
                  </div>
                  {siteEntries.map(([siteNom, rows], si) => (
                    <div key={siteNom}>
                      {siteEntries.length > 1 && (
                        <div className="px-4 py-1.5" style={{
                          borderBottom: '1px solid var(--color-border-subtle)',
                          borderTop: si > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                          background: COLORS.BG_PRIMARY,
                        }}>
                          <p className="text-[11px] font-medium uppercase" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{siteNom}</p>
                        </div>
                      )}
                      {rows.map((r, i) => {
                        const fmtDone = r.doneDate
                          ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                        const joursAvant = r.rapportDatePrevue
                          ? Math.floor((new Date(r.rapportDatePrevue).getTime() - new Date(todayStr).getTime()) / 86400000)
                          : null
                        const delaiColor = joursAvant === null ? 'var(--color-text-tertiary)'
                          : joursAvant < 0 ? COLORS.DANGER
                          : joursAvant <= 7 ? COLORS.WARNING
                          : COLORS.SUCCESS
                        const delaiBg = joursAvant === null ? COLORS.BG_TERTIARY
                          : joursAvant < 0 ? 'var(--color-danger-light)'
                          : joursAvant <= 7 ? 'var(--color-warning-light)'
                          : 'var(--color-success-light)'
                        const delaiLabel = joursAvant === null ? '—'
                          : joursAvant < 0 ? `${Math.abs(joursAvant)}j de retard`
                          : joursAvant === 0 ? 'Aujourd\'hui'
                          : `dans ${joursAvant}j`
                        const isLast = si === siteEntries.length - 1 && i === rows.length - 1
                        return (
                          <div key={r.samplingId}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3"
                            style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                                {r.planNom} · <span style={{ color: COLORS.TEXT_SECONDARY }}>{r.siteNom}</span>
                              </p>
                              <p className="text-xs truncate" style={{ color: COLORS.TEXT_SECONDARY }}>
                                intervention le {fmtDone}
                                {touteEquipe && <span style={{ color: 'var(--color-text-tertiary)' }}> · {resolveNom(r.doneBy)}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                              <input
                                type="date"
                                defaultValue={r.rapportDatePrevue}
                                onBlur={(e) => { if (e.target.value !== r.rapportDatePrevue) updateDatePrevue(r.clientId, r.planId, r.samplingId, e.target.value) }}
                                className="rounded-md px-2 py-1 text-xs"
                                style={{ border: '1px solid var(--color-border)', background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}
                              />
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: delaiBg, color: delaiColor }}>
                                {delaiLabel}
                              </span>
                              <button type="button"
                                onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}?sampling=${r.samplingId}`)}
                                className="px-2 py-1.5 rounded-lg text-xs font-medium"
                                style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}
                              >
                                Fiche
                              </button>
                              <button type="button"
                                onClick={() => markEnvoye(r.clientId, r.planId, r.samplingId)}
                                disabled={sending.has(r.samplingId)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                style={{
                                  background: sending.has(r.samplingId) ? COLORS.BG_TERTIARY : 'var(--color-accent-light)',
                                  color: sending.has(r.samplingId) ? 'var(--color-text-tertiary)' : COLORS.ACCENT,
                                  cursor: sending.has(r.samplingId) ? 'not-allowed' : 'pointer',
                                }}
                                onMouseEnter={e => { if (!sending.has(r.samplingId)) { e.currentTarget.style.background = COLORS.ACCENT; e.currentTarget.style.color = 'white' } }}
                                onMouseLeave={e => { if (!sending.has(r.samplingId)) { e.currentTarget.style.background = 'var(--color-accent-light)'; e.currentTarget.style.color = COLORS.ACCENT } }}
                              >
                                {sending.has(r.samplingId) ? '…' : 'Marquer rédigé'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
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
            Rédigés
          </h2>
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
            {Object.entries(
              rapportsEnvoyes.reduce<Record<string, typeof rapportsEnvoyes>>((acc, r) => {
                ;(acc[r.clientId] ??= []).push(r)
                return acc
              }, {})
            ).map(([clientId, clientRows]) => {
              const bySite = clientRows.reduce<Record<string, typeof clientRows>>((acc, r) => {
                ;(acc[r.siteNom] ??= []).push(r)
                return acc
              }, {})
              const siteEntries = Object.entries(bySite)
              return (
                <div key={clientId} className="rounded-xl overflow-hidden"
                  style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_TERTIARY }}>
                    <p className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{clientRows[0].clientNom}</p>
                  </div>
                  {siteEntries.map(([siteNom, rows], si) => (
                    <div key={siteNom}>
                      {siteEntries.length > 1 && (
                        <div className="px-4 py-1.5" style={{
                          borderBottom: '1px solid var(--color-border-subtle)',
                          borderTop: si > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                          background: COLORS.BG_PRIMARY,
                        }}>
                          <p className="text-[11px] font-medium uppercase" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{siteNom}</p>
                        </div>
                      )}
                      {rows.map((r, i) => {
                        const fmtDone = r.doneDate
                          ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                        const fmtEnvoye = r.rapportDatePrevue
                          ? new Date(r.rapportDatePrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                        const isLast = si === siteEntries.length - 1 && i === rows.length - 1
                        return (
                          <div key={r.samplingId}
                            className="flex items-center gap-3 px-4 py-3"
                            style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}>
                            <span className="shrink-0 size-2 rounded-full" style={{ background: COLORS.SUCCESS }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                                {r.planNom} · <span style={{ color: COLORS.TEXT_SECONDARY }}>{r.siteNom}</span>
                              </p>
                              <p className="text-xs truncate" style={{ color: COLORS.TEXT_SECONDARY }}>
                                intervention le {fmtDone}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
                                Rédigé le {fmtEnvoye}
                              </span>
                              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                {resolveNom(r.doneBy)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
