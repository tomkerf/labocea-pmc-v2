import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { ChevronLeft, MapPin, Clock, CheckCircle2, Circle, Navigation, ExternalLink } from 'lucide-react'
import { db } from '@/lib/firebase'
import { saveClient } from '@/hooks/useClients'
import { useAuthStore } from '@/stores/authStore'
import type { Client, Sampling, SamplingStatus, ChecklistItem } from '@/types'

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
  const uid = useAuthStore((s) => s.uid())

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = useRef(false)

  useEffect(() => {
    if (!clientId) return
    const ref = doc(db, 'clients-v2', clientId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && !isDirty.current) setClient({ id: snap.id, ...snap.data() } as Client)
      setLoading(false)
    })
    return () => unsub()
  }, [clientId])

  const plan = client?.plans.find((p) => p.id === planId) ?? null
  const sampling = plan?.samplings.find((s) => s.id === samplingId) ?? null

  function triggerSave(updated: Client) {
    isDirty.current = true
    setClient(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try { await saveClient(updated, uid) }
      finally { setSaving(false); isDirty.current = false }
    }, 600)
  }

  function updateSampling(field: keyof Sampling, value: unknown) {
    if (!client || !plan || !sampling) return
    const updatedSamplings = plan.samplings.map((s) =>
      s.id === samplingId ? { ...s, [field]: value } : s
    )
    triggerSave({
      ...client,
      plans: client.plans.map((p) => p.id === planId ? { ...p, samplings: updatedSamplings } : p),
    })
  }

  function toggleChecklist(itemId: string) {
    if (!sampling) return
    const checklist = (sampling.checklist ?? []).map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    )
    updateSampling('checklist', checklist)
  }

  async function handleTerminer() {
    if (!client || !plan || !sampling || saving) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const updatedSamplings = plan.samplings.map((s) =>
      s.id === samplingId
        ? { ...s, status: 'done' as SamplingStatus, doneDate: today, doneBy: uid ?? '' }
        : s
    )
    const updated = {
      ...client,
      plans: client.plans.map((p) => p.id === planId ? { ...p, samplings: updatedSamplings } : p),
    }
    try {
      await saveClient(updated, uid ?? '')
      setClient(updated)
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (!client || !plan || !sampling) {
    return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Mission introuvable.</div>
  }

  const cfg = getEnCoursStatus(sampling) ?? STATUS_CONFIG[sampling.status]
  const checklist: ChecklistItem[] = sampling.checklist ?? []
  const checklistDone = checklist.filter((i) => i.done).length
  const hasGps = plan.lat && plan.lng && plan.lat !== '' && plan.lng !== ''
  const mapsUrl = hasGps
    ? `https://maps.google.com/?q=${plan.lat},${plan.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(plan.siteNom || plan.nom || '')}`

  return (
    <div className="max-w-lg mx-auto pb-32">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}>
          <ChevronLeft size={18} /> Retour
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Détail mission
        </span>
        <button
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
            className="w-full h-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
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
          <span>{MOIS[sampling.plannedMonth]}{sampling.plannedDay ? ` — j${sampling.plannedDay}` : ''}</span>
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

      {/* Checklist */}
      {checklist.length > 0 && (
        <div className="mx-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Checklist terrain
            </h2>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              {checklistDone}/{checklist.length}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {checklist.map((item, i) => (
              <button
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
                style={{
                  borderBottom: i < checklist.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {item.done
                  ? <CheckCircle2 size={22} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  : <Circle size={22} style={{ color: 'var(--color-border)', flexShrink: 0 }} />
                }
                <span className="flex-1 text-sm font-medium"
                  style={{
                    color: item.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                  {item.label}
                </span>
              </button>
            ))}
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

      {/* Bouton Terminer */}
      {sampling.status !== 'done' && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3"
          style={{
            background: 'rgba(245,245,247,0.92)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--color-border-subtle)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          }}>
          <button
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
