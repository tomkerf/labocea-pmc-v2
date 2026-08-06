import { useRef } from 'react'
import { saveClient } from '@/services/clientService'
import { createEvenement, deleteEvenement, updateEvenementDate } from '@/services/evenementService'
import { toISO, shiftDateFin, getMissingMaterielForDate } from '@/lib/planningUtils'
import { useToastStore } from '@/stores/toastStore'
import { reportError } from '@/lib/sentry'
import type { Client, Sampling, TypeEvenement, Equipement } from '@/types'
import type { PlanningEvent, PoolItem } from '@/lib/planningUtils'


interface UsePlanningActionsProps {
  uid: string | null
  initiales: string
  clients: Client[]
  evenements: { id: string; type: string; date: string }[]
  holidays: Record<string, string>
  equipements?: Equipement[]
  eventsByDate?: Record<string, PlanningEvent[]>
}

export function usePlanningActions({ uid, initiales, clients, evenements, holidays, equipements = [], eventsByDate = {} }: UsePlanningActionsProps) {
  const isPending = useRef(false)
  const { add: addToast } = useToastStore()

  function warnIfMaterielInsuffisant(methode: string | undefined, dateStr: string) {
    if (methode !== 'Automatique') return
    const { preleveurManquant, debitmetreManquant } = getMissingMaterielForDate(eventsByDate, dateStr, equipements)
    if (!preleveurManquant && !debitmetreManquant) return
    const manquants = [preleveurManquant && 'préleveur automatique', debitmetreManquant && 'débitmètre'].filter(Boolean).join(' et ')
    addToast('warning', `Matériel insuffisant le ${dateStr.split('-').reverse().join('/')} : plus aucun ${manquants} disponible pour ce Bilan 24h.`)
  }

  async function handleDeleteEvent(event: PlanningEvent) {
    if (!event.evenementData) return
    try {
      await deleteEvenement(event.evenementData.id)
    } catch (err) {
      reportError('handleDeleteEvent', err)
      addToast('error', 'Erreur lors de la suppression de l\'événement')
    }
  }

  async function handleCancelSampling(event: PlanningEvent, reason: string) {
    if (isPending.current || !uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    isPending.current = true
    try {
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
    } catch (err) {
      reportError('handleCancelSampling', err)
      addToast('error', 'Erreur lors de l\'annulation du prélèvement')
    } finally {
      isPending.current = false
    }
  }

  async function handleMoveEvent(event: PlanningEvent, newDate: string, reason: string) {
    if (isPending.current || !uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    const newDateObj   = new Date(newDate + 'T12:00:00')
    const plannedDay   = newDateObj.getDate()
    const plannedMonth = newDateObj.getMonth()
    isPending.current = true
    try {
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
      warnIfMaterielInsuffisant(event.methode, newDate)
    } catch (err) {
      reportError('handleMoveEvent', err)
      addToast('error', 'Erreur lors du report du prélèvement')
    } finally {
      isPending.current = false
    }
  }

  async function handleMoveEvenement(event: PlanningEvent, newDate: string) {
    const data = event.evenementData
    if (isPending.current || !newDate || !data) return
    isPending.current = true
    try {
      await updateEvenementDate(data.id, newDate, shiftDateFin(data.date, newDate, data.dateFin))
    } catch (err) {
      reportError('handleMoveEvenement', err)
      addToast('error', 'Erreur lors du déplacement de l\'événement')
    } finally {
      isPending.current = false
    }
  }

  async function toggleRainDay(dateStr: string) {
    if (!uid) return
    const existing = evenements.find(e => e.type === 'meteo' && e.date === dateStr)
    try {
      if (existing) {
        await deleteEvenement(existing.id)
      } else {
        await createEvenement('Pluie prévue', dateStr, 'meteo', '', '', uid, initiales)
      }
    } catch (err) {
      reportError('toggleRainDay', err)
      addToast('error', 'Erreur lors de la mise à jour météo')
    }
  }

  async function handleChangeTechnicien(event: PlanningEvent, initiales_: string) {
    if (isPending.current || !uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return

    const plan = client.plans.find(p => p.id === event.planId)
    const planNom = plan ? plan.nom : 'Plan'

    isPending.current = true
    try {
      await saveClient({
        ...client,
        plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
          ...plan,
          samplings: plan.samplings.map((s: Sampling) =>
            s.id !== event.samplingId ? s : { ...s, assignedTo: initiales_ }
          ),
        }),
      }, uid)

      if (initiales_ && initiales_ !== '—' && initiales_ !== event.technicien) {
        import('@/services/notificationService').then(({ sendPushToTechnician }) => {
          sendPushToTechnician(
            initiales_,
            'Changement d\'assignation 📋',
            `Tu as été assigné à un prélèvement pour ${client.nom} (Plan : ${planNom})`,
            `/missions/${client.id}/plan/${event.planId}`
          )
        }).catch(err => console.error('[Notification] Failed to load notificationService:', err))
      }
    } catch (err) {
      reportError('handleChangeTechnicien', err)
      addToast('error', 'Erreur lors du changement de technicien')
    } finally {
      isPending.current = false
    }
  }

  async function handleChangeEquipements(event: PlanningEvent, equipementIds: string[]) {
    if (isPending.current || !uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return

    isPending.current = true
    try {
      await saveClient({
        ...client,
        plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
          ...plan,
          samplings: plan.samplings.map((s: Sampling) =>
            s.id !== event.samplingId ? s : { ...s, equipementsAssignes: equipementIds }
          ),
        }),
      }, uid)
    } catch (err) {
      reportError('handleChangeEquipements', err)
      addToast('error', 'Erreur lors de l\'assignation des équipements')
    } finally {
      isPending.current = false
    }
  }

  async function handleSaveEvenement(
    titre: string, type: TypeEvenement,
    dateDebut: string, dateFin: string,
    heure: string, notes: string,
  ) {
    if (!uid) return
    try {
      await createEvenement(titre, dateDebut, type, heure, notes, uid, initiales, dateFin || undefined)
    } catch (err) {
      reportError('handleSaveEvenement', err)
      addToast('error', 'Erreur lors de la création de l\'événement')
    }
  }

  async function handleValidatePool(item: PoolItem, date: string, time?: string) {
    if (!uid) return
    if (holidays[date]) return
    const client = clients.find((c: Client) => c.id === item.clientId)
    if (!client) return
    const poolDateObj  = new Date(date + 'T12:00:00')
    const plannedDay   = poolDateObj.getDate()
    const plannedMonth = poolDateObj.getMonth()
    try {
      await saveClient({
        ...client,
        plans: client.plans.map(plan => plan.id !== item.planId ? plan : {
          ...plan,
          samplings: plan.samplings.map((s: Sampling) => {
            if (s.id !== item.sampling.id) return s
            // Omettre la clé plutôt que de poser undefined : le tableau plans est
            // remplacé en bloc par le set merge, donc l'absence de clé efface bien
            // une heure précédemment saisie.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- on retire la clé par destructuration
            const { plannedTime, ...rest } = s
            return time
              ? { ...rest, plannedDay, plannedMonth, plannedTime: time }
              : { ...rest, plannedDay, plannedMonth }
          })
        })
      }, uid)
      warnIfMaterielInsuffisant(item.methode, date)
    } catch (err) {
      reportError('handleValidatePool', err)
      addToast('error', 'Erreur lors de la validation du prélèvement')
    }
  }

  return {
    handleCancelSampling,
    handleMoveEvent,
    handleMoveEvenement,
    handleDeleteEvent,
    toggleRainDay,
    handleChangeTechnicien,
    handleChangeEquipements,
    handleSaveEvenement,
    handleValidatePool,
  }
}
