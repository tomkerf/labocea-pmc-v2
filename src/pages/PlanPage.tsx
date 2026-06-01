import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, FileText, AlertTriangle, BookOpen } from 'lucide-react'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useUsersStore } from '@/stores/usersStore'
import { useClientData } from '@/hooks/useClientData'
import { PlanConfigSection } from '@/components/plan/PlanConfigSection'
import { SamplingRow } from '@/components/plan/SamplingRow'
import { PdfPreviewModal } from '@/components/plan/PdfPreviewModal'
import { usePlanActions } from '@/hooks/usePlanActions'

export default function PlanPage() {
  const { clientId, planId } = useParams<{ clientId: string; planId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  useUsersListener()
  const users = useUsersStore((s) => s.users)
  const currentUser = users.find((u) => u.uid === uid)
  const currentUserNom = currentUser
    ? `${currentUser.prenom} ${currentUser.nom}`
    : (uid ?? '—')

  const {
    client,
    loading,
    saving,
    remoteChanged,
    triggerSave,
    handleReload,
    dismissRemoteChanged,
  } = useClientData(clientId)

  useEffect(() => {
    if (!loading && !client) navigate('/missions', { replace: true })
  }, [loading, client, navigate])

  const [selectedSampling, setSelectedSampling] = useState<string | null>(null)
  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const [confirmGen, setConfirmGen] = useState(false)
  const [confirmDelSampling, setConfirmDelSampling] = useState<string | null>(null)

  const plan = client?.plans.find((p) => p.id === planId) ?? null

  const {
    updatePlan, updateSampling,
    generateSamplingsForPlan, addCustomSampling, deleteSampling,
    openPdfPreview,
  } = usePlanActions({
    uid, currentUserNom, users,
    clientId, planId, plan, client,
    triggerSave, setPdfPreview,
    setSelectedSampling,
  })

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="size-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
    </div>
  )
  if (!client || !plan) return (
    <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Point introuvable.</div>
  )

  const isCustom = plan.frequence === 'Personnalisé'

  return (
    <div className="p-4 sm:p-6 max-w-2xl pb-10">
      <button type="button" onClick={() => navigate(`/missions/${clientId}`)}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> {client.nom}
      </button>

      {remoteChanged && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={15} />
            Modifié par <strong>{remoteChanged.byName}</strong> pendant votre édition.
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleReload} className="font-semibold underline underline-offset-2">
              Recharger
            </button>
            <button type="button" onClick={dismissRemoteChanged}
              style={{ color: 'var(--color-text-secondary)' }} className="text-xs">
              Ignorer
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {plan.nom || 'Point sans nom'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {plan.siteNom || 'Site non renseigné'}
          </p>
        </div>
        {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
      </div>

      <PlanConfigSection plan={plan} onUpdate={updatePlan} clientId={clientId!} planId={planId!} />

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Prélèvements {new Date().getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => navigate(`/missions/${clientId}/plan/${planId}/fiche`)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium cursor-pointer"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            >
              <BookOpen size={14} />
              <span>Fiche du point</span>
            </button>
            {plan.samplings.length > 0 && (
              <button type="button"
                onClick={() => openPdfPreview(false)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                <FileText size={14} />
                <span className="hidden sm:inline">Aperçu PDF</span>
              </button>
            )}
            {isCustom ? (
              <button type="button"
                onClick={() => addCustomSampling()}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                <Plus size={14} /> Ajouter une intervention
              </button>
            ) : confirmGen ? (
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => { setConfirmGen(false); generateSamplingsForPlan() }}
                  className="text-sm px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--color-danger)', color: 'white' }}>
                  Confirmer
                </button>
                <button type="button" onClick={() => setConfirmGen(false)}
                  className="text-sm px-2 py-1.5 rounded-lg"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmGen(true)}
                className="text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                Générer
              </button>
            )}
          </div>
        </div>

        {plan.samplings.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {isCustom
              ? 'Aucun prélèvement — clique sur "Ajouter une intervention" pour créer les interventions une par une.'
              : 'Aucun prélèvement — clique sur "Générer" pour créer le calendrier automatiquement.'}
          </p>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {plan.samplings.map((s, i) => (
              <SamplingRow
                key={s.id}
                sampling={s}
                index={i}
                total={plan.samplings.length}
                isCustom={isCustom}
                isSelected={selectedSampling === s.id}
                confirmDel={confirmDelSampling === s.id}
                clientId={clientId!}
                planId={planId!}
                users={users}
                onSelect={() => setSelectedSampling(selectedSampling === s.id ? null : s.id)}
                onUpdate={(field, val) => updateSampling(s.id, field, val)}
                onDeleteRequest={() => setConfirmDelSampling(s.id)}
                onDeleteCancel={() => setConfirmDelSampling(null)}
                onDeleteConfirm={() => { deleteSampling(s.id, selectedSampling); setConfirmDelSampling(null) }}
              />
            ))}
          </div>
        )}
      </div>

      {pdfPreview && (
        <PdfPreviewModal
          srcDoc={pdfPreview}
          onClose={() => setPdfPreview(null)}
          onPrint={() => openPdfPreview(true)}
        />
      )}
    </div>
  )
}
