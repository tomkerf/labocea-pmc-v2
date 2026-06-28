import { useReducer, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { createPointRejet, updatePointRejet, deletePointRejet } from '@/services/pointsRejetService'
import type { BilanRejet } from '@/types'

// double-confirmation suppression
type ConfirmState = { id: string | null }
type ConfirmAction = { type: 'arm'; id: string } | { type: 'reset' }
function confirmReducer(_s: ConfirmState, a: ConfirmAction): ConfirmState {
  return a.type === 'arm' ? { id: a.id } : { id: null }
}

export function PointRejetManager() {
  const uid = useAuthStore(selectUid)
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)
  const [confirm, dispatch] = useReducer(confirmReducer, { id: null })
  const [nom, setNom] = useState('')
  const [selId, setSelId] = useState<string>('')
  const [bilan, setBilan] = useState<BilanRejet>({ date: '', pluieMm: 0, volumeM3: 0 })

  async function addPoint() {
    if (!uid || !nom.trim()) return
    await createPointRejet(nom.trim(), '', uid)
    setNom('')
  }

  async function addBilan() {
    if (!uid || !selId || !bilan.date) return
    const point = pointsRejet.find((p) => p.id === selId)
    if (!point) return
    await updatePointRejet(selId, { bilans: [...point.bilans, bilan] }, uid)
    setBilan({ date: '', pluieMm: 0, volumeM3: 0 })
  }

  async function remove(id: string) {
    if (confirm.id !== id) { dispatch({ type: 'arm', id }); return }
    await deletePointRejet(id)
    dispatch({ type: 'reset' })
  }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
      <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Gestion des points de rejet</h2>

      {/* nouveau point */}
      <div className="flex gap-2">
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du point"
          className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
        <button type="button" onClick={addPoint} className="px-3 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
          <Plus size={18} />
        </button>
      </div>

      {/* liste points */}
      <div className="flex flex-col gap-1">
        {pointsRejet.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
            style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
            <span>{p.nom} <span style={{ color: 'var(--color-text-tertiary)' }}>· {p.bilans.length} bilan(s)</span></span>
            <button type="button" onClick={() => remove(p.id)}
              className="px-2 py-1 rounded text-[12px] font-semibold"
              style={{ background: confirm.id === p.id ? COLORS.DANGER : 'transparent', color: confirm.id === p.id ? 'white' : COLORS.DANGER }}>
              {confirm.id === p.id ? 'Confirmer' : <Trash2 size={16} />}
            </button>
          </div>
        ))}
      </div>

      {/* ajout bilan */}
      <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <select value={selId} onChange={(e) => setSelId(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
          <option value="">Ajouter un bilan à…</option>
          {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={bilan.date} onChange={(e) => setBilan({ ...bilan, date: e.target.value })}
            className="flex-1 px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          <input type="number" value={bilan.pluieMm} onChange={(e) => setBilan({ ...bilan, pluieMm: Number(e.target.value) })}
            placeholder="mm" className="w-20 px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          <input type="number" value={bilan.volumeM3} onChange={(e) => setBilan({ ...bilan, volumeM3: Number(e.target.value) })}
            placeholder="m³" className="w-24 px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          <button type="button" onClick={addBilan} className="px-3 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
