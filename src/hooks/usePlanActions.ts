import { generateId } from '@/lib/ids'
import { generateSamplings } from '@/lib/samplings'
import { buildReportHtml } from '@/lib/reportHtml'
import React from 'react'
import type { Client, Plan, Sampling, SamplingStatus, NappeType, SamplingHistoryEntry, AppUser } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const STATUS_CONFIG: Record<SamplingStatus, { label: string }> = {
  planned:      { label: 'Planifié' },
  done:         { label: 'Réalisé' },
  overdue:      { label: 'En retard' },
  non_effectue: { label: 'Non effectué' },
}

const AUDIT_FIELDS: Partial<Record<keyof Sampling, (v: unknown) => string>> = {
  status:       (v) => STATUS_CONFIG[v as SamplingStatus]?.label ?? String(v),
  doneDate:     (v) => v ? new Date(v as string).toLocaleDateString('fr-FR') : '—',
  plannedMonth: (v) => MOIS[v as number] ?? String(v),
  plannedDay:   (v) => v ? `Jour ${v}` : '—',
  plannedTime:  (v) => (v as string) || '—',
  rapportPrevu: (v) => v ? 'Oui' : 'Non',
  rapportDate:  (v) => v ? new Date(v as string).toLocaleDateString('fr-FR') : '—',
  rapportDatePrevue: (v) => v ? new Date(v as string).toLocaleDateString('fr-FR') : '—',
  nappe:        (v) => ({ haute: 'Haute', basse: 'Basse', '': '—' }[v as string] ?? String(v)),
  doneBy:       () => '—',
}

interface UsePlanActionsProps {
  uid: string | null
  currentUserNom: string
  users: AppUser[]
  planId: string | undefined
  plan: Plan | null
  clientId: string | undefined
  client: Client | null
  triggerSave: (client: Client) => void
  setPdfPreview: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedSampling: React.Dispatch<React.SetStateAction<string | null>>
}

export function usePlanActions({
  uid, currentUserNom, users,
  planId, plan, client,
  triggerSave, setPdfPreview,
  setSelectedSampling,
}: UsePlanActionsProps) {

  function updatePlan(field: keyof Plan, value: unknown) {
    if (!client || !plan) return
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? { ...plan, [field]: value } : p) })
  }

  function updateSampling(samplingId: string, field: keyof Sampling, value: unknown) {
    if (!client || !plan) return
    const uid_ = uid ?? ''
    const updatedSamplings = plan.samplings.map((s) => {
      if (s.id !== samplingId) return s

      const patch: Partial<Sampling> = { [field]: value }

      if ((field === 'plannedMonth' || field === 'plannedDay') && s.dateUndefined) patch.dateUndefined = false

      if (field === 'status' && value === 'done' && !s.doneBy) patch.doneBy = uid_
      if (field === 'status' && value !== 'done') patch.doneBy = ''

      const effectiveDoneDate = field === 'doneDate' ? String(value) : s.doneDate
      const effectiveRapportPrevu = field === 'rapportPrevu' ? Boolean(value) : s.rapportPrevu
      if (effectiveRapportPrevu && !s.rapportDatePrevue && effectiveDoneDate) {
        const d = new Date(effectiveDoneDate)
        d.setMonth(d.getMonth() + 1)
        patch.rapportDatePrevue = d.toISOString().slice(0, 10)
      }

      const formatter = AUDIT_FIELDS[field]
      if (formatter && String(s[field]) !== String(value)) {
        const entry: SamplingHistoryEntry = {
          at: new Date().toISOString(),
          by: uid_,
          byNom: currentUserNom,
          field: String(field),
          from: formatter(s[field]),
          to: formatter(value),
        }
        if (field === 'doneBy') {
          const fromUser = users.find((u) => u.uid === String(s[field]))
          const toUser   = users.find((u) => u.uid === String(value))
          entry.from = fromUser ? `${fromUser.prenom} ${fromUser.nom}` : (s[field] ? String(s[field]) : '—')
          entry.to   = toUser   ? `${toUser.prenom} ${toUser.nom}`     : (value  ? String(value)   : '—')
        }
        patch.history = [...(s.history ?? []), entry]
      }

      return { ...s, ...patch }
    })

    // Déclencher une notification push si le technicien assigné change
    if (field === 'assignedTo' && value && String(value) !== '—') {
      const originalSampling = plan.samplings.find((s) => s.id === samplingId)
      if (originalSampling && originalSampling.assignedTo !== value) {
        import('@/services/notificationService').then(({ sendPushToTechnician }) => {
          sendPushToTechnician(
            String(value),
            'Nouveau prélèvement planifié 📋',
            `Tu as été assigné à un prélèvement pour le client ${client.nom} (Plan : ${plan.nom})`,
            `/missions/${client.id}/plan/${plan.id}`
          )
        }).catch(err => console.error('[Notification] Failed to load notificationService:', err))
      }
    }

    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? { ...p, samplings: updatedSamplings } : p) })
  }

  function generateSamplingsForPlan() {
    if (!client || !plan) return
    const updated = { ...plan, samplings: generateSamplings(plan) }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
  }

  function addCustomSampling() {
    if (!client || !plan) return
    const newSampling: Sampling = {
      id: generateId(),
      num: plan.samplings.length + 1,
      plannedMonth: 0,
      plannedDay: 0,
      dateUndefined: true,
      status: 'planned',
      doneDate: '', comment: '',
      nappe: '' as NappeType,
      rapportPrevu: false, rapportDate: '',
      tente: false, reportHistory: [], doneBy: '',
    }
    const updated = {
      ...plan,
      samplings: [...plan.samplings, newSampling],
    }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
  }

  function deleteSampling(samplingId: string, selectedSampling: string | null) {
    if (!client || !plan) return
    const updated = {
      ...plan,
      samplings: plan.samplings.reduce<typeof plan.samplings>((acc, s) => {
        if (s.id !== samplingId) acc.push({ ...s, num: acc.length + 1 })
        return acc
      }, []),
    }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
    if (selectedSampling === samplingId) setSelectedSampling(null)
  }

  function openPdfPreview(standalone: boolean) {
    if (!client || !plan) return
    if (standalone) {
      const blob = new Blob([buildReportHtml(client, plan, users, true)], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } else {
      setPdfPreview(buildReportHtml(client, plan, users, false))
    }
  }

  return { updatePlan, updateSampling, generateSamplingsForPlan, addCustomSampling, deleteSampling, openPdfPreview }
}
