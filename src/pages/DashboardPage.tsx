import { useNavigate } from 'react-router-dom'

import DonutChart from '@/components/dashboard/DonutChart'
import { useAuthStore } from '@/stores/authStore'
import { useClientsListener } from '@/hooks/useClients'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import type { Sampling, Verification, Maintenance, Equipement } from '@/types'

// ── Helpers ────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function isThisMonth(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function daysDiff(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  return Math.round((target - Date.now()) / (1000 * 60 * 60 * 24))
}

// ── Composants ──────────────────────────────────────────────

interface StatCardProps {
  value: string | number
  label: string
  sub?: string
  accent?: boolean
  warning?: boolean
  danger?: boolean
}

function StatCard({ value, label, sub, accent, warning, danger }: StatCardProps) {
  const color = danger
    ? 'var(--color-danger)'
    : warning
    ? 'var(--color-warning)'
    : accent
    ? 'var(--color-accent)'
    : 'var(--color-text-primary)'

  return (
    <div className="rounded-xl p-5"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <p className="text-2xl font-bold mb-1" style={{ color, letterSpacing: '-0.5px' }}>{value}</p>
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{sub}</p>}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const prenom = useAuthStore((s) => s.prenom())

  // Listeners temps réel
  useClientsListener()
  useEquipementsListener()
  useVerificationsListener()
  useMaintenancesListener()

  const { clients } = useMissionsStore()
  const { equipements } = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances } = useMaintenancesStore()

  // ── KPIs ──────────────────────────────────────────────────

  // Missions ce mois = prélèvements avec status "done" ce mois
  const missionsCeMois = clients.reduce((count, client) => {
    return count + client.plans.reduce((c, plan) => {
      return c + plan.samplings.filter((s: Sampling) => s.status === 'done' && isThisMonth(s.doneDate)).length
    }, 0)
  }, 0)

  // Taux de conformité métrologique
  const verifiTotal = verifications.length
  const verifiConformes = verifications.filter((v: Verification) => v.resultat === 'conforme').length
  const conformitePct = verifiTotal > 0 ? Math.round((verifiConformes / verifiTotal) * 100) : null

  // Alertes métrologie (retard ou < 30j)
  const alertesMetro = verifications.filter((v: Verification) => {
    if (!v.prochainControle) return false
    return daysDiff(v.prochainControle) < 30
  })

  // Maintenances actives (planifiée ou en cours)
  const maintenancesActives = maintenances.filter(
    (m: Maintenance) => m.statut === 'planifiee' || m.statut === 'en_cours'
  )

  const alertesTotal = alertesMetro.length + maintenancesActives.length

  // Équipements à calibrer (prochainEtalonnage dans < 30j)
  const aCalibrrer = equipements.filter((e: Equipement) => {
    if (!e.prochainEtalonnage) return false
    return daysDiff(e.prochainEtalonnage) < 30
  }).length

  // ── Planning du jour = prélèvements planifiés aujourd'hui ──

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

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

  const planningJour: { clientNom: string; siteNom: string; planId: string; clientId: string; sampling: Sampling; planNom: string }[] = []
  clients.forEach((client) => {
    client.plans.forEach((plan) => {
      plan.samplings.forEach((s: Sampling) => {
        const plannedDate = s.doneDate
          ? s.doneDate
          : new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay || 1).toISOString().split('T')[0]
        if (isToday(plannedDate) || (s.status === 'planned' && isToday(
          new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay || 1).toISOString().split('T')[0]
        ))) {
          planningJour.push({ clientNom: client.nom, siteNom: plan.siteNom, planNom: plan.nom, planId: plan.id, clientId: client.id, sampling: s })
        }
      })
    })
  })

  planningJour.sort((a, b) => {
    const ta = a.sampling.plannedTime ?? '99:99'
    const tb = b.sampling.plannedTime ?? '99:99'
    return ta.localeCompare(tb)
  })

  // ── État du parc ───────────────────────────────────────────

  const parcEtat = {
    operationnel: equipements.filter((e: Equipement) => e.etat === 'operationnel').length,
    en_maintenance: equipements.filter((e: Equipement) => e.etat === 'en_maintenance').length,
    hors_service: equipements.filter((e: Equipement) => e.etat === 'hors_service').length,
    prete: equipements.filter((e: Equipement) => e.etat === 'prete').length,
  }

  // ── Alertes combinées triées par urgence ───────────────────

  const alertesCombinees: { label: string; detail: string; link: string; isUrgent: boolean }[] = [
    ...alertesMetro.map((v: Verification) => ({
      label: v.equipementNom || 'Équipement',
      detail: v.prochainControle
        ? daysDiff(v.prochainControle) < 0
          ? `Étalonnage en retard de ${Math.abs(daysDiff(v.prochainControle))}j`
          : `Étalonnage dans ${daysDiff(v.prochainControle)}j`
        : 'Étalonnage non planifié',
      link: `/metrologie/${v.id}`,
      isUrgent: daysDiff(v.prochainControle) < 0,
    })),
    ...maintenancesActives.map((m: Maintenance) => ({
      label: m.equipementNom || 'Équipement',
      detail: m.statut === 'en_cours' ? 'Maintenance en cours' : `Maintenance planifiée le ${m.datePrevue ? new Date(m.datePrevue).toLocaleDateString('fr-FR') : '—'}`,
      link: `/maintenances/${m.id}`,
      isUrgent: m.statut === 'en_cours',
    })),
  ].sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0)).slice(0, 6)

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl">

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
        <StatCard
          value={missionsCeMois}
          label="Missions ce mois"
          sub="prélèvements réalisés"
          accent
        />
        <StatCard
          value={conformitePct !== null ? `${conformitePct}%` : '—'}
          label="Conformité métrologie"
          sub={verifiTotal > 0 ? `${verifiConformes}/${verifiTotal} conformes` : 'Aucune vérification'}
          warning={conformitePct !== null && conformitePct < 80}
          accent={conformitePct !== null && conformitePct >= 80}
        />
        <StatCard
          value={alertesTotal}
          label="Alertes actives"
          sub={alertesTotal > 0 ? `${alertesMetro.length} métrologie · ${maintenancesActives.length} maintenance` : 'Tout est à jour'}
          danger={alertesTotal > 0}
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
          {planningJour.length === 0 ? (
            <EmptyCard>Aucun prélèvement prévu aujourd'hui.</EmptyCard>
          ) : (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              {planningJour.slice(0, 6).map(({ clientNom, siteNom, planNom, planId, clientId, sampling }, i) => {
                const cfg = getSamplingBadge(sampling)
                return (
                  <button key={`${planId}-${sampling.id}`}
                    onClick={() => navigate(`/missions/${clientId}/plan/${planId}/sampling/${sampling.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ borderBottom: i < planningJour.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {sampling.plannedTime && (
                      <span className="text-xs font-semibold shrink-0 w-10 text-center px-1.5 py-1 rounded-lg"
                        style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                        {sampling.plannedTime}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{clientNom}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {[siteNom, planNom].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* État du parc — Donut chart */}
        <div>
          <SectionTitle>État du parc matériel</SectionTitle>
          <div className="rounded-xl px-6 py-5"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <DonutChart
              total={equipements.length}
              segments={[
                { value: parcEtat.operationnel,    color: 'var(--color-success)', label: 'En service'      },
                { value: aCalibrrer,               color: 'var(--color-warning)', label: 'À calibrer'      },
                { value: parcEtat.en_maintenance,  color: 'var(--color-accent)',  label: 'En maintenance'  },
                { value: parcEtat.hors_service,    color: 'var(--color-danger)',  label: 'Hors service'    },
              ]}
            />
          </div>
          <button onClick={() => navigate('/materiel')}
            className="mt-2 text-xs" style={{ color: 'var(--color-accent)' }}>
            Voir tout le matériel →
          </button>
        </div>
      </div>

      {/* Alertes */}
      {alertesCombinees.length > 0 && (
        <div className="mb-6">
          <SectionTitle>Alertes importantes</SectionTitle>
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {alertesCombinees.map(({ label, detail, link, isUrgent }, i) => (
              <button key={link + i}
                onClick={() => navigate(link)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors"
                style={{ borderBottom: i < alertesCombinees.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="shrink-0 w-2 h-2 rounded-full"
                  style={{ background: isUrgent ? 'var(--color-danger)' : 'var(--color-warning)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{detail}</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-accent)' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Helpers UI ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase mb-3"
      style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
      {children}
    </h2>
  )
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-5 py-8 text-center"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
      <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{children}</p>
    </div>
  )
}
