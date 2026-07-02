import { useReducer, useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useClientData } from '@/hooks/useClientData'
import { createVisite, saveVisite, deleteVisite } from '@/services/visiteService'
import { uploadVisitePhoto, deleteVisitePhoto } from '@/lib/uploadPhoto'
import { generateVisiteHTML } from '@/lib/generateVisiteHTML'
import type { VisitePreliminaire, PointVisite, FrequenceType } from '@/types'
import { COLLECTIONS, COLORS } from '@/lib/constants'
import { generateId } from '@/lib/ids'
import PointCard from '@/components/visites/PointCard'
import VisiteFormHeader from '@/components/visites/VisiteFormHeader'
import VisiteGeneralFields from '@/components/visites/VisiteGeneralFields'
import VisiteFormActions from '@/components/visites/VisiteFormActions'

type FormState = {
  date: string
  technicienNom: string
  technicienUid: string
  notes: string
  points: PointVisite[]
  createdAt: Timestamp
  linkedNomState: string
  linkedTypeState: 'client' | 'demande'
  linkedIdState: string
}

function formReducer(state: FormState, update: Partial<FormState>): FormState {
  return { ...state, ...update }
}

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

  const [form, dispatch] = useReducer(formReducer, {
    date: new Date().toISOString().slice(0, 10),
    technicienNom: '',
    technicienUid: '',
    notes: '',
    points: [newPoint()],
    createdAt: Timestamp.now(),
    linkedNomState: linkedNom,
    linkedTypeState: linkedType ?? 'client',
    linkedIdState: linkedId,
  })
  const { date, technicienNom, technicienUid, notes, points, createdAt, linkedNomState, linkedTypeState, linkedIdState } = form
  const { client: linkedClient, triggerSave: saveClient } = useClientData(linkedTypeState === 'client' ? linkedIdState : undefined)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [uploadingPointId, setUploadingPointId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (user && isNew) {
      dispatch({ technicienUid: user.uid, technicienNom: `${user.prenom} ${user.nom}` })
    }
  }, [user, isNew])

  useEffect(() => {
    if (!visiteId) return
    getDoc(doc(db, COLLECTIONS.VISITES, visiteId)).then((snap) => {
      if (!snap.exists()) { navigate(-1); return }
      const v = { id: snap.id, ...snap.data() } as VisitePreliminaire
      dispatch({
        date: v.date,
        technicienNom: v.technicienNom,
        technicienUid: v.technicienUid,
        notes: v.notes,
        points: v.points.length > 0 ? v.points : [newPoint()],
        linkedNomState: v.linkedTo.nom,
        linkedTypeState: v.linkedTo.type,
        linkedIdState: v.linkedTo.id,
        createdAt: v.createdAt,
      })
      setLoading(false)
    })
  }, [visiteId, navigate])

  function updatePoint(pointId: string, field: keyof PointVisite, value: unknown) {
    dispatch({ points: points.map(p => p.id === pointId ? { ...p, [field]: value } : p) })
  }

  function movePoint(idx: number, dir: -1 | 1) {
    const next = [...points]
    const tmp = next[idx]; next[idx] = next[idx + dir]; next[idx + dir] = tmp
    dispatch({ points: next })
  }

  function removePoint(pointId: string) {
    dispatch({ points: points.filter(p => p.id !== pointId) })
  }

  async function handlePhotoAdd(pointId: string, file: File) {
    let id = visiteId ?? null
    if (isNew) {
      id = await handleSave(true)
      if (!id) return
      navigate(`/visites/${id}`, { replace: true })
    }
    setUploadingPointId(pointId)
    try {
      const url = await uploadVisitePhoto(file, id!, pointId)
      dispatch({ points: points.map(p => p.id === pointId ? { ...p, photos: [...p.photos, url] } : p) })
    } finally {
      setUploadingPointId(null)
    }
  }

  async function handlePhotoDelete(pointId: string, url: string) {
    await deleteVisitePhoto(url)
    dispatch({ points: points.map(p => p.id === pointId ? { ...p, photos: p.photos.filter(u => u !== url) } : p) })
  }

  function handleCreatePlan(pointId: string, frequence: FrequenceType, siteNom: string) {
    if (!linkedClient) return
    const visitePoint = points.find(p => p.id === pointId)
    if (!visitePoint) return
    const newPlanId = generateId()
    const newPlan = {
      id: newPlanId,
      nom: visitePoint.nom,
      siteNom,
      frequence,
      meteo: '',
      nature: visitePoint.typeEau,
      methode: visitePoint.methode,
      lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [],
    }
    saveClient({ ...linkedClient, plans: [...linkedClient.plans, newPlan] })
    dispatch({ points: points.map(p => p.id === pointId ? { ...p, pointMesureId: newPlanId } : p) })
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
    win.onload = () => win.print()
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
        onDateChange={v => dispatch({ date: v })}
        onTechnicienChange={v => dispatch({ technicienNom: v })}
        onNotesChange={v => dispatch({ notes: v })}
      />

      <div className="space-y-4 mb-6">
        {points.map((point, idx) => (
          <PointCard
            key={point.id}
            point={point}
            idx={idx}
            total={points.length}
            uploading={uploadingPointId === point.id}
            plans={linkedClient?.plans}
            onChange={(field, value) => updatePoint(point.id, field, value)}
            onMove={(dir) => movePoint(idx, dir)}
            onRemove={() => removePoint(point.id)}
            onPhotoAdd={(file) => handlePhotoAdd(point.id, file)}
            onPhotoDelete={(url) => handlePhotoDelete(point.id, url)}
            onCreatePlan={linkedClient ? (freq, site) => handleCreatePlan(point.id, freq, site) : undefined}
          />
        ))}
      </div>

      <button type="button"
        onClick={() => dispatch({ points: [...points, newPoint()] })}
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
