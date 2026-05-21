import { saveClient } from '@/services/clientService'
import { createEvenement, deleteEvenement } from '@/services/evenementService'
import { toISO } from '@/lib/planningUtils'
import type { Client, Sampling, TypeEvenement } from '@/types'
import type { PlanningEvent, PoolItem } from '@/lib/planningUtils'

interface UsePlanningActionsProps {
  uid: string | null
  initiales: string
  clients: Client[]
  evenements: { id: string; type: string; date: string }[]
  holidays: Record<string, string>
}

export function usePlanningActions({ uid, initiales, clients, evenements, holidays }: UsePlanningActionsProps) {

  async function handleCancelSampling(event: PlanningEvent, reason: string) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) => {
          if (s.id !== event.samplingId) return s
          const fromDate = toISO(new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay))
          const historyEntry = { from: fromDate, to: '', by: uid, reason, at: new Date().toISOString() }
          return { ...s, plannedDay: 0, motif: reason, reportHistory: [...(s.reportHistory ?? []), historyEntry] }
        })
      })
    }, uid)
  }

  async function handleMoveEvent(event: PlanningEvent, newDate: string, reason: string) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    const newDateObj   = new Date(newDate + 'T12:00:00')
    const plannedDay   = newDateObj.getDate()
    const plannedMonth = newDateObj.getMonth()
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) => {
          if (s.id !== event.samplingId) return s
          const fromDate = toISO(new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay))
          const historyEntry = { from: fromDate, to: newDate, by: uid, reason, at: new Date().toISOString() }
          return { ...s, plannedDay, plannedMonth, reportHistory: [...(s.reportHistory ?? []), historyEntry] }
        })
      })
    }, uid)
  }

  function handleDeleteEvent(event: PlanningEvent) {
    if (event.evenementData) deleteEvenement(event.evenementData.id)
  }

  async function toggleRainDay(dateStr: string) {
    if (!uid) return
    const existing = evenements.find(e => e.type === 'meteo' && e.date === dateStr)
    if (existing) {
      await deleteEvenement(existing.id)
    } else {
      await createEvenement('Pluie prévue', dateStr, 'meteo', '', '', uid, initiales)
    }
  }

  async function handleChangeTechnicien(event: PlanningEvent, initiales_: string) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== event.samplingId ? s : { ...s, assignedTo: initiales_ }
        ),
      }),
    }, uid)
  }

  async function handleSaveEvenement(
    titre: string, type: TypeEvenement,
    dateDebut: string, dateFin: string,
    heure: string, notes: string,
  ) {
    if (!uid) return
    await createEvenement(titre, dateDebut, type, heure, notes, uid, initiales, dateFin || undefined)
  }

  async function handleValidatePool(item: PoolItem, date: string) {
    if (!uid) return
    if (holidays[date]) return
    const client = clients.find((c: Client) => c.id === item.clientId)
    if (!client) return
    const poolDateObj  = new Date(date + 'T12:00:00')
    const plannedDay   = poolDateObj.getDate()
    const plannedMonth = poolDateObj.getMonth()
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== item.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== item.sampling.id ? s : { ...s, plannedDay, plannedMonth }
        )
      })
    }, uid)
  }

  return {
    handleCancelSampling,
    handleMoveEvent,
    handleDeleteEvent,
    toggleRainDay,
    handleChangeTechnicien,
    handleSaveEvenement,
    handleValidatePool,
  }
}
