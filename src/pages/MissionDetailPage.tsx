import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Clock, CheckCircle2, Navigation, ExternalLink, CalendarClock, X } from 'lucide-react'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useClientData } from '@/hooks/useClientData'
import type { Sampling, SamplingStatus } from '@/types'
import { SaisieRapideModal } from '@/components/tournee/SaisieRapideModal'
import type { SaisieRapideData } from '@/components/tournee/SaisieRapideModal'
import { COLORS } from '@/lib/constants'


const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const STATUS_CONFIG: Record<SamplingStatus, { label: string; bg: string; color: string }> = {
  planned:      { label: 'À faire',      bg: COLORS.BG_TERTIARY,   color: COLORS.TEXT_SECONDARY },
  done:         { label: 'Réalisé',      bg: 'var(--color-success-light)', color: COLORS.SUCCESS },
  overdue:      { label: 'En retard',    bg: 'var(--color-danger-light)',  color: COLORS.DANGER },
  non_effectue: { label: 'Non effectué', bg: 'var(--color-warning-light)', color: COLORS.WARNING },
}

const MISSION_DURATION_MINUTES = 120;

function getEnCoursStatus(sampling: Sampling): { label: string; bg: string; color: string } | null {
  if (sampling.status !== 'planned' || !sampling.plannedTime) return null;
  const [hours, minutes] = sampling.plannedTime.split(':').map(Number);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const plannedMinutes = hours * 60 + minutes;
  if (currentMinutes >= plannedMinutes && currentMinutes < plannedMinutes + MISSION_DURATION_MINUTES) {
    return { label: 'En cours', bg: 'var(--color-accent-light)', color: COLORS.ACCENT };
  }
  return null;
}

