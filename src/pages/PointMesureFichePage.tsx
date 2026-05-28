import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Camera, Navigation, AlertTriangle, X } from 'lucide-react'
import { useClientData } from '@/hooks/useClientData'
import { useVisites } from '@/hooks/useVisites'
import { uploadPlanPhoto, deletePlanPhoto } from '@/lib/uploadPhoto'

const FAISABILITE_CONFIG = {
  ok:         { label: 'Faisable (OK)',   bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  difficile:  { label: 'Difficile',       bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
  impossible: { label: 'Impossible',      bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' },
}

export default function PointMesureFichePage() {
  const { clientId, planId } = useParams<{ clientId: string; planId: string }>()
  const navigate = useNavigate()

  const { client, loading: clientLoading, saving, triggerSave } = useClientData(clientId)
  const { visites, loading: visitesLoading } = useVisites(clientId ?? '')

  const plan = client?.plans.find((p) => p.id === planId) ?? null

  const [contraintes, setContraintes] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [uploading, setUploading] = useState(false)

  // Synchroniser les contraintes locales lorsque le plan est chargé
  useEffect(() => {
    if (plan) {
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
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (!client || !plan) {
    return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Point de prélèvement introuvable.</div>
  }

  // 1. Mappage des inspections du point dans les visites préliminaires
  const pointVisits = visites.flatMap(v =>
    (v.points || [])
      .filter(p => p.nom.trim().toLowerCase() === plan.nom.trim().toLowerCase())
      .map(p => ({
        visitId: v.id,
        date: v.date,
        technicienNom: v.technicienNom,
        ...p
      }))
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

  // 5. Gestion des photos associées à la fiche du point
  async function handlePlanPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !client || !plan || uploading) return
    setUploading(true)
    try {
      const url = await uploadPlanPhoto(file, clientId!, planId!)
      const updatedPlans = client.plans.map(p =>
        p.id === planId ? { ...p, photos: [...(p.photos || []), url] } : p
      )
      await triggerSave({
        ...client,
        plans: updatedPlans
      })
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function handlePlanPhotoDelete(url: string) {
    if (!client || !plan) return
    try {
      await deletePlanPhoto(url)
      const updatedPlans = client.plans.map(p =>
        p.id === planId ? { ...p, photos: (p.photos || []).filter(u => u !== url) } : p
      )
      await triggerSave({
        ...client,
        plans: updatedPlans
      })
    } catch (err) {
      console.error(err)
    }
  }

  const hasGps = plan.lat && plan.lng && plan.lat !== '' && plan.lng !== ''
  const mapsUrl = hasGps
    ? `https://maps.google.com/?q=${plan.lat},${plan.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(plan.siteNom || plan.nom || '')}`

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}>
          <ChevronLeft size={18} /> Retour
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Mémoire du point
        </span>
        <div className="w-16" /> {/* Spacer pour équilibrer */}
      </div>

      {/* Carte GPS */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative"
        style={{ height: 160, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
        {hasGps ? (
          <iframe
            title="map"
            src={`https://maps.google.com/maps?q=${plan.lat},${plan.lng}&z=15&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <MapPin size={28} style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Coordonnées GPS non renseignées
            </p>
          </div>
        )}
        <a href={mapsUrl} target="_blank" rel="noreferrer"
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'white', color: 'var(--color-accent)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <Navigation size={12} />
          Ouvrir Maps
        </a>
      </div>

      {/* Infos Générales */}
      <div className="mx-4 mb-6 rounded-2xl px-5 py-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          {plan.cofrac && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
              COFRAC
            </span>
          )}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            {plan.nature}
          </span>
          {saving && (
            <span className="text-xs ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
              Sauvegarde…
            </span>
          )}
        </div>

        <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {client.nom}
        </h1>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {plan.siteNom}{plan.nom ? ` · ${plan.nom}` : ''}
        </p>

        <div className="mt-3 pt-3 flex flex-col gap-2 text-xs"
          style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>
          <div className="flex justify-between">
            <span>Fréquence :</span>
            <span className="font-medium text-right">{plan.frequence}</span>
          </div>
          <div className="flex justify-between">
            <span>Méthode de prélèvement :</span>
            <span className="font-medium text-right">{plan.methode}</span>
          </div>
          <div className="flex justify-between">
            <span>Préleveur référent :</span>
            <span className="font-medium text-right">{client.preleveur || '—'}</span>
          </div>
        </div>
      </div>

      {/* Contraintes Terrain (Modifiables) */}
      <div className="mx-4 mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Mémoire Terrain & Contraintes
          </h2>
          {saveStatus === 'saving' && (
            <span className="text-[11px]" style={{ color: 'var(--color-accent)' }}>Enregistrement…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[11px]" style={{ color: 'var(--color-success)' }}>Enregistré ✓</span>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <textarea
            value={contraintes}
            onChange={(e) => setContraintes(e.target.value)}
            onBlur={handleSaveContraintes}
            rows={4}
            className="w-full p-4 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            placeholder="Saisissez ici les contraintes d'accès, codes barrières, équipements spécifiques requis..."
          />
        </div>
      </div>

      {/* Photos de repérage (Fiche) */}
      <div className="mx-4 mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Photos de repérage (Fiche)
          </h2>
          {uploading && (
            <span className="text-[11px]" style={{ color: 'var(--color-accent)' }}>Envoi…</span>
          )}
        </div>
        <div className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          
          {/* Plan photos grid */}
          {(plan.photos ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(plan.photos ?? []).map((url, i) => (
                <div key={url} className="relative rounded-lg overflow-hidden shrink-0"
                  style={{ width: 80, height: 80, border: '1px solid var(--color-border)' }}>
                  <img src={url} alt={`Repérage ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => handlePlanPhotoDelete(url)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white"
                    title="Supprimer cette photo"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-98"
            style={{
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: uploading ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
              opacity: uploading ? 0.6 : 1,
              pointerEvents: uploading ? 'none' : 'auto',
            }}
          >
            {uploading ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'var(--color-accent)' }} />
            ) : (
              <Camera size={16} />
            )}
            {uploading ? 'Envoi en cours…' : 'Ajouter une photo de repérage'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePlanPhotoChange}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Galerie Photos */}
      {allPhotos.length > 0 && (
        <div className="mx-4 mb-6">
          <h2 className="text-xs font-semibold uppercase mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Photos du point ({allPhotos.length})
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {allPhotos.map((url, i) => (
              <div key={i} className="shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-gray-200 relative bg-gray-50">
                <img src={url} alt={`Point ${i}`} className="w-full h-full object-cover" />
                <a href={url} target="_blank" rel="noreferrer" 
                  className="absolute bottom-1 right-1 p-1 bg-white/80 backdrop-blur rounded-full text-gray-700 hover:text-blue-600">
                  <Camera size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visites Préliminaires */}
      {pointVisits.length > 0 && (
        <div className="mx-4 mb-6">
          <h2 className="text-xs font-semibold uppercase mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Visites Préliminaires ({pointVisits.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pointVisits.map((pv) => {
              const cfgF = FAISABILITE_CONFIG[pv.faisabilite] || FAISABILITE_CONFIG.ok
              const visitDateStr = new Date(pv.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <div key={pv.visitId} className="rounded-2xl px-4 py-3.5"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Visite du {visitDateStr}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: cfgF.bg, color: cfgF.color }}>
                      {cfgF.label}
                    </span>
                  </div>
                  
                  {pv.notes && (
                    <p className="text-xs mb-2 whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {pv.notes}
                    </p>
                  )}
                  {pv.securite && (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50 text-[11px] text-red-700">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-500" />
                      <span>{pv.securite}</span>
                    </div>
                  )}

                  <div className="mt-2 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    Par {pv.technicienNom}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Historique des Prélèvements */}
      <div className="mx-4">
        <h2 className="text-xs font-semibold uppercase mb-2 px-1"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Historique des Prélèvements
        </h2>
        {samplingHistory.length === 0 ? (
          <div className="rounded-2xl px-5 py-4 text-xs text-center"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>
            Aucun prélèvement encore réalisé sur ce point.
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {samplingHistory.map((s, idx) => {
              const fmtDate = new Date(s.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <div key={s.id} className="px-5 py-3 text-left"
                  style={{ borderBottom: idx < samplingHistory.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Prélèvement le {fmtDate}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                      tech: {s.assignedTo || client.preleveur || '—'}
                    </span>
                  </div>
                  {s.comment ? (
                    <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.comment}
                    </p>
                  ) : (
                    <p className="text-xs italic" style={{ color: 'var(--color-text-tertiary)' }}>
                      Aucun commentaire.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
