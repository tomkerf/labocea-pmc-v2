import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2, AlertTriangle } from 'lucide-react'
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveEquipement } from '@/services/equipementService'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { saveVerification } from '@/services/verificationService'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useUsersListener } from '@/hooks/useUsers'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import CircleProgress from '@/components/materiel/CircleProgress'
import { EquipementForm } from '@/components/equipement/EquipementForm'
import { FicheDeVie } from '@/components/equipement/FicheDeVie'
import type { Equipement } from '@/types'

const DEBOUNCE = 800

function calcMetroPercent(prochainEtalonnage: string): number | null {
  if (!prochainEtalonnage) return null
  const now = Date.now()
  const next = new Date(prochainEtalonnage).getTime()
  if (next <= now) return 0
  return Math.min(100, Math.round(((next - now) / (365 * 24 * 60 * 60 * 1000)) * 100))
}

export default function EquipementPage() {
  const { equipementId } = useParams<{ equipementId: string }>()
  const navigate = useNavigate()
  const uid       = useAuthStore(selectUid)
  const initiales = useAuthStore(selectInitiales)

  useVerificationsListener()
  useMaintenancesListener()
  useUsersListener()
  const verifications = useMetrologieStore((s) => s.verifications)
  const maintenances  = useMaintenancesStore((s) => s.maintenances)

  const [equipement, setEquipement] = useState<Equipement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!equipementId) return
    const ref = doc(db, 'equipements', equipementId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setEquipement({ id: snap.id, ...snap.data() } as Equipement)
      else setEquipement(null)
      setLoading(false)
    })
    return () => unsub()
  }, [equipementId])

  function triggerSave(updated: Equipement) {
    setEquipement(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try { await saveEquipement(updated, uid) }
      finally { setSaving(false) }
    }, DEBOUNCE)
  }

  function update(field: keyof Equipement, value: unknown) {
    if (!equipement) return
    triggerSave({ ...equipement, [field]: value })
  }

  async function handleDelete() {
    if (!equipementId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await deleteDoc(doc(db, 'equipements', equipementId))
    navigate('/materiel')
  }

  const [nowMs] = useState(() => Date.now())

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
    </div>
  )
  if (!equipement) return (
    <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Équipement introuvable.</div>
  )

  const metroPercent = calcMetroPercent(equipement.prochainEtalonnage)
  const isMetroOverdue = equipement.prochainEtalonnage
    ? new Date(equipement.prochainEtalonnage).getTime() < nowMs
    : false
  const metroOverdueDays = isMetroOverdue
    ? Math.floor((nowMs - new Date(equipement.prochainEtalonnage).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="p-6 max-w-2xl">
      <button type="button" onClick={() => navigate('/materiel')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> Matériel
      </button>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          {metroPercent !== null ? (
            <CircleProgress percent={metroPercent} size={64} strokeWidth={4} label="métrologie" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>—</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {equipement.nom || 'Nouvel équipement'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {[equipement.marque, equipement.modele].filter(Boolean).join(' ') || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => { setConfirmDelete(false); handleDelete() }}
                className="text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-danger)', color: 'white' }}>
                Supprimer
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="text-sm px-2 py-1.5 rounded-lg"
                style={{ color: 'var(--color-text-secondary)' }}>
                Annuler
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)' }} title="Supprimer">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {isMetroOverdue && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
            Étalonnage en retard de {metroOverdueDays} jour{metroOverdueDays > 1 ? 's' : ''}
            {' '}— prévu le {new Date(equipement.prochainEtalonnage).toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      <EquipementForm equipement={equipement} update={update} />

      <FicheDeVie
        equipement={equipement}
        verifications={verifications.filter((v) => v.equipementId === equipementId)}
        maintenances={maintenances.filter((m) => m.equipementId === equipementId)}
        onAddNote={(note) => update('ficheDeVieNotes', [...(equipement.ficheDeVieNotes ?? []), note])}
        onUpdateNote={(id, updatedNote) => update('ficheDeVieNotes', (equipement.ficheDeVieNotes ?? []).map((n) => n.id === id ? updatedNote : n))}
        onDeleteNote={(id) => update('ficheDeVieNotes', (equipement.ficheDeVieNotes ?? []).filter((n) => n.id !== id))}
        onAddVerification={async (verif) => { 
          if (uid) {
            await saveVerification(verif, uid)
            if (verif.prochainControle) {
              update('prochainEtalonnage', verif.prochainControle)
            }
          }
        }}
        initiales={initiales}
        uid={uid ?? ''}
        equipementId={equipementId!}
        equipementNom={equipement.nom}
      />
    </div>
  )
}
