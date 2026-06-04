/**
 * usePlanningData
 * ─────────────────────────────────────────────────────────────────
 * Calculs lourds extraits de PlanningPage.
 * Entrées : données Firestore + selectedDay (état UI minimal).
 * Sorties : index eventsByDate + pools + listes dérivées.
 * Aucun JSX. Aucun handler. 100 % testable en isolation.
 */

import { useMemo } from 'react'
import { isSamplingOverdue } from '@/lib/overdue'
import {
  toISO, addDays, getTechColor, normTech,
  SAMPLING_LABEL, MAINTENANCE_LABEL, EVENEMENT_LABEL,
  type PlanningEvent, type PoolItem, type TechOption,
} from '@/lib/planningUtils'
import type { Client, Sampling, Maintenance, Equipement, EvenementPersonnel, AppUser, Todo } from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'

interface UsePlanningDataParams {
  clients:       Client[]
  maintenances:  Maintenance[]
  equipements:   Equipement[]
  evenements:    EvenementPersonnel[]
  todos:         Todo[]
  users:         AppUser[]
  preleveurs:    Preleveur[]
  selectedDay:   string | null
}

export function usePlanningData({
  clients, maintenances, equipements, evenements, todos,
  users, preleveurs, selectedDay,
}: UsePlanningDataParams) {

  // ── Index date → events ─────────────────────────────────────

  const eventsByDate = useMemo(() => {
    const map: Record<string, PlanningEvent[]> = {}
    const year = new Date().getFullYear()
    const add = (dateStr: string, e: PlanningEvent) => {
      if (!dateStr) return
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(e)
    }

    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        const isAuto  = plan.methode === 'Automatique'
        const baseSub = [plan.nom, plan.siteNom].filter(Boolean).join(' · ') || '—'
        plan.samplings.forEach((s: Sampling) => {
          if (!s.plannedDay && !s.doneDate) return
          const overdue = isSamplingOverdue(s)
          const dateStrRaw = s.status === 'done' && s.doneDate
            ? s.doneDate
            : s.plannedDay
              ? toISO(new Date(year, s.plannedMonth, s.plannedDay))
              : s.doneDate

          // Si c'est un Bilan 24h (Automatique) et que la date provient de doneDate,
          // doneDate représente J2 (la relève). Donc J1 doit être la veille.
          let dateStr = dateStrRaw
          if (isAuto && dateStrRaw === s.doneDate && s.doneDate) {
            const d = new Date(s.doneDate + 'T12:00:00')
            d.setDate(d.getDate() - 1)
            dateStr = toISO(d)
          }
          const statusLabel = overdue ? SAMPLING_LABEL.overdue : SAMPLING_LABEL[s.status] ?? SAMPLING_LABEL.planned
          const priority    = overdue ? 0 : s.status === 'non_effectue' ? 1 : s.status === 'planned' ? 2 : 3
          const technicien  = s.assignedTo || client.preleveur || ''
          const tc          = getTechColor(technicien)
          const isDone      = s.status === 'done'
          const statusBg    = isDone ? 'var(--color-success-light)' : overdue ? 'var(--color-danger-light)' : tc.bg
          const statusColor = isDone ? 'var(--color-success)'       : overdue ? 'var(--color-danger)'       : tc.color
          const common = {
            type: 'prelevement' as const,
            statusLabel, statusBg, statusColor, priority,
            link: `/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
            isDone, technicien: technicien || '—',
            plannedTime: s.plannedTime, clientId: client.id, planId: plan.id, samplingId: s.id,
            frequence: plan.frequence || '',
            meteo: plan.meteo || '',
            analysesSousTraitees: plan.analysesSousTraitees ?? false,
            cofrac: plan.cofrac ?? false,
            lat: plan.lat || '',
            lng: plan.lng || '',
          }
          if (isAuto) {
            const dateStr2 = toISO(addDays(new Date(dateStr + 'T12:00:00'), 1))
            add(dateStr, { ...common, id: s.id, title: client.nom, subtitle: baseSub, dateFin: dateStr2 })
            add(dateStr2, { ...common, id: `${s.id}_j2`, title: client.nom, subtitle: baseSub, isJ2Continuation: true })
          } else {
            add(dateStr, { ...common, id: s.id, title: client.nom, subtitle: baseSub })
          }
        })
      })
    })

    // Fantômes (reportHistory)
    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        const baseSub = [plan.nom, plan.siteNom].filter(Boolean).join(' · ') || '—'
        plan.samplings.forEach((s: Sampling) => {
          if (!s.reportHistory?.length) return
          s.reportHistory.forEach((h, idx) => {
            if (!h.from) return
            const ghostAction: 'retiré' | 'reporté' = h.to === '' ? 'retiré' : 'reporté'
            add(h.from, {
              id: `${s.id}_ghost_${idx}`,
              type: 'prelevement' as const,
              title: client.nom, subtitle: baseSub,
              statusLabel: ghostAction === 'retiré' ? 'Retiré' : 'Reporté',
              statusBg: 'transparent', statusColor: 'var(--color-text-tertiary)',
              link: `/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
              isDone: false, priority: 4,
              technicien: s.assignedTo || client.preleveur || '—',
              clientId: client.id, planId: plan.id, samplingId: s.id,
              isGhost: true, ghostAction,
              ghostNewDate: h.to || undefined,
              ghostReason: h.reason, ghostBy: h.by, ghostAt: h.at,
            })
          })
        })
      })
    })

    maintenances.forEach((m: Maintenance) => {
      const rawDate = m.dateRealisee || m.datePrevue
      if (!rawDate) return
      const dateStr = rawDate.split('T')[0]
      const tc = getTechColor('')
      add(dateStr, {
        id: m.id, type: 'maintenance', priority: m.statut === 'realisee' ? 3 : 2,
        title: m.equipementNom || 'Équipement',
        subtitle: m.type === 'preventive' ? 'Maintenance préventive' : m.type === 'corrective' ? 'Maintenance corrective' : 'Panne',
        statusLabel: MAINTENANCE_LABEL[m.statut] ?? 'Planifiée', statusBg: tc.bg, statusColor: tc.color,
        link: `/maintenances/${m.id}`, isDone: m.statut === 'realisee', technicien: m.technicienNom || '—',
        maintenanceData: m,
      })
    })

    equipements.forEach((eq: Equipement) => {
      if (!eq.prochainEtalonnage) return
      const dateStr = eq.prochainEtalonnage.split('T')[0]
      add(dateStr, {
        id: `cal_${eq.id}`, type: 'verification', priority: 2,
        title: eq.nom,
        subtitle: `À calibrer (${eq.numSerie || eq.marque})`,
        statusLabel: 'Métrologie', statusBg: 'var(--color-warning-light)', statusColor: 'var(--color-warning)',
        link: `/materiel/${eq.id}`, isDone: false, technicien: eq.technicien || '—',
      })
      
      const target = new Date(dateStr)
      target.setDate(target.getDate() - 14)
      const warningDateStr = target.toISOString().split('T')[0]
      
      add(warningDateStr, {
        id: `cal_warn_${eq.id}`, type: 'verification', priority: 3,
        title: eq.nom,
        subtitle: `Rappel : calibration prévue le ${dateStr.split('-').reverse().join('/')}`,
        statusLabel: 'J-14 Métro', statusBg: 'var(--color-bg-tertiary)', statusColor: 'var(--color-text-secondary)',
        link: `/materiel/${eq.id}`, isDone: false, technicien: eq.technicien || '—',
      })
    })

    evenements.forEach((ev: EvenementPersonnel) => {
      const evObj: PlanningEvent = {
        id: ev.id, type: 'evenement', priority: 2,
        title: ev.titre, subtitle: EVENEMENT_LABEL[ev.type] ?? 'Autre',
        statusLabel: EVENEMENT_LABEL[ev.type] ?? 'Autre',
        statusBg: 'var(--color-bg-tertiary)', statusColor: 'var(--color-text-tertiary)',
        link: '', isDone: false, technicien: ev.createdByInitiales || '—',
        plannedTime: ev.heure || undefined, evenementData: ev,
      }
      if (ev.dateFin && ev.dateFin > ev.date) {
        let cur = ev.date
        while (cur <= ev.dateFin) {
          add(cur, { ...evObj, id: `${ev.id}_${cur}` })
          const d = new Date(cur + 'T12:00:00')
          d.setDate(d.getDate() + 1)
          cur = toISO(d)
        }
      } else {
        add(ev.date, evObj)
      }
    })

    const PRIORITY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
      haute:   { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)',   label: '!!! Tâche' },
      moyenne: { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)',   label: '!! Tâche' },
      basse:   { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', label: '! Tâche' },
    }
    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (!s.rapportPrevu || s.rapportDate) return
          const rawDate = s.rapportDatePrevue || ''
          if (!rawDate) return
          const d = new Date(rawDate + 'T12:00:00')
          const dow = d.getDay()
          if (dow === 6) d.setDate(d.getDate() - 1)
          else if (dow === 0) d.setDate(d.getDate() - 2)
          const dateStr = toISO(d)
          add(dateStr, {
            id: `rapport_${s.id}`, type: 'rapport', priority: 1,
            title: client.nom,
            subtitle: plan.nom ? `${plan.nom} · Rapport` : 'Rapport',
            statusLabel: 'Rapport dû', statusBg: 'var(--color-accent-light)', statusColor: 'var(--color-accent)',
            link: `/missions/${client.id}/plan/${plan.id}`,
            isDone: false, technicien: s.assignedTo || client.preleveur || '—',
            clientId: client.id, planId: plan.id, samplingId: s.id,
          })
        })
      })
    })

    todos.forEach((t: Todo) => {
      if (!t.dueDate || t.statut === 'termine') return
      const colors = PRIORITY_COLORS[t.priorite] ?? PRIORITY_COLORS.basse
      add(t.dueDate, {
        id: `todo_${t.id}`, type: 'todo', priority: t.priorite === 'haute' ? 0 : t.priorite === 'moyenne' ? 1 : 2,
        title: t.titre,
        subtitle: 'Tâche',
        statusLabel: colors.label, statusBg: colors.bg, statusColor: colors.color,
        link: '/todos', isDone: false,
        technicien: users.find(u => u.uid === t.assignedTo)?.initiales || t.assignedTo || '—',
        todoData: t,
      })
    })

    return map
  }, [clients, maintenances, equipements, evenements, todos, users])

  // ── Techniciens disponibles ─────────────────────────────────

  const allTechs = useMemo(() => {
    if (preleveurs.length > 0) {
      return preleveurs.map(p => p.code).sort()
    }
    const s = new Set<string>()
    Object.values(eventsByDate).flat().forEach(e => {
      if (e.technicien && e.technicien !== '—') s.add(normTech(e.technicien))
    })
    return Array.from(s).sort()
  }, [preleveurs, eventsByDate])

  // ── Total des prélèvements en retard ────────────────────────

  const totalOverdue = useMemo(() => {
    let n = 0
    clients.forEach((c: Client) => c.plans.forEach(p =>
      p.samplings.forEach((s: Sampling) => { if (isSamplingOverdue(s)) n++ })
    ))
    return n
  }, [clients])

  // ── Options technicien pour le sélecteur ────────────────────

  const techOptions = useMemo((): TechOption[] => {
    const map = new Map<string, string>()
    preleveurs.forEach(p => map.set(p.code, `${p.nom} (${p.code})`))
    users.forEach(u => {
      if (u.initiales && !map.has(u.initiales))
        map.set(u.initiales, `${u.prenom} ${u.nom} (${u.initiales})`)
    })
    clients.forEach((c: Client) => {
      if (c.preleveur && !map.has(normTech(c.preleveur)))
        map.set(normTech(c.preleveur), normTech(c.preleveur))
    })
    return Array.from(map.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [preleveurs, users, clients])

  // ── Pool du mois sélectionné ────────────────────────────────

  const poolSamplings = useMemo((): PoolItem[] => {
    if (!selectedDay) return []
    const month = new Date(selectedDay + 'T12:00:00').getMonth()
    const result: PoolItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (s.plannedMonth === month && s.status !== 'done') {
            result.push({
              sampling: s,
              clientId: client.id, clientNom: client.nom,
              planId: plan.id, planNom: plan.nom, siteNom: plan.siteNom,
              frequence: plan.frequence || '',
              techInitiales: client.preleveur || '—',
              meteo: plan.meteo || '',
              analysesSousTraitees: plan.analysesSousTraitees ?? false,
              cofrac: plan.cofrac ?? false,
            })
          }
        })
      })
    })
    return result.sort((a, b) => {
      const aOvr = isSamplingOverdue(a.sampling) ? 0 : 1
      const bOvr = isSamplingOverdue(b.sampling) ? 0 : 1
      if (aOvr !== bOvr) return aOvr - bOvr
      return a.clientNom.localeCompare(b.clientNom)
    })
  }, [selectedDay, clients])

  // ── Prélèvements en retard — tous mois confondus ────────────

  const overduePool = useMemo((): PoolItem[] => {
    const result: PoolItem[] = []
    clients.forEach((client: Client) => {
      const clientYear = Number(client.annee) || undefined
      client.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (isSamplingOverdue(s, clientYear)) {
            result.push({
              sampling: s,
              clientId: client.id, clientNom: client.nom,
              planId: plan.id, planNom: plan.nom, siteNom: plan.siteNom,
              frequence: plan.frequence || '',
              techInitiales: s.assignedTo || client.preleveur || '—',
              meteo: plan.meteo || '',
              analysesSousTraitees: plan.analysesSousTraitees ?? false,
              cofrac: plan.cofrac ?? false,
            })
          }
        })
      })
    })
    return result.sort((a, b) => a.clientNom.localeCompare(b.clientNom))
  }, [clients])

  return { eventsByDate, allTechs, totalOverdue, techOptions, poolSamplings, overduePool }
}
