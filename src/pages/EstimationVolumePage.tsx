import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ArrowRight, BarChart3, Settings2 } from 'lucide-react'
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
  trop_d_aberrants: 'Trop de valeurs atypiques — vérifie tes données plutôt que de les exclure.',
}

export default function EstimationVolumePage() {
  usePointsRejetListener()
  const navigate = useNavigate()
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)

  const [view, setView] = useState<'estimer' | 'donnees'>('estimer')
  const [selId, setSelId] = useState('')
  const [pluie, setPluie] = useState('10')
  const [showImport, setShowImport] = useState(false)
  const [exclureAberrants, setExclureAberrants] = useState(false)

  const point = pointsRejet.find((p) => p.id === selId)
  const pluieMm = Number(pluie) || 0
  const res = point ? estimateVolume(point.bilans, pluieMm, { exclureAberrants }) : null
  const tropAberrants = res?.warnings.some((w) => w.type === 'trop_d_aberrants') ?? false
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
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        {/* toggle Estimer / Données */}
        <div className="flex gap-1.5 p-1.5 rounded-xl"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          {([['estimer', 'Estimer', BarChart3], ['donnees', 'Données', Settings2]] as const).map(([v, label, Icon]) => (
            <button type="button" key={v} onClick={() => setView(v)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: view === v ? COLORS.ACCENT : 'transparent', color: view === v ? 'white' : COLORS.TEXT_SECONDARY }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {view === 'estimer' && (
          <>
            <p className="text-[12px] px-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Estime le volume qui passera sur un point de rejet pendant 24h selon la pluie annoncée, à partir de vos bilans passés.
            </p>

            {pointsRejet.length === 0 ? (
              <div className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
                <p className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Aucun bilan enregistré pour l'instant. Pour estimer un volume, ajoutez d'abord vos bilans passés.
                </p>
                <button type="button" onClick={() => setView('donnees')}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                  style={{ background: COLORS.ACCENT, color: 'white' }}>
                  Aller dans Données <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                {/* sélection point */}
                <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
                  <label htmlFor="est-point" className="text-[11px] mb-1 block" style={{ color: 'var(--color-text-tertiary)' }}>Point de rejet</label>
                  <select id="est-point" value={selId} onChange={(e) => setSelId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
                    <option value="">Choisir un point de rejet…</option>
                    {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.bilans.length})</option>)}
                  </select>
                </div>

                {/* saisie pluie */}
                {point && (
                  <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
                    <Stepper label="Pluie annoncée" hint="Cumul sur 24h" value={pluie} onChange={setPluie} unit="mm" step={1} min={0} max={500} />
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

                    {res.warnings.filter((w) => w.type !== 'trop_d_aberrants').map((w) => (
                      <p key={w.type} className="text-[12px] px-3 py-2 rounded-lg"
                        style={{ background: 'var(--color-warning-light, rgba(255,149,0,0.12))', color: COLORS.WARNING }}>
                        {WARN_LABEL[w.type]}
                      </p>
                    ))}

                    {/* valeurs aberrantes */}
                    {res.nbAberrants > 0 && (
                      <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: COLORS.BG_TERTIARY }}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[12px] font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
                            {res.nbAberrants} valeur{res.nbAberrants > 1 ? 's' : ''} atypique{res.nbAberrants > 1 ? 's' : ''} détectée{res.nbAberrants > 1 ? 's' : ''}
                          </span>
                          <button type="button" role="switch" aria-checked={exclureAberrants} disabled={tropAberrants}
                            onClick={() => setExclureAberrants((v) => !v)}
                            className="relative w-10 h-6 rounded-full shrink-0 transition-colors"
                            style={{ background: exclureAberrants && !tropAberrants ? COLORS.ACCENT : COLORS.BG_SECONDARY, opacity: tropAberrants ? 0.4 : 1, cursor: tropAberrants ? 'not-allowed' : 'pointer' }}>
                            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                              style={{ left: 2, transform: exclureAberrants && !tropAberrants ? 'translateX(16px)' : 'translateX(0)', boxShadow: 'var(--shadow-card)' }} />
                          </button>
                        </div>
                        <label className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
                          {tropAberrants
                            ? WARN_LABEL.trop_d_aberrants
                            : exclureAberrants
                              ? `Exclues du calcul · R² ${res.r2.toFixed(2)} (avec : ${res.r2Brut.toFixed(2)})`
                              : `Exclure les valeurs aberrantes · sans : R² ${res.r2Brut.toFixed(2)}`}
                        </label>
                      </div>
                    )}

                    <EstimationChart bilans={point!.bilans} base={res.base} coef={res.coef} pluieMm={pluieMm} volumeEstime={res.volumeEstime} pointsAberrants={res.pointsAberrants} />

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
              </>
            )}
          </>
        )}

        {view === 'donnees' && <PointRejetManager onImport={() => setShowImport(true)} />}
      </div>

      {showImport && <BilanImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
