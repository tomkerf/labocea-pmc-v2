import { useMemo, useState } from 'react'
import { isSamplingOverdue } from '@/lib/overdue'
import { calcStatut } from '@/hooks/useMetrologieRows'
import { isThisMonth, localISO, isToday, daysDiff } from '@/lib/dashboardUtils'

import type { Client, Sampling, Verification, Equipement, Plan, EvenementPersonnel, Maintenance, Todo } from '@/types'
import { COLORS } from '@/lib/constants'


const EVENEMENT_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  rappel:  { label: 'Rappel',  bg: COLORS.BG_TERTIARY,  color: COLORS.TEXT_SECONDARY, dot: 'var(--color-text-tertiary)' },
  reunion: { label: 'Réunion', bg: '#F3EEFF',                   color: '#7C3AED',                     dot: '#7C3AED'                    },
  rapport: { label: 'Rapport', bg: COLORS.BG_TERTIARY,  color: COLORS.TEXT_SECONDARY, dot: 'var(--color-text-tertiary)' },
  autre:   { label: 'Autre',   bg: COLORS.BG_TERTIARY,  color: COLORS.TEXT_SECONDARY, dot: 'var(--color-text-tertiary)' },
}

export type SamplingBadge = { label: string; bg: string; color: string }

export type JourItem =
  | { kind: 'sampling';  time: string; title: string; sub: string; badge: SamplingBadge; dot: string; meteo: string; cofrac: boolean; modalEvent: ModalEventRef; isJ1Bilan24?: boolean }
  | { kind: 'evenement'; time: string; title: string; sub: string; badge: SamplingBadge; dot: string; modalEvent: ModalEventRef }
  | { kind: 'todo';      time: string; title: string; sub: string; badge: SamplingBadge; dot: string; link: string }

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
  todos:         Todo[]
  uid:           string | null
  initiales:     string | null
  isGeneraliste: boolean
}

function getSamplingBadge(s: Sampling): SamplingBadge {
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  if (s.status === 'done')         return { label: 'Réalisé',  bg: 'var(--color-success-light)', color: COLORS.SUCCESS }
  if (s.status === 'overdue')      return { label: 'Urgent',   bg: 'var(--color-danger-light)',  color: COLORS.DANGER }
  if (s.status === 'non_effectue') return { label: 'Non fait', bg: 'var(--color-warning-light)', color: COLORS.WARNING }
  if (s.plannedTime) {
    const [h, m] = s.plannedTime.split(':').map(Number)
    const tMin = h * 60 + m
    if (nowMinutes >= tMin && nowMinutes < tMin + 120) return { label: 'En cours', bg: 'var(--color-accent-light)', color: COLORS.ACCENT }
  }
  return { label: 'À faire', bg: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }
}

