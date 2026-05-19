import { useMemo } from 'react'
import { isSamplingOverdue } from '@/lib/overdue'
import { isThisMonth, localISO, isToday, daysDiff } from '@/lib/dashboardUtils'
import { calcStatut } from '@/hooks/useMetrologieRows'
import type { Client, Sampling, Verification, Equipement, Plan, EvenementPersonnel, Maintenance } from '@/types'

const EVENEMENT_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  rappel:  { label: 'Rappel',  bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
  reunion: { label: 'Réunion', bg: '#F3EEFF',                   color: '#7C3AED',                     dot: '#7C3AED'                    },
  rapport: { label: 'Rapport', bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
  autre:   { label: 'Autre',   bg: 'var(--color-bg-tertiary)',  color: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
}

export type SamplingBadge = { label: string; bg: string; color: string }

export type JourItem =
  | { kind: 'sampling';  time: string; title: string; sub: string; badge: SamplingBadge; dot: string; meteo: string; modalEvent: ModalEventRef }
  | { kind: 'evenement'; time: string; title: string; sub: string; badge: SamplingBadge; dot: string; modalEvent: ModalEventRef }

export interface ModalEventRef {
  id: string; type: string; title: string; subtitle: string
  statusLabel: string; statusBg: string; statusColor: string
  link: string; isDone: boolean; technicien: string
  clientId?: string; planId?: string; samplingId?: string; plannedTime?: string
  evenementData?: EvenementPersonnel
}

export interface RapportItem {
  clientId: string; planId: string; samplingId: string
  clientNom: string; siteNom: string; planNom: string
  doneDate: string; joursDepuis: number; enRetard: boolean
  /** rapportsAFaire: date d'envoi prévue (s.rapportDatePrevue) — rapportsEnvoyes: date d'envoi effectif (s.rapportDate) */
  rapportDatePrevue: string
  doneBy: string              // uid du technicien
}

export interface PluieItem {
  clientNom: string; siteNom: string; planNom: string
  clientId: string; planId: string; samplingId: string
  plannedMonth: number; plannedDay: number; overdue: boolean
}

export interface RetardItem {
  clientNom: string; siteNom: string; planNom: string
  clientId: string; planId: string; samplingId: string; meteo: string
}

interface Params {
  clients:       Client[]
  verifications: Verification[]
  equipements:   Equipement[]
  evenements:    EvenementPersonnel[]
  maintenances:  Maintenance[]
  uid:           string | null
  initiales:     string | null
  isGeneraliste: boolean
}

function getSamplingBadge(s: Sampling): SamplingBadge {
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
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

export function useDashboardStats({
  clients, verifications, equipements, evenements, maintenances,
  uid, initiales, isGeneraliste,
}: Params) {

  // ── KPIs ──────────────────────────────────────────────────

  const missionsCeMois = useMemo(() =>
    clients.reduce((count, client) =>
      count + client.plans.reduce((c, plan) =>
        c + plan.samplings.filter((s: Sampling) => s.status === 'done' && isThisMonth(s.doneDate)).length, 0), 0),
    [clients])

  const { verifiTotal, verifiConformes, conformitePct } = useMemo(() => {
    // Même logique que MerologiePage : vérifications + équipements sans vérif ayant prochainEtalonnage
    const verifEquipIds = new Set(verifications.map((v: Verification) => v.equipementId))
    const verifEquipNoms = new Set(verifications.map((v: Verification) => v.equipementNom))
    const equipsSansVerif = equipements.filter((e: Equipement) =>
      e.prochainEtalonnage && !verifEquipIds.has(e.id) && !verifEquipNoms.has(e.nom)
    )

    const verifDates = verifications.map((v: Verification) => v.prochainControle)
    const equipDates = equipsSansVerif.map((e: Equipement) => e.prochainEtalonnage)
    const allDates = [...verifDates, ...equipDates]

    const total = allDates.length
    const conformes = allDates.filter(d => calcStatut(d).key === 'ok').length
    return {
      verifiTotal:     total,
      verifiConformes: conformes,
      conformitePct:   total > 0 ? Math.round((conformes / total) * 100) : null,
    }
  }, [verifications, equipements])

  const aCalibrrer = useMemo(() => {
    // Équipements couverts par au moins une vérification → on utilise prochainControle de la vérif
    const verifIds = new Set(verifications.map((v: Verification) => v.equipementId))
    const verifNoms = new Set(verifications.map((v: Verification) => v.equipementNom))

    const verifsProches = verifications.filter(
      (v: Verification) => v.prochainControle && daysDiff(v.prochainControle) < 30
    ).length

    const equipsSansVerifProches = equipements.filter((e: Equipement) => {
      if (!e.prochainEtalonnage) return false
      if (verifIds.has(e.id) || verifNoms.has(e.nom)) return false
      return daysDiff(e.prochainEtalonnage) < 30
    }).length

    return verifsProches + equipsSansVerifProches
  }, [verifications, equipements])

  // ── Rapports à envoyer ────────────────────────────────────

  const rapportsAFaire = useMemo((): RapportItem[] => {
    const todayISO = new Date().toISOString().slice(0, 10)
    const result: RapportItem[] = []
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
            rapportDatePrevue: s.rapportDatePrevue ?? '',
            doneBy: s.doneBy ?? '',
          })
        })
      })
    })
    return result.sort((a, b) => b.joursDepuis - a.joursDepuis)
  }, [clients, isGeneraliste, uid, initiales])

  const rapportsEnvoyes = useMemo((): RapportItem[] => {
    const result: RapportItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach((plan: Plan) => {
        plan.samplings.forEach((s: Sampling) => {
          if (!s.rapportPrevu || !s.rapportDate) return
          if (!isGeneraliste) {
            const estMonRapport = s.doneBy ? s.doneBy === uid : client.preleveur === initiales
            if (!estMonRapport) return
          }
          result.push({
            clientId: client.id, planId: plan.id, samplingId: s.id,
            clientNom: client.nom, siteNom: plan.siteNom || plan.nom || '—', planNom: plan.nom || '—',
            doneDate: s.doneDate, joursDepuis: 0, enRetard: false,
            rapportDatePrevue: s.rapportDate,  // pour les envoyés : date effective (réutilise le champ "date à afficher")
            doneBy: s.doneBy ?? '',
          })
        })
      })
    })
    return result.sort((a, b) => b.rapportDatePrevue.localeCompare(a.rapportDatePrevue))
  }, [clients, isGeneraliste, uid, initiales])

  // ── Planning du jour ──────────────────────────────────────

  const jourItems = useMemo((): JourItem[] => {
    const todayISO     = localISO(new Date())
    const yesterdayISO = localISO(new Date(Date.now() - 86_400_000))
    const items: JourItem[] = []

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
          const modalEvent: ModalEventRef = {
            id: s.id, type: 'prelevement', title: client.nom, subtitle: sub,
            statusLabel: badge.label, statusBg: badge.bg, statusColor: dot,
            link: `/missions/${client.id}/plan/${plan.id}`,
            isDone: s.status === 'done', technicien: client.preleveur || '—',
            clientId: client.id, planId: plan.id, samplingId: s.id, plannedTime: s.plannedTime,
          }
          items.push({ kind: 'sampling', time: s.plannedTime ?? '', title: client.nom, sub, badge, dot, meteo: plan.meteo || '', modalEvent })
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
        const evModalEvent: ModalEventRef = {
          id: ev.id, type: 'evenement', title: ev.titre, subtitle: evSub,
          statusLabel: cfg.label, statusBg: cfg.bg, statusColor: cfg.color,
          link: '', isDone: false, technicien: ev.createdByInitiales || '—', evenementData: ev,
        }
        items.push({ kind: 'evenement', time: ev.heure ?? '', title: ev.titre, sub: evSub, badge: { label: cfg.label, bg: cfg.bg, color: cfg.color }, dot: cfg.dot, modalEvent: evModalEvent })
      })

    return items.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return -1
      if (!b.time) return 1
      return a.time.localeCompare(b.time)
    })
  }, [clients, evenements, initiales, isGeneraliste])

  // ── État du parc ──────────────────────────────────────────

  const parcEtat = useMemo(() => ({
    operationnel:   equipements.filter((e: Equipement) => e.etat === 'operationnel').length,
    en_maintenance: equipements.filter((e: Equipement) => e.etat === 'en_maintenance').length,
    hors_service:   equipements.filter((e: Equipement) => e.etat === 'hors_service').length,
    prete:          equipements.filter((e: Equipement) => e.etat === 'prete').length,
  }), [equipements])

  // ── Alertes ───────────────────────────────────────────────

  const prelevementsEnRetard = useMemo((): RetardItem[] => {
    const result: RetardItem[] = []
    clients.forEach((client: Client) => {
      const clientYear = Number(client.annee) || undefined
      client.plans.forEach((plan: Plan) =>
        plan.samplings.forEach((s: Sampling) => {
          if (isSamplingOverdue(s, clientYear) && plan.meteo !== 'pluie')
            result.push({ clientNom: client.nom, siteNom: plan.siteNom, planNom: plan.nom, clientId: client.id, planId: plan.id, samplingId: s.id, meteo: plan.meteo || '' })
        })
      )
    })
    return result
  }, [clients])

  const prelevementsPluie = useMemo((): PluieItem[] => {
    const result: PluieItem[] = []
    clients.forEach((client: Client) => {
      if (!isGeneraliste && initiales && client.preleveur && client.preleveur !== initiales) return
      const clientYear = Number(client.annee) || undefined
      client.plans.forEach((plan: Plan) => {
        if (plan.meteo !== 'pluie') return
        plan.samplings.forEach((s: Sampling) => {
          if (s.status === 'done' || s.status === 'non_effectue') return
          result.push({ clientNom: client.nom, siteNom: plan.siteNom, planNom: plan.nom, clientId: client.id, planId: plan.id, samplingId: s.id, plannedMonth: s.plannedMonth, plannedDay: s.plannedDay, overdue: isSamplingOverdue(s, clientYear) })
        })
      })
    })
    return result.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      if (a.plannedMonth !== b.plannedMonth) return a.plannedMonth - b.plannedMonth
      return a.plannedDay - b.plannedDay
    })
  }, [clients, isGeneraliste, initiales])

  const maintenancesActives = useMemo(() =>
    maintenances.filter((m: Maintenance) => {
      if (m.statut === 'en_cours') return true
      if (m.statut === 'planifiee') return daysDiff(m.datePrevue) <= 14
      return false
    }).slice(0, 8),
    [maintenances])

  const techOptions = useMemo(() => {
    const codes = new Set(clients.map((c: Client) => c.preleveur).filter(Boolean) as string[])
    return Array.from(codes).sort().map(code => ({ code, label: code }))
  }, [clients])

  return {
    missionsCeMois,
    verifiTotal, verifiConformes, conformitePct,
    aCalibrrer,
    rapportsAFaire,
    rapportsEnvoyes,
    jourItems,
    parcEtat,
    prelevementsEnRetard,
    prelevementsPluie,
    maintenancesActives,
    techOptions,
  }
}
