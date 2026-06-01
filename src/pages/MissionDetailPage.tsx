import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Clock, CheckCircle2, Navigation, ExternalLink } from 'lucide-react'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useClientData } from '@/hooks/useClientData'
import type { Sampling, SamplingStatus } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const STATUS_CONFIG: Record<SamplingStatus, { label: string; bg: string; color: string }> = {
  planned:      { label: 'À faire',      bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  done:         { label: 'Réalisé',      bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  overdue:      { label: 'En retard',    bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' },
  non_effectue: { label: 'Non effectué', bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
}

function getEnCoursStatus(s: Sampling): { label: string; bg: string; color: string } | null {
  if (s.status !== 'planned' || !s.plannedTime) return null
  const [h, m] = s.plannedTime.split(':').map(Number)
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const tMin = h * 60 + m
  if (nowMin >= tMin && nowMin < tMin + 120) {
    return { label: 'En cours', bg: 'var(--color-accent-light)', color: 'var(--color-accent)' }
  }
  return null
}

export default function MissionDetailPage() {
  const { clientId, planId, samplingId } = useParams<{
    clientId: string; planId: string; samplingId: string
  }>()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  const { client, loading, saving, triggerSave } = useClientData(clientId)

  useEffect(() => {
    if (!loading && !client) navigate('/missions', { replace: true })
  }, [loading, client, navigate])

  const plan = client?.plans.find((p) => p.id === planId) ?? null
  const sampling = plan?.samplings.find((s) => s.id === samplingId) ?? null

  function handleTerminer() {
    if (!client || !plan || !sampling || saving) return
    const today = new Date().toISOString().split('T')[0]
    const updatedSamplings = plan.samplings.map((s) =>
      s.id === samplingId
        ? { ...s, status: 'done' as SamplingStatus, doneDate: today, doneBy: uid ?? '' }
        : s
    )
    triggerSave({
      ...client,
      plans: client.plans.map((p) => p.id === planId ? { ...p, samplings: updatedSamplings } : p),
    })
    navigate(-1)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (!client || !plan || !sampling) {
    return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Mission introuvable.</div>
  }

  const cfg = getEnCoursStatus(sampling) ?? STATUS_CONFIG[sampling.status]
  const hasGps = plan.lat && plan.lng && plan.lat !== '' && plan.lng !== ''
  const mapsUrl = hasGps
    ? `https://maps.google.com/?q=${plan.lat},${plan.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(plan.siteNom || plan.nom || '')}`

  return (
    <div className="max-w-lg mx-auto pb-48 md:pb-32">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}>
          <ChevronLeft size={18} /> Retour
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Détail mission
        </span>
        <button type="button"
          onClick={() => navigate(`/missions/${clientId}/plan/${planId}`)}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--color-text-tertiary)' }}
          title="Ouvrir le point de prélèvement">
          <ExternalLink size={16} />
        </button>
      </div>

      {/* Carte / GPS */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative"
        style={{ height: 160, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
        {hasGps ? (
          <iframe
            title="map"
            src={`https://maps.google.com/maps?q=${plan.lat},${plan.lng}&z=15&output=embed`}
            className="size-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center gap-2">
            <MapPin size={28} style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Coordonnées GPS non renseignées
            </p>
          </div>
        )}
        {/* Bouton ouvrir Maps */}
        <a href={mapsUrl} target="_blank" rel="noreferrer"
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'white', color: 'var(--color-accent)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <Navigation size={12} />
          Ouvrir Maps
        </a>
      </div>

      {/* Infos principales */}
      <div className="mx-4 mb-4 rounded-2xl px-5 py-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          {sampling.plannedTime && (
            <span className="flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
              <Clock size={13} />
              {sampling.plannedTime}
            </span>
          )}
          <span className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
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
        <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          {plan.siteNom}{plan.nom ? ` · ${plan.nom}` : ''}
        </p>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          <span>{sampling.dateUndefined ? 'Date à définir' : `${MOIS[sampling.plannedMonth]}${sampling.plannedDay ? ` — j${sampling.plannedDay}` : ''}`}</span>
          <span>·</span>
          <span>{plan.frequence}</span>
          <span>·</span>
          <span>{plan.nature}</span>
        </div>

        {hasGps && (
          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            <MapPin size={11} />
            <span>{plan.lat}, {plan.lng}{plan.gpsApprox ? ' (approx.)' : ''}</span>
          </div>
        )}
      </div>

      {/* Contraintes terrain */}
      {plan.contraintesParticulieres && (
        <div className="mx-4 mb-4">
          <h2 className="text-xs font-semibold uppercase mb-2"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Contraintes terrain
          </h2>
          <div className="rounded-2xl px-5 py-4"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
              {plan.contraintesParticulieres}
            </p>
          </div>
        </div>
      )}

      {/* Commentaire */}
      {sampling.comment && (
        <div className="mx-4 mb-4 px-5 py-4 rounded-2xl"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs font-semibold uppercase mb-1"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Commentaire
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{sampling.comment}</p>
        </div>
      )}

      {/* Bouton Terminer — positionné au-dessus de la TabBar sur mobile */}
      {sampling.status !== 'done' && (
        <div
          className="fixed left-0 right-0 px-4 pt-3 md:bottom-0"
          style={{
            bottom: 'calc(65px + env(safe-area-inset-bottom))',
            background: 'rgba(245,245,247,0.92)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--color-border-subtle)',
            paddingBottom: '12px',
          }}>
          <button type="button"
            onClick={handleTerminer}
            disabled={saving}
            className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
            style={{
              background: saving ? 'var(--color-border)' : 'var(--color-accent)',
              color: 'white',
              boxShadow: saving ? 'none' : '0 4px 16px rgba(0,113,227,0.35)',
            }}>
            <CheckCircle2 size={20} />
            {saving ? 'Enregistrement…' : 'Terminer la mission'}
          </button>
        </div>
      )}

      {sampling.status === 'done' && (
        <div className="mx-4 px-5 py-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'var(--color-success-light)', border: '1px solid var(--color-success)' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>Mission réalisée</p>
            {sampling.doneDate && (
              <p className="text-xs" style={{ color: 'var(--color-success)' }}>
                {new Date(sampling.doneDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
