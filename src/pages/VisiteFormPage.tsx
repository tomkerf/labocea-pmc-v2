import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Camera, Loader2, FileText, X } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { createVisite, saveVisite, deleteVisite } from '@/services/visiteService'
import { uploadVisitePhoto, deleteVisitePhoto } from '@/lib/uploadPhoto'
import { generateVisiteHTML } from '@/lib/generateVisiteHTML'
import type { VisitePreliminaire, PointVisite, NatureEauType, MethodeType, FaisabiliteVisite } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { COLLECTIONS, COLORS } from '@/lib/constants'


const NATURE_EAU: NatureEauType[] = ['Eau usée', 'Rivière', 'Souterraine', 'Eau pluviale', 'Eau saline', 'Boues', 'Autre']
const METHODES: MethodeType[] = ['Ponctuel', 'Composite', 'Automatique']

function newPoint(): PointVisite {
  return {
    id: crypto.randomUUID(),
    nom: '',
    typeEau: 'Eau usée',
    methode: 'Ponctuel',
    faisabilite: 'ok',
    securite: '',
    notes: '',
    photos: [],
  }
}

export default function VisiteFormPage() {
  const { visiteId } = useParams<{ visiteId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.appUser)

  const isNew = !visiteId
  const linkedType = searchParams.get('type') as 'client' | 'demande' | null
  const linkedId = searchParams.get('id') ?? ''
  const linkedNom = searchParams.get('nom') ?? ''

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [technicienNom, setTechnicienNom] = useState('')
  const [technicienUid, setTechnicienUid] = useState('')
  const [notes, setNotes] = useState('')
  const [points, setPoints] = useState<PointVisite[]>([newPoint()])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [uploadingPointId, setUploadingPointId] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<Timestamp>(Timestamp.now())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [linkedNomState, setLinkedNomState] = useState(linkedNom)
  const [linkedTypeState, setLinkedTypeState] = useState<'client' | 'demande'>(linkedType ?? 'client')
  const [linkedIdState, setLinkedIdState] = useState(linkedId)

  useEffect(() => {
    if (user && isNew) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTechnicienUid(user.uid)
      setTechnicienNom(`${user.prenom} ${user.nom}`)
    }
  }, [user, isNew])

  useEffect(() => {
    if (!visiteId) return
    getDoc(doc(db, COLLECTIONS.VISITES, visiteId)).then((snap) => {
      if (!snap.exists()) { navigate(-1); return }
      const v = { id: snap.id, ...snap.data() } as VisitePreliminaire
      setDate(v.date)
      setTechnicienNom(v.technicienNom)
      setTechnicienUid(v.technicienUid)
      setNotes(v.notes)
      setPoints(v.points.length > 0 ? v.points : [newPoint()])
      setLinkedNomState(v.linkedTo.nom)
      setLinkedTypeState(v.linkedTo.type)
      setLinkedIdState(v.linkedTo.id)
      setCreatedAt(v.createdAt)
      setLoading(false)
    })
  }, [visiteId, navigate])

  function updatePoint(pointId: string, field: keyof PointVisite, value: unknown) {
    setPoints(ps => ps.map(p => p.id === pointId ? { ...p, [field]: value } : p))
  }

  function movePoint(idx: number, dir: -1 | 1) {
    setPoints(ps => {
      const next = [...ps]
      const tmp = next[idx]
      next[idx] = next[idx + dir]
      next[idx + dir] = tmp
      return next
    })
  }

  function removePoint(pointId: string) {
    setPoints(ps => ps.filter(p => p.id !== pointId))
  }

  async function handlePhotoAdd(pointId: string, file: File) {
    if (isNew) {
      await handleSave(false)
      return
    }
    const id = visiteId!
    setUploadingPointId(pointId)
    try {
      const url = await uploadVisitePhoto(file, id, pointId)
      setPoints(ps => ps.map(p => p.id === pointId ? { ...p, photos: [...p.photos, url] } : p))
    } finally {
      setUploadingPointId(null)
    }
  }

  async function handlePhotoDelete(pointId: string, url: string) {
    await deleteVisitePhoto(url)
    setPoints(ps => ps.map(p => p.id === pointId ? { ...p, photos: p.photos.filter(u => u !== url) } : p))
  }

  async function handleSave(silent = false): Promise<string | null> {
    if (!date || points.some(p => !p.nom.trim())) return null
    setSaving(true)
    try {
      const payload = {
        linkedTo: { type: linkedTypeState, id: linkedIdState, nom: linkedNomState },
        date,
        technicienUid,
        technicienNom,
        notes,
        points,
      }
      if (isNew) {
        const newId = await createVisite(payload)
        if (!silent) navigate(`/visites/${newId}`, { replace: true })
        return newId
      } else {
        await saveVisite({ id: visiteId!, ...payload, createdAt, updatedAt: Timestamp.now() })
        if (!silent) navigate(-1)
        return visiteId!
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!visiteId) return
    await deleteVisite(visiteId)
    navigate(-1)
  }

  function handleExport() {
    const visite: VisitePreliminaire = {
      id: visiteId ?? '',
      linkedTo: { type: linkedTypeState, id: linkedIdState, nom: linkedNomState },
      date, technicienUid, technicienNom, notes, points,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    }
    const html = generateVisiteHTML(visite)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.print()
  }

  const backPath = linkedTypeState === 'client'
    ? `/missions/${linkedIdState}`
    : `/demandes`

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-6 rounded-full border-2 animate-spin"
          style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(backPath)} aria-label="Retour" className="p-1.5 rounded-lg"
          style={{ color: COLORS.TEXT_SECONDARY }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            {isNew ? 'Nouvelle visite préliminaire' : 'Visite préliminaire'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{linkedNomState}</p>
        </div>
        {!isNew && (
          <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_SECONDARY }}>
            <FileText size={14} />
            Exporter
          </button>
        )}
      </div>

      {/* Champs généraux */}
      <div className="rounded-xl p-5 mb-4"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="vf-date" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Date de visite</label>
            <input id="vf-date" type="date" value={date} onChange={e => setDate(e.target.value)}
              className="field-input w-full" />
          </div>
          <div>
            <label htmlFor="vf-technicien" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Technicien</label>
            <input id="vf-technicien" value={technicienNom} onChange={e => setTechnicienNom(e.target.value)}
              className="field-input w-full" placeholder="Prénom Nom" />
          </div>
          <div className="col-span-2">
            <label htmlFor="vf-notes" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Notes générales</label>
            <textarea id="vf-notes" value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className="field-input w-full resize-none"
              placeholder="Remarques générales sur le site…" />
          </div>
        </div>
      </div>

      {/* Points */}
      <div className="space-y-4 mb-6">
        {points.map((point, idx) => (
          <PointCard
            key={point.id}
            point={point}
            idx={idx}
            total={points.length}
            uploading={uploadingPointId === point.id}
            onChange={(field, value) => updatePoint(point.id, field, value)}
            onMove={(dir) => movePoint(idx, dir)}
            onRemove={() => removePoint(point.id)}
            onPhotoAdd={(file) => handlePhotoAdd(point.id, file)}
            onPhotoDelete={(url) => handlePhotoDelete(point.id, url)}
          />
        ))}
      </div>

      <button type="button"
        onClick={() => setPoints(ps => [...ps, newPoint()])}
        className="flex items-center gap-2 w-full py-3 rounded-xl text-sm font-medium mb-6"
        style={{ border: '1.5px dashed var(--color-border)', color: COLORS.ACCENT, background: 'var(--color-accent-light)' }}
      >
        <Plus size={16} />
        Ajouter un point
      </button>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {!isNew && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleDelete} className="text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: COLORS.DANGER, color: 'white' }}>
                Confirmer la suppression
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm px-2 py-1.5 rounded-lg"
                style={{ color: COLORS.TEXT_SECONDARY }}>
                Annuler
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm px-3 py-1.5 rounded-lg"
              style={{ color: COLORS.DANGER }}>
              <Trash2 size={14} className="inline mr-1" />
              Supprimer
            </button>
          )
        )}
        {isNew && <div />}
        <button type="button"
          onClick={() => handleSave()}
          disabled={saving || !date || !technicienNom.trim() || points.some(p => !p.nom.trim())}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: COLORS.ACCENT, color: 'white', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ── PointCard ─────────────────────────────────────────────────

