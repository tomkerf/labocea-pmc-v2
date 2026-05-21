import { generateId } from '@/lib/ids'
import { generateSamplings } from '@/lib/samplings'
import { buildReportHtml } from '@/lib/reportHtml'
import { toast } from '@/stores/toastStore'
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
  setNewDate: React.Dispatch<React.SetStateAction<string>>
  setAddingDate: React.Dispatch<React.SetStateAction<boolean>>
}

export function usePlanActions({
  uid, currentUserNom, users,
  planId, plan, client,
  triggerSave, setPdfPreview,
  setSelectedSampling, setNewDate, setAddingDate,
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
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? { ...p, samplings: updatedSamplings } : p) })
  }

  function generateSamplingsForPlan() {
    if (!client || !plan) return
    const updated = { ...plan, samplings: generateSamplings(plan) }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
  }

  function addCustomSampling(dateStr: string) {
    if (!client || !plan || !dateStr) return
    const d = new Date(dateStr + 'T12:00:00')
    const isDuplicate = plan.samplings.some(
      (s) => s.plannedMonth === d.getMonth() && s.plannedDay === d.getDate()
    )
    if (isDuplicate) {
      toast.error(`Un prélèvement est déjà prévu le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`)
      return
    }
    const newSampling: Sampling = {
      id: generateId(),
      num: plan.samplings.length + 1,
      plannedMonth: d.getMonth(),
      plannedDay: d.getDate(),
      status: 'planned',
      doneDate: '', comment: '',
      nappe: '' as NappeType,
      rapportPrevu: false, rapportDate: '',
      tente: false, reportHistory: [], doneBy: '',
    }
    const updated = {
      ...plan,
      samplings: [...plan.samplings, newSampling].sort((a, b) => a.plannedMonth - b.plannedMonth || a.plannedDay - b.plannedDay),
    }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
    setNewDate('')
    setAddingDate(false)
  }

  function deleteSampling(samplingId: string, selectedSampling: string | null) {
    if (!client || !plan) return
    const updated = {
      ...plan,
      samplings: plan.samplings.filter((s) => s.id !== samplingId).map((s, i) => ({ ...s, num: i + 1 })),
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
