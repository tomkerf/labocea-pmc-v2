import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { generateId } from '@/lib/ids'
import { useUsersListener } from '@/hooks/useUsers'
import { useUsersStore } from '@/stores/usersStore'
import { useClientData } from '@/hooks/useClientData'
import { ClientHeader } from '@/components/client/ClientHeader'
import { ClientInfoForm } from '@/components/client/ClientInfoForm'
import { ClientPlans } from '@/components/client/ClientPlans'
import ClientVisites from '@/components/client/ClientVisites'
import { PdfPreviewModal } from '@/components/client/PdfPreviewModal'
import type { Plan } from '@/types'

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  useUsersListener()
  const users = useUsersStore(s => s.users)

  const {
    client, loading, saving, remoteChanged,
    triggerSave, update, handleReload, handleDeleteClient, dismissRemoteChanged,
  } = useClientData(clientId)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null)
  const [sitesInput, setSitesInput] = useState('')
  const [plansLocked, setPlansLocked] = useState(true)

  function handleSitesChange(raw: string) {
    setSitesInput(raw)
    if (!client) return
    const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean)
    triggerSave({ ...client, sites: parsed })
  }

  function handleReorder(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !client) return
    const oldIndex = client.plans.findIndex((p) => p.id === active.id)
    const newIndex  = client.plans.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    triggerSave({ ...client, plans: arrayMove(client.plans, oldIndex, newIndex) })
  }

  function addPlan() {
    if (!client) return
    const newPlan: Plan = {
      id: generateId(), nom: 'Nouveau point', siteNom: '',
      frequence: 'Mensuel', meteo: '', nature: 'Eau usée', methode: 'Ponctuel',
      lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [],
    }
    triggerSave({ ...client, plans: [...client.plans, newPlan] })
  }

  function addSeparator() {
    if (!client) return
    const sep: Plan = {
      id: generateId(), separator: true, nom: '', siteNom: '',
      frequence: 'Mensuel', meteo: '', nature: 'Souterraine', methode: 'Ponctuel',
      lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [],
    }
    triggerSave({ ...client, plans: [...client.plans, sep] })
  }

  function handleSeparatorLabel(planId: string, label: string) {
    if (!client) return
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? { ...p, nom: label } : p) })
  }

  function confirmDeletePlan() {
    if (!client || !confirmDeletePlanId) return
    triggerSave({ ...client, plans: client.plans.filter((p) => p.id !== confirmDeletePlanId) })
    setConfirmDeletePlanId(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }
  if (!client) return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Client introuvable.</div>

  return (
    <div className="p-4 sm:p-6 max-w-2xl pb-10">
      <ClientHeader
        client={client}
        saving={saving}
        remoteChanged={remoteChanged}
        confirmDelete={confirmDelete}
        users={users}
        onBack={() => navigate('/missions')}
        onReload={handleReload}
        onDismissRemoteChanged={dismissRemoteChanged}
        onSetConfirmDelete={setConfirmDelete}
        onDelete={handleDeleteClient}
        onPdfPreview={setPdfPreview}
      />

      <ClientInfoForm
        client={client}
        sitesInput={sitesInput}
        update={update}
        onSitesChange={handleSitesChange}
      />

      <ClientPlans
        plans={client.plans}
        clientId={client.id}
        clientYear={Number(client.annee) || undefined}
        plansLocked={plansLocked}
        confirmDeletePlanId={confirmDeletePlanId}
        onToggleLock={() => setPlansLocked(l => !l)}
        onAddPlan={addPlan}
        onAddSeparator={addSeparator}
        onReorder={handleReorder}
        onOpen={(planId) => navigate(`/missions/${client.id}/plan/${planId}`)}
        onRequestDelete={setConfirmDeletePlanId}
        onConfirmDelete={confirmDeletePlan}
        onCancelDelete={() => setConfirmDeletePlanId(null)}
        onSeparatorLabel={handleSeparatorLabel}
      />

      <ClientVisites
        clientId={client.id}
        clientNom={client.nom}
      />

      {pdfPreview && (
        <PdfPreviewModal
          html={pdfPreview}
          client={client}
          users={users}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  )
}