interface PointCardProps {
  point: PointVisite
  idx: number
  total: number
  uploading: boolean
  onChange: (field: keyof PointVisite, value: unknown) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onPhotoAdd: (file: File) => void
  onPhotoDelete: (url: string) => void
}

const FAISABILITE: { key: FaisabiliteVisite; label: string; color: string }[] = [
  { key: 'ok', label: '✓ OK', color: COLORS.SUCCESS },
  { key: 'difficile', label: '⚠ Difficile', color: COLORS.WARNING },
  { key: 'impossible', label: '✗ Impossible', color: COLORS.DANGER },
]

function PointCard({ point, idx, total, uploading, onChange, onMove, onRemove, onPhotoAdd, onPhotoDelete }: PointCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-xl p-5"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* Header point */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
          P{idx + 1}
        </span>
        <input
          value={point.nom}
          onChange={e => onChange('nom', e.target.value)}
          placeholder="Nom du point (ex: Regard aval station)"
          aria-label="Nom du point de visite"
          className="field-input flex-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          {idx > 0 && (
            <button type="button" onClick={() => onMove(-1)} aria-label="Monter ce point" className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Monter">↑</button>
          )}
          {idx < total - 1 && (
            <button type="button" onClick={() => onMove(1)} aria-label="Descendre ce point" className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Descendre">↓</button>
          )}
          {total > 1 && (
            <button type="button" onClick={onRemove} aria-label="Supprimer ce point" className="p-1 rounded"
              style={{ color: COLORS.DANGER }} title="Supprimer">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor={`pc-type-eau-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Type d'eau</label>
          <select id={`pc-type-eau-${point.id}`} value={point.typeEau} onChange={e => onChange('typeEau', e.target.value as NatureEauType)}
            className="field-input w-full">
            {NATURE_EAU.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`pc-methode-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Méthode</label>
          <select id={`pc-methode-${point.id}`} value={point.methode} onChange={e => onChange('methode', e.target.value as MethodeType)}
            className="field-input w-full">
            {METHODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Faisabilité */}
      <div className="mb-3" role="group" aria-labelledby={`pc-faisabilite-label-${point.id}`}>
        <p id={`pc-faisabilite-label-${point.id}`} className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>Faisabilité</p>
        <div className="flex gap-2">
          {FAISABILITE.map(f => (
            <button type="button"
              key={f.key}
              onClick={() => onChange('faisabilite', f.key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: point.faisabilite === f.key ? f.color : COLORS.BG_TERTIARY,
                color: point.faisabilite === f.key ? 'white' : COLORS.TEXT_SECONDARY,
                border: `1.5px solid ${point.faisabilite === f.key ? f.color : COLORS.BORDER}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor={`pc-securite-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Sécurité</label>
        <input id={`pc-securite-${point.id}`} value={point.securite} onChange={e => onChange('securite', e.target.value)}
          className="field-input w-full" placeholder="EPI requis, risques, accès…" />
      </div>

      <div className="mb-3">
        <label htmlFor={`pc-notes-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Notes</label>
        <input id={`pc-notes-${point.id}`} value={point.notes} onChange={e => onChange('notes', e.target.value)}
          className="field-input w-full" placeholder="Remarques spécifiques…" />
      </div>

      {/* Photos */}
      <div>
        <p className="block text-xs font-medium mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>Photos</p>
        {point.photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {point.photos.map(url => (
              <div key={url} className="relative rounded-lg overflow-hidden shrink-0"
                style={{ width: 96, height: 96, border: '1px solid var(--color-border)' }}>
                <a href={url} target="_blank" rel="noreferrer" className="block size-full">
                  <img src={url} alt="photo" className="size-full object-cover cursor-zoom-in" loading="lazy" />
                </a>
                <button type="button" onClick={() => onPhotoDelete(url)}
                  aria-label="Supprimer cette photo"
                  className="absolute top-1 right-1 size-5 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors">
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
        <label
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            background: COLORS.BG_TERTIARY,
            border: '1px solid var(--color-border)',
            color: uploading ? 'var(--color-text-tertiary)' : COLORS.TEXT_SECONDARY,
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
          }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? 'Envoi en cours…' : 'Ajouter une photo'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoAdd(f) }}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}
