import { useNavigate } from 'react-router-dom'

import DonutChart from '@/components/dashboard/DonutChart'
import { useAuthStore, selectPrenom, selectInitiales } from '@/stores/authStore'
import { useClientsListener } from '@/hooks/useClients'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsListener } from '@/hooks/useEvenements'
import { useEvenementsStore } from '@/stores/evenementsStore'
import type { Sampling, Verification, Maintenance, Equipement, Client, Plan, EvenementPersonnel } from '@/types'
import { isSamplingOverdue } from '@/lib/overdue'

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

function localISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
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
  const prenom = useAuthStore(selectPrenom)
  const initiales = useAuthStore(selectInitiales)

  // Listeners temps réel
  useClientsListener()
  useEquipementsListener()
  useVerificationsListener()
  useMaintenancesListener()
  useEvenementsListener()

  const { clients } = useMissionsStore()
  const { equipements } = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances } = useMaintenancesStore()
  const { evenements } = useEvenementsStore()

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

  // Équipements sans enregistrement de vérification (même logique que MerologiePage)
  const equipementsWithoutVerif = equipements.filter((e: Equipement) => {
    if (!e.prochainEtalonnage) return false
    return !verifications.some((v: Verification) => v.equipementId === e.id)
  })

  // Alertes métrologie — deux sources : verifications + équipements orphelins
  // (en retard = diff < 0, à prévoir = 0 ≤ diff < 30j)
  const alertesMetroVerif = verifications.filter((v: Verification) => {
    if (!v.prochainControle) return false
    return daysDiff(v.prochainControle) < 30
  })
  const alertesMetroEq = equipementsWithoutVerif.filter((e: Equipement) =>
    daysDiff(e.prochainEtalonnage) < 30
  )
  const alertesMetro = [...alertesMetroVerif, ...alertesMetroEq]

  // Maintenances actives (planifiée ou en cours)
  const maintenancesActives = maintenances.filter(
    (m: Maintenance) => m.statut === 'planifiee' || m.statut === 'en_cours'
  )

  const alertesTotal = alertesMetro.length + maintenancesActives.length

  // À calibrer : verifications OU équipements orphelins avec échéance dans 0–30j
  const aCalibrrer = [
    ...verifications.filter((v: Verification) => {
      if (!v.prochainControle) return false
      const d = daysDiff(v.prochainControle)
      return d >= 0 && d < 30
    }),
    ...equipementsWithoutVerif.filter((e: Equipement) => {
      const d = daysDiff(e.prochainEtalonnage)
      return d >= 0 && d < 30
    }),
  ].length

  // ── Planning du jour = prélèvements + événements d'aujourd'hui ──

  const todayISO = localISO(new Date())
  const yesterdayISO = localISO(new Date(Date.now() - 86_400_000))
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

  const EVENEMENT_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    rappel:  { label: 'Rappel',  bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
    reunion: { label: 'Réunion', bg: '#F3EEFF',                    color: '#7C3AED',               dot: '#7C3AED'               },
    rapport: { label: 'Rapport', bg: 'var(--color-warning-light)', color: 'var(--color-warning)',  dot: 'var(--color-warning)'  },
    autre:   { label: 'Autre',   bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
  }

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

  // Prélèvements du jour
  type JourItem =
    | { kind: 'sampling'; time: string; title: string; sub: string; badge: { label: string; bg: string; color: string }; dot: string; link: string }
    | { kind: 'evenement'; time: string; title: string; sub: string; badge: { label: string; bg: string; color: string }; dot: string }

  const jourItems: JourItem[] = []

  clients.forEach((client) => {
    if (initiales && client.preleveur && client.preleveur !== initiales) return
    client.plans.forEach((plan) => {
      // Détecte un offset J2, J3… dans le nom du plan (ex : "Bilan 24h J2" → offset 1 jour)
      const planNom = `${plan.nom || ''} ${plan.siteNom || ''}`
      const jMatch = planNom.match(/\bJ(\d+)\b/)
      const dayOffset = jMatch ? parseInt(jMatch[1]) - 1 : 0

      plan.samplings.forEach((s: Sampling) => {
        const baseDate = s.doneDate
          ? s.doneDate
          : localISO(new Date(new Date().getFullYear(), s.plannedMonth, (s.plannedDay || 1) + dayOffset))
        const plannedDate = baseDate
        // Un prélèvement d'hier encore "planned" est un J2 à faire aujourd'hui
        const isJ2Today = plannedDate === yesterdayISO && s.status === 'planned'
        if (isToday(plannedDate) || isJ2Today) {
          const badge = getSamplingBadge(s)
          const samplingDot = s.status === 'done'
            ? 'var(--color-success)'
            : s.status === 'overdue'
            ? 'var(--color-danger)'
            : 'var(--color-accent)'
          jourItems.push({
            kind: 'sampling',
            time: s.plannedTime ?? '',
            title: client.nom,
            sub: [plan.siteNom, plan.nom].filter(Boolean).join(' · ') || '—',
            badge,
            dot: samplingDot,
            link: `/missions/${client.id}/plan/${plan.id}`,
          })
        }
      })
    })
  })

  // Événements du jour (date ≤ today ≤ dateFin ou date === today)
  evenements
    .filter((ev: EvenementPersonnel) => {
      // Filtrer par technicien connecté
      if (initiales && ev.createdByInitiales && ev.createdByInitiales !== initiales) return false
      if (ev.dateFin && ev.dateFin > ev.date) {
        // Événement multi-jours : today doit être dans la plage
        return ev.date <= todayISO && ev.dateFin >= todayISO
      }
      // Événement ponctuel : uniquement le jour exact
      return ev.date === todayISO
    })
    .forEach((ev: EvenementPersonnel) => {
      const cfg = EVENEMENT_CFG[ev.type] ?? EVENEMENT_CFG.autre
      jourItems.push({
        kind: 'evenement',
        time: ev.heure ?? '',
        title: ev.titre,
        sub: [ev.createdByInitiales, ev.notes].filter(Boolean).join(' · ') || cfg.label,
        badge: { label: cfg.label, bg: cfg.bg, color: cfg.color },
        dot: cfg.dot,
      })
    })

  jourItems.sort((a, b) => {
    if (!a.time && !b.time) return 0
    if (!a.time) return -1   // sans heure → en haut
    if (!b.time) return 1
    return a.time.localeCompare(b.time)
  })

  // ── État du parc ───────────────────────────────────────────

  const parcEtat = {
    operationnel: equipements.filter((e: Equipement) => e.etat === 'operationnel').length,
    en_maintenance: equipements.filter((e: Equipement) => e.etat === 'en_maintenance').length,
    hors_service: equipements.filter((e: Equipement) => e.etat === 'hors_service').length,
    prete: equipements.filter((e: Equipement) => e.etat === 'prete').length,
  }

  // ── Alertes combinées triées par urgence ───────────────────

  // Prélèvements en retard
  const prelevementsEnRetard: { clientNom: string; siteNom: string; planNom: string; clientId: string; planId: string; samplingId: string }[] = []
  clients.forEach((client: Client) =>
    client.plans.forEach((plan: Plan) =>
      plan.samplings.forEach((s: Sampling) => {
        if (isSamplingOverdue(s))
          prelevementsEnRetard.push({
            clientNom: client.nom,
            siteNom: plan.siteNom,
            planNom: plan.nom,
            clientId: client.id,
            planId: plan.id,
            samplingId: s.id,
          })
      })
    )
  )

  const alertesCombinees: { label: string; detail: string; link: string; isUrgent: boolean }[] = [
    ...(prelevementsEnRetard.length > 0 ? [{
      label: `${prelevementsEnRetard.length} prélèvement${prelevementsEnRetard.length > 1 ? 's' : ''} en retard`,
      detail: prelevementsEnRetard.slice(0, 2).map((p) => p.clientNom).join(', ')
        + (prelevementsEnRetard.length > 2 ? `… +${prelevementsEnRetard.length - 2}` : ''),
      link: '/planning',
      isUrgent: true,
    }] : []),
    ...alertesMetroVerif.map((v: Verification) => ({
      label: v.equipementNom || 'Équipement',
      detail: daysDiff(v.prochainControle) < 0
        ? `Étalonnage en retard de ${Math.abs(daysDiff(v.prochainControle))}j`
        : `Étalonnage dans ${daysDiff(v.prochainControle)}j`,
      link: `/metrologie/${v.id}`,
      isUrgent: daysDiff(v.prochainControle) < 0,
    })),
    ...alertesMetroEq.map((e: Equipement) => ({
      label: e.nom || 'Équipement',
      detail: daysDiff(e.prochainEtalonnage) < 0
        ? `Étalonnage en retard de ${Math.abs(daysDiff(e.prochainEtalonnage))}j`
        : `Étalonnage dans ${daysDiff(e.prochainEtalonnage)}j`,
      link: `/materiel/${e.id}`,
      isUrgent: daysDiff(e.prochainEtalonnage) < 0,
    })),
    ...maintenancesActives.map((m: Maintenance) => ({
      label: m.equipementNom || 'Équipement',
      detail: m.statut === 'en_cours' ? 'Maintenance en cours' : `Maintenance planifiée le ${m.datePrevue ? new Date(m.datePrevue).toLocaleDateString('fr-FR') : '—'}`,
      link: `/maintenances/${m.id}`,
      isUrgent: m.statut === 'en_cours',
    })),
  ].sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0)).slice(0, 8)

  // ── Render ─────────────────────────────────────────────────

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
          {jourItems.length === 0 ? (
            <EmptyCard>Aucune intervention ni événement aujourd'hui.</EmptyCard>
          ) : (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              {jourItems.slice(0, 8).map((item, i) => (
                <div key={i}
                  onClick={() => item.kind === 'sampling' ? navigate(item.link) : navigate('/planning')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
                  style={{ borderBottom: i < jourItems.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Heure ou point coloré */}
                  {item.time ? (
                    <span className="text-xs font-semibold shrink-0 w-10 text-center px-1.5 py-1 rounded-lg"
                      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                      {item.time}
                    </span>
                  ) : (
                    <span className="shrink-0 w-2 h-2 rounded-full mt-0.5"
                      style={{ background: item.dot }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.sub}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                    style={{ background: item.badge.bg, color: item.badge.color }}>{item.badge.label}</span>
                </div>
              ))}
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
