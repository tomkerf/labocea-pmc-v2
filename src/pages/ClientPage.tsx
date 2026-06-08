import { useReducer } from 'react'
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
import { COLORS } from '@/lib/constants'

// ─── Reducer ────────────────────────────────────────────────────────────────

type State = {
  confirmDelete: boolean
  pdfPreview: string | null
  confirmDeletePlanId: string | null
  sitesInput: string
  plansLocked: boolean
}

type Action =
  | { type: 'SET_CONFIRM_DELETE'; payload: boolean }
  | { type: 'SET_PDF_PREVIEW'; payload: string | null }
  | { type: 'SET_CONFIRM_DELETE_PLAN_ID'; payload: string | null }
  | { type: 'SET_SITES_INPUT'; payload: string }
  | { type: 'SET_PLANS_LOCKED'; payload: boolean }
  | { type: 'TOGGLE_PLANS_LOCKED' }

const initialState: State = {
  confirmDelete: false,
  pdfPreview: null,
  confirmDeletePlanId: null,
  sitesInput: '',
  plansLocked: true,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CONFIRM_DELETE':
      return { ...state, confirmDelete: action.payload }
    case 'SET_PDF_PREVIEW':
      return { ...state, pdfPreview: action.payload }
    case 'SET_CONFIRM_DELETE_PLAN_ID':
      return { ...state, confirmDeletePlanId: action.payload }
    case 'SET_SITES_INPUT':
      return { ...state, sitesInput: action.payload }
    case 'SET_PLANS_LOCKED':
      return { ...state, plansLocked: action.payload }
    case 'TOGGLE_PLANS_LOCKED':
      return { ...state, plansLocked: !state.plansLocked }
    default:
      return state
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  useUsersListener()
  const users = useUsersStore(s => s.users)

  const {
    client, loading, saving, remoteChanged,
    triggerSave, update, handleReload, handleDeleteClient, dismissRemoteChanged,
  } = useClientData(clientId)

  const [state, dispatch] = useReducer(reducer, initialState)
  const { confirmDelete, pdfPreview, confirmDeletePlanId, sitesInput, plansLocked } = state

  function handleSitesChange(raw: string) {
    dispatch({ type: 'SET_SITES_INPUT', payload: raw })
    if (!client) return
    const parsed = raw.split(',').flatMap((s) => { const t = s.trim(); return t ? [t] : [] })
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
    dispatch({ type: 'SET_CONFIRM_DELETE_PLAN_ID', payload: null })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-6 rounded-full border-2 animate-spin"
          style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
      </div>
    )
  }
  if (!client) return <div className="p-6 text-sm" style={{ color: COLORS.DANGER }}>Client introuvable.</div>

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
        onSetConfirmDelete={(v) => dispatch({ type: 'SET_CONFIRM_DELETE', payload: v })}
        onDelete={handleDeleteClient}
        onPdfPreview={(v) => dispatch({ type: 'SET_PDF_PREVIEW', payload: v })}
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
        onToggleLock={() => dispatch({ type: 'TOGGLE_PLANS_LOCKED' })}
        onAddPlan={addPlan}
        onAddSeparator={addSeparator}
        onReorder={handleReorder}
        onOpen={(planId) => navigate(`/missions/${client.id}/plan/${planId}`)}
        onRequestDelete={(v) => dispatch({ type: 'SET_CONFIRM_DELETE_PLAN_ID', payload: v })}
        onConfirmDelete={confirmDeletePlan}
        onCancelDelete={() => dispatch({ type: 'SET_CONFIRM_DELETE_PLAN_ID', payload: null })}
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
          onClose={() => dispatch({ type: 'SET_PDF_PREVIEW', payload: null })}
        />
      )}
    </div>
  )
}