export function useDashboardStats({
  clients, verifications, equipements, evenements, maintenances,
  uid, initiales, isGeneraliste,
}: Params) {
  const [nowMs] = useState(() => Date.now())

  // ── KPIs ──────────────────────────────────────────────────

  const missionsCeMois = useMemo(() =>
    clients.reduce((count, client) =>
      count + client.plans.reduce((c, plan) =>
        c + plan.samplings.filter((s: Sampling) => s.status === 'done' && isThisMonth(s.doneDate)).length, 0), 0),
    [clients])

  const { verifiTotal, verifiConformes, conformitePct } = useMemo(() => {
    const total = verifications.length
    const conformes = verifications.filter((v: Verification) =>
      v.resultat ? v.resultat === 'conforme' : calcStatut(v.prochainControle).key === 'ok'
    ).length
    return {
      verifiTotal:     total,
      verifiConformes: conformes,
      conformitePct:   total > 0 ? Math.round((conformes / total) * 100) : null,
    }
  }, [verifications])

  const aCalibrrer = useMemo(() => {
    let count = 0
    equipements.forEach((e: Equipement) => {
      const eqVerifs = verifications.filter((v: Verification) => v.equipementId === e.id || v.equipementNom === e.nom)
      if (eqVerifs.length > 0) {
        const latest = eqVerifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        if (latest.prochainControle && daysDiff(latest.prochainControle) < 30) count++
      } else {
        if (e.prochainEtalonnage && daysDiff(e.prochainEtalonnage) < 30) count++
      }
    })
    return count
  }, [verifications, equipements])

  // ── Rapports à envoyer ────────────────────────────────────

  const rapportsAFaire = useMemo((): RapportItem[] => {
    const todayISO = new Date().toISOString().slice(0, 10)
    const result: RapportItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach((plan: Plan) => {
        plan.samplings.forEach((s: Sampling) => {
          // rapportDate future = donnée corrompue par l'ancien bug (auto-défaut doneDate+1 mois) → traiter comme non envoyé
          const rapportEnvoye = s.rapportDate && s.rapportDate <= todayISO
          if (!s.rapportPrevu || rapportEnvoye) return
          if (s.status !== 'done' || !s.doneDate) return
          if (!isGeneraliste) {
            const estMonRapport = s.assignedTo
              ? s.assignedTo === initiales
              : (s.doneBy ? s.doneBy === uid : client.preleveur === initiales)
            if (!estMonRapport) return
          }
          const msDay = 1000 * 60 * 60 * 24
          const joursDepuis = Math.floor((new Date(todayISO).getTime() - new Date(s.doneDate).getTime()) / msDay)
          const defaultDatePrevue = (() => {
            if (s.rapportDatePrevue) return s.rapportDatePrevue
            if (!s.doneDate) return ''
            const d = new Date(s.doneDate)
            d.setMonth(d.getMonth() + 1)
            return d.toISOString().slice(0, 10)
          })()
          result.push({
            clientId: client.id, planId: plan.id, samplingId: s.id,
            clientNom: client.nom, siteNom: plan.siteNom || plan.nom || '—', planNom: plan.nom || '—',
            doneDate: s.doneDate, joursDepuis, enRetard: joursDepuis > 30,
            rapportDatePrevue: defaultDatePrevue,
            doneBy: s.doneBy ?? '',
          })
        })
      })
    })
    return result.sort((a, b) => b.joursDepuis - a.joursDepuis)
  }, [clients, isGeneraliste, uid, initiales])

  const rapportsAFaireMoi = useMemo((): RapportItem[] => {
    const todayISO = new Date().toISOString().slice(0, 10)
    const result: RapportItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach((plan: Plan) => {
        plan.samplings.forEach((s: Sampling) => {
          const rapportEnvoye = s.rapportDate && s.rapportDate <= todayISO
          if (!s.rapportPrevu || rapportEnvoye) return
          if (s.status !== 'done' || !s.doneDate) return
          const estMonRapport = s.assignedTo
            ? s.assignedTo === initiales
            : (s.doneBy ? s.doneBy === uid : client.preleveur === initiales)
          if (!estMonRapport) return
          const msDay = 1000 * 60 * 60 * 24
          const joursDepuis = Math.floor((new Date(todayISO).getTime() - new Date(s.doneDate).getTime()) / msDay)
          const defaultDatePrevue = (() => {
            if (s.rapportDatePrevue) return s.rapportDatePrevue
            if (!s.doneDate) return ''
            const d = new Date(s.doneDate)
            d.setMonth(d.getMonth() + 1)
            return d.toISOString().slice(0, 10)
          })()
          result.push({
            clientId: client.id, planId: plan.id, samplingId: s.id,
            clientNom: client.nom, siteNom: plan.siteNom || plan.nom || '—', planNom: plan.nom || '—',
            doneDate: s.doneDate, joursDepuis, enRetard: joursDepuis > 30,
            rapportDatePrevue: defaultDatePrevue,
            doneBy: s.doneBy ?? '',
          })
        })
      })
    })
    return result.sort((a, b) => b.joursDepuis - a.joursDepuis)
  }, [clients, uid, initiales])

  const rapportsEnvoyes = useMemo((): RapportItem[] => {
    const todayISO = new Date().toISOString().slice(0, 10)
    const result: RapportItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach((plan: Plan) => {
        plan.samplings.forEach((s: Sampling) => {
          // Seulement les rapports envoyés à partir du 2026-05-19 (démarrage du suivi)
          const SUIVI_DEPUIS = '2026-05-19'
          if (!s.rapportPrevu || !s.rapportDate || s.rapportDate > todayISO || s.rapportDate < SUIVI_DEPUIS) return
          if (!isGeneraliste) {
            const estMonRapport = s.assignedTo
              ? s.assignedTo === initiales
              : (s.doneBy ? s.doneBy === uid : client.preleveur === initiales)
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
    const yesterdayISO = localISO(new Date(nowMs - 86_400_000))
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
          const dot = s.status === 'done' ? COLORS.SUCCESS : s.status === 'overdue' ? COLORS.DANGER : COLORS.ACCENT
          const sub = [plan.siteNom, plan.nom].filter(Boolean).join(' · ') || '—'
          const modalEvent: ModalEventRef = {
            id: s.id, type: 'prelevement', title: client.nom, subtitle: sub,
            statusLabel: badge.label, statusBg: badge.bg, statusColor: dot,
            link: `/missions/${client.id}/plan/${plan.id}/sampling/${s.id}?j=${isJ2Today ? '2' : '1'}`,
            isDone: s.status === 'done', technicien: client.preleveur || '—',
            clientId: client.id, planId: plan.id, samplingId: s.id, plannedTime: s.plannedTime,
          }
          const isAuto = plan.methode === 'Automatique'
          const isJ1Bilan24 = isAuto && isToday(baseDate)
          items.push({ kind: 'sampling', time: s.plannedTime ?? '', title: client.nom, sub, badge, dot, meteo: plan.meteo || '', cofrac: plan.cofrac ?? false, modalEvent, isJ1Bilan24 })
        })
      })
    })

    for (const ev of evenements as EvenementPersonnel[]) {
      const keep = (() => {
        if (!isGeneraliste && initiales && ev.createdByInitiales && ev.createdByInitiales !== initiales) return false
        if (ev.dateFin && ev.dateFin > ev.date) return ev.date <= todayISO && ev.dateFin >= todayISO
        return ev.date === todayISO
      })()
      if (!keep) continue
      if (ev.type === 'meteo') continue
      const cfg = EVENEMENT_CFG[ev.type] ?? EVENEMENT_CFG.autre
      const evSub = [ev.createdByInitiales, ev.notes].filter(Boolean).join(' · ') || cfg.label
      const evModalEvent: ModalEventRef = {
        id: ev.id, type: 'evenement', title: ev.titre, subtitle: evSub,
        statusLabel: cfg.label, statusBg: cfg.bg, statusColor: cfg.color,
        link: '', isDone: false, technicien: ev.createdByInitiales || '—', evenementData: ev,
      }
      items.push({ kind: 'evenement', time: ev.heure ?? '', title: ev.titre, sub: evSub, badge: { label: cfg.label, bg: cfg.bg, color: cfg.color }, dot: cfg.dot, modalEvent: evModalEvent })
    }

    return items.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return -1
      if (!b.time) return 1
      return a.time.localeCompare(b.time)
    })
  }, [clients, evenements, initiales, isGeneraliste, nowMs])

  const lendemainItems = useMemo((): JourItem[] => {
    const tomorrowISO = localISO(new Date(nowMs + 86_400_000))
    const items: JourItem[] = []

    clients.forEach((client) => {
      client.plans.forEach((plan) => {
        const jMatch = `${plan.nom || ''} ${plan.siteNom || ''}`.match(/\bJ(\d+)\b/)
        const dayOffset = jMatch ? parseInt(jMatch[1]) - 1 : 0
        const isAuto = plan.methode === 'Automatique'
        plan.samplings.forEach((s: Sampling) => {
          if (!s.plannedDay && !s.doneDate) return
          if (initiales) {
            const techSampling = s.assignedTo || client.preleveur
            if (techSampling && techSampling !== initiales) return
          }
          const baseDate = s.doneDate || localISO(new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay + dayOffset))
          const todayISO = localISO(new Date(nowMs))
          // Bilan 24h : J1 aujourd'hui → ajouter J2 (récupération) demain
          if (isAuto && baseDate === todayISO && s.status !== 'done') {
            const badge = getSamplingBadge(s)
            const dot = COLORS.ACCENT
            const sub = [plan.siteNom, plan.nom].filter(Boolean).join(' · ') || '—'
            const subJ2 = `${sub} · Bilan 24h J2`
            const modalEvent: ModalEventRef = {
              id: `${s.id}_j2`, type: 'prelevement', title: client.nom, subtitle: subJ2,
              statusLabel: badge.label, statusBg: badge.bg, statusColor: dot,
              link: `/missions/${client.id}/plan/${plan.id}/sampling/${s.id}?j=2`,
              isDone: false, technicien: client.preleveur || '—',
              clientId: client.id, planId: plan.id, samplingId: s.id, plannedTime: s.plannedTime,
            }
            items.push({ kind: 'sampling', time: s.plannedTime ?? '', title: client.nom, sub: subJ2, badge, dot, meteo: plan.meteo || '', cofrac: plan.cofrac ?? false, modalEvent })
            return
          }
          if (baseDate !== tomorrowISO) return
          if (s.status === 'done') return
          const badge = getSamplingBadge(s)
          const dot = s.status === 'overdue' ? COLORS.DANGER : COLORS.ACCENT
          const sub = [plan.siteNom, plan.nom].filter(Boolean).join(' · ') || '—'
          const subtitle = isAuto ? `${sub} · Bilan 24h J1` : sub
          const modalEvent: ModalEventRef = {
            id: s.id, type: 'prelevement', title: client.nom, subtitle,
            statusLabel: badge.label, statusBg: badge.bg, statusColor: dot,
            link: `/missions/${client.id}/plan/${plan.id}/sampling/${s.id}?j=1`,
            isDone: false, technicien: client.preleveur || '—',
            clientId: client.id, planId: plan.id, samplingId: s.id, plannedTime: s.plannedTime,
          }
          items.push({ kind: 'sampling', time: s.plannedTime ?? '', title: client.nom, sub: subtitle, badge, dot, meteo: plan.meteo || '', cofrac: plan.cofrac ?? false, modalEvent })
        })
      })
    })

    for (const ev of evenements as EvenementPersonnel[]) {
      const keep = (() => {
        if (!isGeneraliste && initiales && ev.createdByInitiales && ev.createdByInitiales !== initiales) return false
        if (ev.dateFin && ev.dateFin > ev.date) return ev.date <= tomorrowISO && ev.dateFin >= tomorrowISO
        return ev.date === tomorrowISO
      })()
      if (!keep) continue
      if (ev.type === 'meteo') continue
      const cfg = EVENEMENT_CFG[ev.type] ?? EVENEMENT_CFG.autre
      const evSub = [ev.createdByInitiales, ev.notes].filter(Boolean).join(' · ') || cfg.label
      const evModalEvent: ModalEventRef = {
        id: ev.id, type: 'evenement', title: ev.titre, subtitle: evSub,
        statusLabel: cfg.label, statusBg: cfg.bg, statusColor: cfg.color,
        link: '', isDone: false, technicien: ev.createdByInitiales || '—', evenementData: ev,
      }
      items.push({ kind: 'evenement', time: ev.heure ?? '', title: ev.titre, sub: evSub, badge: { label: cfg.label, bg: cfg.bg, color: cfg.color }, dot: cfg.dot, modalEvent: evModalEvent })
    }

    return items.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return -1
      if (!b.time) return 1
      return a.time.localeCompare(b.time)
    })
  }, [clients, evenements, initiales, isGeneraliste, nowMs])

  // ── État du parc ──────────────────────────────────────────

  const parcEtat = useMemo(() => ({
    operationnel:   equipements.filter((e: Equipement) => e.etat === 'operationnel').length,
    en_maintenance: equipements.filter((e: Equipement) => e.etat === 'en_maintenance').length,
    hors_service:   equipements.filter((e: Equipement) => e.etat === 'hors_service').length,
    prete:          equipements.filter((e: Equipement) => e.etat === 'prete').length,
  }), [equipements])

  const parcDonut = useMemo(() => {
    let en_service = 0
    let a_calibrer = 0
    let en_maintenance = 0
    let hors_service = 0
    let prete = 0

    equipements.forEach((e: Equipement) => {
      if (e.etat === 'en_maintenance') { en_maintenance++; return }
      if (e.etat === 'hors_service') { hors_service++; return }
      if (e.etat === 'prete') { prete++; return }

      const eqVerifs = verifications.filter((v: Verification) => v.equipementId === e.id || v.equipementNom === e.nom)
      let needsCalib = false
      if (eqVerifs.length > 0) {
        const latest = eqVerifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        if (latest.prochainControle && daysDiff(latest.prochainControle) < 30) needsCalib = true
      } else {
        if (e.prochainEtalonnage && daysDiff(e.prochainEtalonnage) < 30) needsCalib = true
      }

      if (needsCalib) a_calibrer++
      else en_service++
    })
    return { en_service, a_calibrer, en_maintenance, hors_service, prete }
  }, [equipements, verifications])

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

  const metrologieAlertes = useMemo(() =>
    equipements.filter((e: Equipement) => {
      if (!e.prochainEtalonnage) return false
      const diff = daysDiff(e.prochainEtalonnage.split('T')[0])
      return diff <= 14 && e.etat !== 'hors_service'
    }).slice(0, 8),
    [equipements])

  const techOptions = useMemo(() => {
    const codes = new Set(clients.flatMap((c: Client) => c.preleveur ? [c.preleveur] : []))
    return Array.from(codes).sort().map(code => ({ code, label: code }))
  }, [clients])

  const hasRainToday = useMemo(() => {
    const todayISO = localISO(new Date())
    return evenements.some((ev: EvenementPersonnel) => ev.type === 'meteo' && ev.date === todayISO)
  }, [evenements])

  const hasRainTomorrow = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const tomorrowISO = localISO(new Date(Date.now() + 86_400_000))
    return evenements.some((ev: EvenementPersonnel) => ev.type === 'meteo' && ev.date === tomorrowISO)
  }, [evenements])

  return {
    missionsCeMois,
    verifiTotal, verifiConformes, conformitePct,
    aCalibrrer,
    rapportsAFaire,
    rapportsAFaireMoi,
    rapportsEnvoyes,
    jourItems,
    lendemainItems,
    hasRainToday,
    hasRainTomorrow,
    parcEtat,
    parcDonut,
    prelevementsEnRetard,
    prelevementsPluie,
    maintenancesActives,
    metrologieAlertes,
    techOptions,
  }
}
