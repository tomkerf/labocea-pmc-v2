import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { createVisite, saveVisite, deleteVisite } from '@/services/visiteService'
import { uploadVisitePhoto, deleteVisitePhoto } from '@/lib/uploadPhoto'
import { generateVisiteHTML } from '@/lib/generateVisiteHTML'
import type { VisitePreliminaire, PointVisite } from '@/types'
import { COLLECTIONS, COLORS } from '@/lib/constants'
import PointCard from '@/components/visites/PointCard'
import VisiteFormHeader from '@/components/visites/VisiteFormHeader'
import VisiteGeneralFields from '@/components/visites/VisiteGeneralFields'
import VisiteFormActions from '@/components/visites/VisiteFormActions'

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

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [technicienNom, setTechnicienNom] = useState('')
  const [technicienUid, setTechnicienUid] = useState('')
  const [notes, setNotes] = useState('')
  const [points, setPoints] = useState<PointVisite[]>([newPoint()])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [uploadingPointId, setUploadingPointId] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<Timestamp>(() => Timestamp.now())
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
      <VisiteFormHeader
        isNew={isNew}
        linkedNom={linkedNomState}
        onBack={() => navigate(backPath)}
        onExport={handleExport}
      />

      <VisiteGeneralFields
        date={date}
        technicienNom={technicienNom}
        notes={notes}
        onDateChange={setDate}
        onTechnicienChange={setTechnicienNom}
        onNotesChange={setNotes}
      />

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

      <VisiteFormActions
        isNew={isNew}
        saving={saving}
        canSave={!!date && !!technicienNom.trim() && points.every(p => !!p.nom.trim())}
        confirmDelete={confirmDelete}
        onSave={() => handleSave()}
        onDelete={handleDelete}
        onConfirmDelete={() => setConfirmDelete(true)}
        onCancelDelete={() => setConfirmDelete(false)}
      />
    </div>
  )
}
