import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Upload, ArrowRight } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { Stepper } from '@/components/asservissement/AsservissementStepper'
import { usePointsRejetListener } from '@/hooks/usePointsRejet'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { estimateVolume, nearestBilans } from '@/lib/estimationVolume'
import { EstimationChart } from '@/components/estimation/EstimationChart'
import { PointRejetManager } from '@/components/estimation/PointRejetManager'
import { BilanImportModal } from '@/components/estimation/BilanImportModal'

const WARN_LABEL: Record<string, string> = {
  correlation_faible: 'Corrélation faible entre pluie et volume — estimation peu fiable.',
  extrapolation: 'Pluviométrie hors de la plage des bilans connus — extrapolation.',
  peu_de_points: 'Pas assez de bilans pour une estimation fiable.',
}

export default function EstimationVolumePage() {
  usePointsRejetListener()
  const navigate = useNavigate()
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)

  const [selId, setSelId] = useState('')
  const [pluie, setPluie] = useState('10')
  const [showImport, setShowImport] = useState(false)

  const point = pointsRejet.find((p) => p.id === selId)
  const pluieMm = Number(pluie) || 0
  const res = point ? estimateVolume(point.bilans, pluieMm) : null
  const degraded = point && !res ? nearestBilans(point.bilans, pluieMm) : []

  function useInAsservissement() {
    if (!res) return
    navigate(`/outils/asservissement?v24h=${Math.round(res.volumeEstime)}`)
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: COLORS.BG_PRIMARY }}>
      {/* header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(245,245,247,0.92)', backdropFilter: 'var(--glass-panel)', WebkitBackdropFilter: 'var(--glass-panel)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate" style={{ color: COLORS.TEXT_PRIMARY }}>Estimation volume 24h</h1>
          <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Temps de pluie · à partir de l'historique</p>
        </div>
        <button type="button" onClick={() => setShowImport(true)} className="p-1.5 rounded-lg shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }} aria-label="Importer CSV">
          <Upload size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        {/* sélection point */}
        <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          <select value={selId} onChange={(e) => setSelId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
            <option value="">Choisir un point de rejet…</option>
            {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.bilans.length})</option>)}
          </select>
        </div>

        {/* saisie pluie */}
        {point && (
          <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <Stepper label="Pluie attendue" hint="Cumul sur 24h" value={pluie} onChange={setPluie} unit="mm" step={1} min={0} max={500} />
          </div>
        )}

        {/* résultat */}
        {res && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>Volume 24h estimé</p>
              <p className="text-2xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>~ {Math.round(res.volumeEstime).toLocaleString('fr-FR')} m³</p>
              <p className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                entre {Math.round(res.fourchetteBasse).toLocaleString('fr-FR')} et {Math.round(res.fourchetteHaute).toLocaleString('fr-FR')} m³
                <span style={{ color: 'var(--color-text-tertiary)' }}> · R² {res.r2.toFixed(2)}</span>
              </p>
            </div>

            {res.warnings.map((w) => (
              <p key={w.type} className="text-[12px] px-3 py-2 rounded-lg"
                style={{ background: 'var(--color-warning-light, rgba(255,149,0,0.12))', color: COLORS.WARNING }}>
                {WARN_LABEL[w.type]}
              </p>
            ))}

            <EstimationChart bilans={point!.bilans} base={res.base} coef={res.coef} pluieMm={pluieMm} volumeEstime={res.volumeEstime} />

            <button type="button" onClick={useInAsservissement}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: COLORS.ACCENT, color: 'white' }}>
              Utiliser dans l'asservissement <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* mode dégradé < 3 bilans */}
        {point && !res && (
          <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <p className="text-[13px] mb-2" style={{ color: COLORS.WARNING }}>{WARN_LABEL.peu_de_points} Bilans les plus proches :</p>
            {degraded.length === 0 && <p className="text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>Aucun bilan enregistré.</p>}
            {degraded.map((bz, i) => (
              <div key={i} className="flex justify-between text-[13px] py-1" style={{ color: COLORS.TEXT_PRIMARY }}>
                <span>{bz.date}</span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>{bz.pluieMm} mm → {bz.volumeM3} m³</span>
              </div>
            ))}
          </div>
        )}

        <PointRejetManager />
      </div>

      {showImport && <BilanImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
