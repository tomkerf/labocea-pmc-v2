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
      setTechnicienUid(user.uid)
      setTechnicienNom(`${user.prenom} ${user.nom}`)
    }
  }, [user, isNew])

  useEffect(() => {
    if (!visiteId) return
    getDoc(doc(db, 'visites', visiteId)).then((snap) => {
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
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(backPath)} className="p-1.5 rounded-lg"
          style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isNew ? 'Nouvelle visite préliminaire' : 'Visite préliminaire'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{linkedNomState}</p>
        </div>
        {!isNew && (
          <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <FileText size={14} />
            Exporter
          </button>
        )}
      </div>

      {/* Champs généraux */}
      <div className="rounded-xl p-5 mb-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date de visite</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="field-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Technicien</label>
            <input value={technicienNom} onChange={e => setTechnicienNom(e.target.value)}
              className="field-input w-full" placeholder="Prénom Nom" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes générales</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
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
        style={{ border: '1.5px dashed var(--color-border)', color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}
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
                style={{ background: 'var(--color-danger)', color: 'white' }}>
                Confirmer la suppression
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm px-2 py-1.5 rounded-lg"
                style={{ color: 'var(--color-text-secondary)' }}>
                Annuler
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--color-danger)' }}>
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
          style={{ background: 'var(--color-accent)', color: 'white', opacity: saving ? 0.6 : 1 }}
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

function PointCard({ point, idx, total, uploading, onChange, onMove, onRemove, onPhotoAdd, onPhotoDelete }: PointCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const FAISABILITE: { key: FaisabiliteVisite; label: string; color: string }[] = [
    { key: 'ok', label: '✓ OK', color: 'var(--color-success)' },
    { key: 'difficile', label: '⚠ Difficile', color: 'var(--color-warning)' },
    { key: 'impossible', label: '✗ Impossible', color: 'var(--color-danger)' },
  ]

  return (
    <div className="rounded-xl p-5"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* Header point */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
          P{idx + 1}
        </span>
        <input
          value={point.nom}
          onChange={e => onChange('nom', e.target.value)}
          placeholder="Nom du point (ex: Regard aval station)"
          className="field-input flex-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          {idx > 0 && (
            <button type="button" onClick={() => onMove(-1)} className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Monter">↑</button>
          )}
          {idx < total - 1 && (
            <button type="button" onClick={() => onMove(1)} className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Descendre">↓</button>
          )}
          {total > 1 && (
            <button type="button" onClick={onRemove} className="p-1 rounded"
              style={{ color: 'var(--color-danger)' }} title="Supprimer">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Type d'eau</label>
          <select value={point.typeEau} onChange={e => onChange('typeEau', e.target.value as NatureEauType)}
            className="field-input w-full">
            {NATURE_EAU.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Méthode</label>
          <select value={point.methode} onChange={e => onChange('methode', e.target.value as MethodeType)}
            className="field-input w-full">
            {METHODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Faisabilité */}
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Faisabilité</label>
        <div className="flex gap-2">
          {FAISABILITE.map(f => (
            <button type="button"
              key={f.key}
              onClick={() => onChange('faisabilite', f.key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: point.faisabilite === f.key ? f.color : 'var(--color-bg-tertiary)',
                color: point.faisabilite === f.key ? 'white' : 'var(--color-text-secondary)',
                border: `1.5px solid ${point.faisabilite === f.key ? f.color : 'var(--color-border)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Sécurité</label>
        <input value={point.securite} onChange={e => onChange('securite', e.target.value)}
          className="field-input w-full" placeholder="EPI requis, risques, accès…" />
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
        <input value={point.notes} onChange={e => onChange('notes', e.target.value)}
          className="field-input w-full" placeholder="Remarques spécifiques…" />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Photos</label>
        {point.photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {point.photos.map(url => (
              <div key={url} className="relative rounded-lg overflow-hidden shrink-0"
                style={{ width: 80, height: 80, border: '1px solid var(--color-border)' }}>
                <img src={url} alt="photo" className="w-full h-full object-cover" loading="lazy" />
                <button type="button" onClick={() => onPhotoDelete(url)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}>
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
        <label
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: uploading ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
          }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? 'Envoi en cours…' : 'Ajouter une photo'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
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
