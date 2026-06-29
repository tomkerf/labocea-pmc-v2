import { useReducer, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
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

const labelCls = 'text-[11px] mb-1 block'

export function PointRejetManager({ onImport }: { onImport: () => void }) {
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
    <div className="flex flex-col gap-4">
      {/* import CSV */}
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Importer des bilans</h2>
        <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Le plus rapide : un fichier CSV au format <code>point,date,pluie_mm,volume_m3</code>.
        </p>
        <button type="button" onClick={onImport}
          className="self-start px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
          style={{ background: COLORS.ACCENT, color: 'white' }}>
          <Upload size={16} /> Importer un CSV
        </button>
      </div>

      {/* points de rejet */}
      <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Points de rejet</h2>

        {/* nouveau point */}
        <div>
          <label htmlFor="pr-nom" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Nouveau point de rejet</label>
          <div className="flex gap-2">
            <input id="pr-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. STEP Quimper - rejet principal"
              aria-label="Nom du point de rejet"
              className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
            <button type="button" onClick={addPoint} aria-label="Ajouter le point" className="px-3 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* liste points */}
        <div className="flex flex-col gap-1">
          {pointsRejet.length === 0 && <p className="text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>Aucun point pour l'instant.</p>}
          {pointsRejet.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
              <span>{p.nom} <span style={{ color: 'var(--color-text-tertiary)' }}>· {p.bilans.length} bilan(s)</span></span>
              <button type="button" onClick={() => remove(p.id)} aria-label={confirm.id === p.id ? 'Confirmer la suppression' : 'Supprimer le point'}
                className="px-2 py-1 rounded text-[12px] font-semibold"
                style={{ background: confirm.id === p.id ? COLORS.DANGER : 'transparent', color: confirm.id === p.id ? 'white' : COLORS.DANGER }}>
                {confirm.id === p.id ? 'Confirmer' : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ajouter un bilan */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Ajouter un bilan passé</h2>
        <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Un bilan = un épisode pluvieux passé : sa pluviométrie sur 24h et le volume réellement mesuré.
        </p>

        <div>
          <label htmlFor="pr-sel" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Point concerné</label>
          <select id="pr-sel" value={selId} onChange={(e) => setSelId(e.target.value)}
            aria-label="Point de rejet à enrichir"
            className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
            <option value="">Choisir un point…</option>
            {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label htmlFor="pr-date" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Date</label>
            <input id="pr-date" type="date" value={bilan.date} onChange={(e) => setBilan({ ...bilan, date: e.target.value })}
              aria-label="Date du bilan"
              className="w-full px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          </div>
          <div className="w-24">
            <label htmlFor="pr-pluie" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Pluie (mm)</label>
            <input id="pr-pluie" type="number" value={bilan.pluieMm} onChange={(e) => setBilan({ ...bilan, pluieMm: Number(e.target.value) })}
              aria-label="Pluviométrie en mm"
              className="w-full px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          </div>
          <div className="w-28">
            <label htmlFor="pr-vol" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Volume (m³)</label>
            <input id="pr-vol" type="number" value={bilan.volumeM3} onChange={(e) => setBilan({ ...bilan, volumeM3: Number(e.target.value) })}
              aria-label="Volume en m³"
              className="w-full px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          </div>
          <button type="button" onClick={addBilan} aria-label="Ajouter le bilan" className="px-3 py-2 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