function getFormattedISODate(sampling: Sampling): string {
  if (!sampling.plannedDay || sampling.plannedMonth === undefined) return '';
  const year = new Date().getFullYear();
  const month = String(sampling.plannedMonth + 1).padStart(2, '0');
  const day = String(sampling.plannedDay).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MissionDetailPage() {
  const { clientId, planId, samplingId } = useParams<{
    clientId: string; planId: string; samplingId: string
  }>()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  const [j1Modal, setJ1Modal] = useState<'non_effectue' | 'reporte' | null>(null)

  const { client, loading, saving, triggerSave } = useClientData(clientId)

  useEffect(() => {
    if (!loading && !client) navigate('/missions', { replace: true })
  }, [loading, client, navigate])

  const plan = client?.plans.find((p) => p.id === planId) ?? null
  const sampling = plan?.samplings.find((s) => s.id === samplingId) ?? null

  function saveSamplingPatch(patch: Partial<Sampling>) {
    if (!client || !plan) return;
    const updatedSamplings = plan.samplings.map((s) =>
      s.id === samplingId ? { ...s, ...patch } : s
    );
    const updatedPlans = client.plans.map((p) =>
      p.id === planId ? { ...p, samplings: updatedSamplings } : p
    );
    triggerSave({ ...client, plans: updatedPlans });
  }

  // J1 Bilan 24h : calculé à partir des dates, pas du param URL
  // Bloque la validation uniquement si aujourd'hui == date planifiée (= jour de pose)
  const todayISO = new Date().toISOString().split('T')[0];
  const plannedISO = sampling ? getFormattedISODate(sampling) : '';
  const isAutoJ1 = plan?.methode === 'Automatique' && !!plannedISO && plannedISO === todayISO;

  function handleTerminer() {
    if (!client || !plan || !sampling || saving) return;
    const today = new Date().toISOString().split('T')[0];
    saveSamplingPatch({ status: 'done' as SamplingStatus, doneDate: today, doneBy: uid ?? '' });
    navigate(-1);
  }

  function handleJ1Action(data: SaisieRapideData) {
    if (!client || !plan || !sampling) return;
    let patch: Partial<Sampling>;
    if (data.status === 'non_effectue') {
      patch = { status: 'non_effectue', motif: data.motif };
    } else {
      const newDate = new Date(data.newPlannedDate + 'T12:00:00');
      const fromISO = getFormattedISODate(sampling);
      patch = {
        plannedMonth: newDate.getMonth(),
        plannedDay: newDate.getDate(),
        reportHistory: [
          ...(sampling.reportHistory ?? []),
          { from: fromISO, to: data.newPlannedDate, by: uid ?? '', reason: data.motif, at: new Date().toISOString() },
        ],
      };
    }
    saveSamplingPatch(patch);
    setJ1Modal(null);
    navigate(-1);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-6 rounded-full border-2 animate-spin"
          style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
      </div>
    )
  }

  if (!client || !plan || !sampling) {
    return <div className="p-6 text-sm" style={{ color: COLORS.DANGER }}>Mission introuvable.</div>
  }

  const statusConfig = getEnCoursStatus(sampling) ?? STATUS_CONFIG[sampling.status]
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
          style={{ color: COLORS.ACCENT }}>
          <ChevronLeft size={18} /> Retour
        </button>
        <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
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
        style={{ height: 160, background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}>
        {hasGps ? (
          <iframe
            title="map"
            src={`https://maps.google.com/maps?q=${plan.lat},${plan.lng}&z=15&output=embed`}
            className="size-full border-0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
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
          style={{ background: 'white', color: COLORS.ACCENT, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <Navigation size={12} />
          Ouvrir Maps
        </a>
      </div>

      {/* Infos principales */}
      <div className="mx-4 mb-4 rounded-2xl px-5 py-4"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          {sampling.plannedTime && (
            <span className="flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
              <Clock size={13} />
              {sampling.plannedTime}
            </span>
          )}
          <span className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ background: statusConfig.bg, color: statusConfig.color }}>
            {statusConfig.label}
          </span>
          {saving && (
            <span className="text-xs ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
              Sauvegarde…
            </span>
          )}
        </div>

        <h1 className="text-lg font-bold mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>
          {client.nom}
        </h1>
        <p className="text-sm mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
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
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.04em' }}>
            Contraintes terrain
          </h2>
          <div className="rounded-2xl px-5 py-4"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.TEXT_PRIMARY }}>
              {plan.contraintesParticulieres}
            </p>
          </div>
        </div>
      )}

      {/* Commentaire */}
      {sampling.comment && (
        <div className="mx-4 mb-4 px-5 py-4 rounded-2xl"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs font-semibold uppercase mb-1"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.04em' }}>
            Commentaire
          </p>
          <p className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{sampling.comment}</p>
        </div>
      )}

      {sampling.status !== 'done' && (
        <>
          {/* Mobile : barre fixe en bas */}
          <div
            className="md:hidden fixed left-0 right-0 px-4 pt-3"
            style={{
              bottom: 'calc(65px + env(safe-area-inset-bottom))',
              background: 'rgba(245,245,247,0.92)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid var(--color-border-subtle)',
              paddingBottom: '12px',
            }}>
            {isAutoJ1 ? (
              <div className="flex flex-col gap-2">
                <button type="button"
                  onClick={() => setJ1Modal('reporte')}
                  className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
                  style={{ background: COLORS.ACCENT, color: 'white', boxShadow: '0 4px 16px rgba(0,113,227,0.35)' }}>
                  <CalendarClock size={20} />
                  Décaler la mission
                </button>
                <button type="button"
                  onClick={() => setJ1Modal('non_effectue')}
                  className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
                  <X size={15} />
                  Non effectué
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button type="button"
                  onClick={handleTerminer}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
                  style={{ background: saving ? COLORS.BORDER : COLORS.ACCENT, color: 'white', boxShadow: saving ? 'none' : '0 4px 16px rgba(0,113,227,0.35)' }}>
                  <CheckCircle2 size={20} />
                  {saving ? 'Enregistrement…' : 'Terminer la mission'}
                </button>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setJ1Modal('non_effectue')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
                    <X size={15} />
                    Non effectué
                  </button>
                  <button type="button"
                    onClick={() => setJ1Modal('reporte')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                    style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
                    <CalendarClock size={15} />
                    Décaler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop : boutons inline en bas de la carte */}
          <div className="hidden md:block mx-4 mb-6 mt-4">
            {isAutoJ1 ? (
              <div className="flex gap-3 justify-end">
                <button type="button"
                  onClick={() => setJ1Modal('non_effectue')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
                  style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
                  <X size={15} />
                  Non effectué
                </button>
                <button type="button"
                  onClick={() => setJ1Modal('reporte')}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                  style={{ background: COLORS.ACCENT, color: 'white', boxShadow: '0 2px 8px rgba(0,113,227,0.3)' }}>
                  <CalendarClock size={16} />
                  Décaler la mission
                </button>
              </div>
            ) : (
              <div className="flex gap-3 justify-end">
                <button type="button"
                  onClick={() => setJ1Modal('non_effectue')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
                  style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
                  <X size={15} />
                  Non effectué
                </button>
                <button type="button"
                  onClick={() => setJ1Modal('reporte')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
                  style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
                  <CalendarClock size={15} />
                  Décaler
                </button>
                <button type="button"
                  onClick={handleTerminer}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                  style={{ background: saving ? COLORS.BORDER : COLORS.ACCENT, color: 'white', boxShadow: saving ? 'none' : '0 2px 8px rgba(0,113,227,0.3)' }}>
                  <CheckCircle2 size={16} />
                  {saving ? 'Enregistrement…' : 'Terminer la mission'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {sampling.status === 'done' && (
        <div className="mx-4 px-5 py-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'var(--color-success-light)', border: '1px solid var(--color-success)' }}>
          <CheckCircle2 size={20} style={{ color: COLORS.SUCCESS }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: COLORS.SUCCESS }}>Mission réalisée</p>
            {sampling.doneDate && (
              <p className="text-xs" style={{ color: COLORS.SUCCESS }}>
                {new Date(sampling.doneDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      )}

      {j1Modal && plan && (
        <SaisieRapideModal
          clientNom={client.nom}
          siteNom={plan.siteNom ?? ''}
          nature={plan.nature ?? ''}
          initialStatus={j1Modal}
          hideRealise
          onConfirm={handleJ1Action}
          onClose={() => setJ1Modal(null)}
        />
      )}
    </div>
  )
}
