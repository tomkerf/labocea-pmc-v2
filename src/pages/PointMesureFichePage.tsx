import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PointMesureMap } from '@/components/pointMesure/PointMesureMap'
import { PointMesureInfos } from '@/components/pointMesure/PointMesureInfos'
import { PointMesureContraintes } from '@/components/pointMesure/PointMesureContraintes'
import { PointMesurePhotos } from '@/components/pointMesure/PointMesurePhotos'
import { PointMesureVisites } from '@/components/pointMesure/PointMesureVisites'
import { PointMesureHistorique } from '@/components/pointMesure/PointMesureHistorique'
import { useClientData } from '@/hooks/useClientData'
import { useVisites } from '@/hooks/useVisites'
import { COLORS } from '@/lib/constants'


export default function PointMesureFichePage() {
  const { clientId, planId } = useParams<{ clientId: string; planId: string }>()
  const navigate = useNavigate()

  const { client, loading: clientLoading, saving, triggerSave } = useClientData(clientId)
  const { visites, loading: visitesLoading } = useVisites(clientId ?? '')

  const plan = client?.plans.find((p) => p.id === planId) ?? null

  const [contraintes, setContraintes] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Synchroniser les contraintes locales lorsque le plan est chargé
  useEffect(() => {
    if (plan) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContraintes(plan.contraintesParticulieres || '')
    }
  }, [plan])

  // Redirection si client non trouvé
  useEffect(() => {
    if (!clientLoading && !client) {
      navigate('/missions', { replace: true })
    }
  }, [clientLoading, client, navigate])

  if (clientLoading || visitesLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-6 rounded-full border-2 animate-spin"
          style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
      </div>
    )
  }

  if (!client || !plan) {
    return <div className="p-6 text-sm" style={{ color: COLORS.DANGER }}>Point de prélèvement introuvable.</div>
  }

  // 1. Mappage des inspections du point dans les visites préliminaires
  const pointVisits = visites.flatMap(v =>
    (v.points || []).flatMap(p => {
      const matchById = p.pointMesureId ? p.pointMesureId === plan.id : false
      const matchByName = !p.pointMesureId && p.nom.trim().toLowerCase() === plan.nom.trim().toLowerCase()
      return matchById || matchByName
        ? [{ visitId: v.id, date: v.date, technicienNom: v.technicienNom, ...p }]
        : []
    })
  )

  // 2. Historique des prélèvements réalisés sur ce plan
  const samplingHistory = [...plan.samplings]
    .filter(s => s.status === 'done' && s.doneDate)
    .sort((a, b) => b.doneDate.localeCompare(a.doneDate))

  // 3. Agrégation de la galerie photos
  const planPhotos = plan.photos || []
  const samplingPhotos = plan.samplings.flatMap(s => s.photos || [])
  const visitPhotos = pointVisits.flatMap(pv => pv.photos || [])
  const allPhotos = Array.from(new Set([...planPhotos, ...samplingPhotos, ...visitPhotos]))

  // 4. Enregistrement automatique des contraintes terrain
  function handleSaveContraintes() {
    if (!client || !plan || saving) return
    setSaveStatus('saving')
    const updatedPlans = client.plans.map(p =>
      p.id === planId ? { ...p, contraintesParticulieres: contraintes } : p
    )
    triggerSave({
      ...client,
      plans: updatedPlans
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }




  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: COLORS.ACCENT }}>
          <ChevronLeft size={18} /> Retour
        </button>
        <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
          Mémoire du point
        </span>
        <div className="w-16" /> {/* Spacer pour équilibrer */}
      </div>

      <PointMesureMap plan={plan} />
      <PointMesureInfos plan={plan} client={client} saving={saving} />
      <PointMesureContraintes 
        contraintes={contraintes} 
        setContraintes={setContraintes} 
        handleSaveContraintes={handleSaveContraintes} 
        saveStatus={saveStatus} 
      />
      <PointMesurePhotos plan={plan} allPhotos={allPhotos} />
      <PointMesureVisites pointVisits={pointVisits} />
      <PointMesureHistorique samplingHistory={samplingHistory} client={client} />
    </div>
  )
}
