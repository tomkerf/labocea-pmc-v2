import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ClipboardList, Copy, Check } from 'lucide-react'
import { COLORS } from '@/lib/constants'


// ── Constantes ────────────────────────────────────────────────

const REGLE = [
  "Préleveurs automatiques réfrigérés (5±3°C) obligatoires pour bilans 24h",
  "Asservissement au débit recommandé (40% d'incertitude en moins vs temps)",
  "Volume unitaire recommandé : 50-100 mL",
  "Fréquence optimale : 4-6 prélèvements/heure (100-140/jour)",
  "Volume total échantillon : 7-10 litres (homogénéisation facilitée)",
  "Homogénéisation mécanique obligatoire (perceuse, sans vortex)",
  "Délai max échantillon → analyse : 24h (48h weekend avec étude vieillissement)",
  "Conformité : ISO 5667, FD T90-523, Arrêté du 21/07/2015",
]

const PRESETS_V24H  = [50, 100, 200, 500, 1000]
const PRESETS_FLACON = [5, 10, 20, 30]

type WarnType = 'ok' | 'warn' | 'error' | 'info'
interface Warn { type: WarnType; txt: string }
interface Result {
  nbP: string; freq: string; periode: string
  vTot: string; vEP: string; vu: string
  taux: string; warns: Warn[]
}

// ── Calcul ────────────────────────────────────────────────────

function calcResult(v24h: string, vFlacon: string, vUnit: string, mode: string, vEntre: string): Result | null {
  const V24 = parseFloat(v24h), Vfl = parseFloat(vFlacon)
  const Vu  = parseFloat(vUnit), Ve  = parseFloat(vEntre)
  if (isNaN(V24) || isNaN(Vfl) || isNaN(Vu) || V24 <= 0 || Vfl <= 0 || Vu <= 0) return null

  const warns: Warn[] = []
  let nbP: number, freq: number, periode: number, vTot: number, vEP: number

  if (mode === 'manuel') {
    if (isNaN(Ve) || Ve <= 0) return null
    nbP = V24 / Ve; vEP = Ve; freq = nbP / 24; periode = 60 / freq; vTot = (Vu * nbP) / 1000
    if (vTot > Vfl) warns.push({ type: 'error', txt: `Volume total (${vTot.toFixed(1)}L) dépasse la capacité du flacon (${Vfl}L).` })
  } else {
    nbP = (10 * 1000) / Vu
    if (nbP / 24 < 4) nbP = 4 * 24
    if (nbP / 24 > 6) nbP = 6 * 24
    vTot = (Vu * nbP) / 1000
    if (vTot > Vfl) { nbP = (Vfl * 1000) / Vu; vTot = (Vu * nbP) / 1000 }
    freq = nbP / 24; periode = 60 / freq; vEP = V24 / nbP
  }

  if (vTot > Vfl * 0.95 && vTot <= Vfl) warns.push({ type: 'warn', txt: 'Volume total proche de la capacité du flacon.' })
  if (Vu < 50)     warns.push({ type: 'warn', txt: 'Volume unitaire < 50 mL : répétabilité dégradée (ISO 5667-10).' })
  if (Vu > 100)    warns.push({ type: 'warn', txt: 'Volume unitaire > 100 mL : risque de volume total excessif.' })
  if (freq < 4)    warns.push({ type: 'warn', txt: 'Fréquence < 4/h : précision insuffisante.' })
  if (freq > 6)    warns.push({ type: 'info', txt: 'Fréquence > 6/h : vérifiez la capacité du flacon.' })
  if (periode < 3) warns.push({ type: 'warn', txt: "Période < 3 min : risque d'omissions." })
  if (vTot < 7)    warns.push({ type: 'info', txt: `Volume total ${vTot.toFixed(1)}L < 7L : homogénéisation difficile.` })
  if (vTot > 10 && vTot <= Vfl) warns.push({ type: 'info', txt: `Volume total ${vTot.toFixed(1)}L > 10L : privilégiez 7-10L.` })
  if (mode === 'auto') warns.push({ type: 'ok', txt: 'Paramètres optimisés · Stratégie n°5.' })
  else warns.push({ type: 'info', txt: `Programmez ${vEP.toFixed(3)} m³ écoulés entre prélèvements.` })

  return {
    nbP: nbP.toFixed(0), freq: freq.toFixed(1), periode: periode.toFixed(1),
    vTot: vTot.toFixed(1), vEP: vEP.toFixed(3), vu: Vu.toFixed(0),
    taux: ((vTot / Vfl) * 100).toFixed(0), warns,
  }
}

// ── Stepper ───────────────────────────────────────────────────
// Boutons ± larges (52px) pour usage terrain avec gants
// Long-press accélère l'incrément

function Stepper({ label, hint, value, onChange, unit, step, min, max }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
  unit: string; step: number; min: number; max: number
}) {
  const num     = parseFloat(value) || 0
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const adjust = useCallback((dir: 1 | -1, multiplier = 1) => {
    onChange(String(Math.min(max, Math.max(min, parseFloat((num + dir * step * multiplier).toFixed(6))))))
  }, [num, step, min, max, onChange])

  const startPress = (dir: 1 | -1) => {
    adjust(dir)
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => adjust(dir, 3), 120)
    }, 500)
  }
  const stopPress = () => {
    if (timerRef.current)  clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // Nettoyage si le composant démonte pendant un long-press
  useEffect(() => stopPress, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
          {label}
        </span>
        {hint && (
          <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>{hint}</span>
        )}
      </div>
      <div className="flex items-center rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', background: COLORS.BG_SECONDARY }}>
        {/* Bouton − */}
        <button type="button"
          onPointerDown={() => startPress(-1)} onPointerUp={stopPress}
          onPointerLeave={stopPress} onContextMenu={e => e.preventDefault()}
          className="flex items-center justify-center shrink-0 select-none"
          style={{ width: 52, height: 52, background: COLORS.BG_TERTIARY,
            fontSize: 24, fontWeight: 300, color: COLORS.TEXT_SECONDARY,
            borderRight: '1px solid var(--color-border)' }}>
          −
        </button>

        {/* Valeur + unité — input direct possible */}
        <div className="flex-1 flex items-center justify-center gap-1 px-2">
          <input
            type="number" inputMode="decimal"
            value={value}
            onChange={e => onChange(e.target.value)}
            aria-label={label}
            className="asserv-inp text-center font-bold"
            style={{
              width: '100%', height: 52, border: 'none', background: 'transparent',
              fontSize: 22, color: COLORS.TEXT_PRIMARY,
              fontVariantNumeric: 'tabular-nums', outline: 'none',
            }}
          />
          <span className="text-sm font-medium shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
            {unit}
          </span>
        </div>

        {/* Bouton + */}
        <button type="button"
          onPointerDown={() => startPress(1)} onPointerUp={stopPress}
          onPointerLeave={stopPress} onContextMenu={e => e.preventDefault()}
          className="flex items-center justify-center shrink-0 select-none"
          style={{ width: 52, height: 52, background: COLORS.BG_TERTIARY,
            fontSize: 24, fontWeight: 300, color: COLORS.ACCENT,
            borderLeft: '1px solid var(--color-border)' }}>
          +
        </button>
      </div>
    </div>
  )
}

// ── Chips de presets ──────────────────────────────────────────

function Chips({ values, current, unit, onSelect }: {
  values: number[]; current: string; unit: string; onSelect: (v: string) => void
}) {
  const cur = parseFloat(current)
  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {values.map(v => (
        <button type="button" key={v}
          onClick={() => onSelect(String(v))}
          className="px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: Math.abs(cur - v) < 0.001 ? COLORS.ACCENT : COLORS.BG_TERTIARY,
            color:      Math.abs(cur - v) < 0.001 ? 'white'               : COLORS.TEXT_SECONDARY,
            border: `1px solid ${Math.abs(cur - v) < 0.001 ? COLORS.ACCENT : COLORS.BORDER}`,
          }}>
          {v} {unit}
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function AsservissementPage() {
  const navigate = useNavigate()

  const [v24h,    setV24h]    = useState('100')
  const [vFlacon, setVFlacon] = useState('10')
  const [vUnit,   setVUnit]   = useState('70')
  const [mode,    setMode]    = useState<'auto' | 'manuel'>('auto')
  const [vEntre,  setVEntre]  = useState('1.0')
  const [regleOpen, setRegleOpen] = useState(false)
  const [copied,    setCopied]    = useState(false)

  const res = calcResult(v24h, vFlacon, vUnit, mode, vEntre)

  const tauxNum   = res ? parseInt(res.taux) : 0
  const tauxColor = tauxNum > 95 ? COLORS.DANGER
    : tauxNum > 85 ? COLORS.WARNING
    : COLORS.TEXT_PRIMARY

  const hasError = res?.warns.some(w => w.type === 'error') ?? false

  const handleCopy = () => {
    if (!res) return
    navigator.clipboard.writeText(res.vEP).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Suppression spinners
  useEffect(() => {
    if (document.getElementById('asserv-nospinner')) return
    const s = document.createElement('style')
    s.id = 'asserv-nospinner'
    s.textContent = `.asserv-inp::-webkit-inner-spin-button,.asserv-inp::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.asserv-inp{-moz-appearance:textfield}`
    document.head.appendChild(s)
    return () => { document.getElementById('asserv-nospinner')?.remove() }
  }, [])

  const stats = res ? [
    { label: 'Fréquence',         val: res.freq,    unit: '/h'  },
    { label: 'Période',           val: res.periode, unit: 'min' },
    { label: 'Nb prélèv. / 24h', val: res.nbP,     unit: ''    },
    { label: 'Vol. total',        val: res.vTot,    unit: 'L'   },
    { label: 'Remplissage',       val: res.taux,    unit: '%', danger: tauxNum > 85 },
  ] : []

  return (
    <div className="min-h-screen pb-32" style={{ background: COLORS.BG_PRIMARY }}>

      {/* Header sticky */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(245,245,247,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}>
        <button type="button" onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate"
            style={{ color: COLORS.TEXT_PRIMARY }}>
            Asservissement 24h
          </h1>
          <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
            ISO 5667 · Stratégie n°5
          </p>
        </div>
        {/* Badge mode actif */}
        <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: mode === 'auto' ? 'var(--color-accent-light)' : COLORS.BG_TERTIARY,
            color:      mode === 'auto' ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
          }}>
          {mode === 'auto' ? 'Auto' : 'Manuel'}
        </span>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Mode toggle — gros boutons */}
        <div className="flex gap-1.5 p-1.5 rounded-xl"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          {(['auto', 'manuel'] as const).map(m => (
            <button type="button" key={m} onClick={() => setMode(m)}
              className="flex-1 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: mode === m ? COLORS.ACCENT : 'transparent',
                color: mode === m ? 'white' : COLORS.TEXT_SECONDARY,
              }}>
              {m === 'auto' ? '⚡ Automatique' : '✎ Manuel'}
            </button>
          ))}
        </div>

        {/* Rejet 24h */}
        <div className="rounded-xl p-4"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <Stepper
            label="Rejet 24h"
            hint="Volume total rejeté"
            value={v24h} onChange={setV24h}
            unit="m³" step={10} min={1} max={99999}
          />
          <Chips values={PRESETS_V24H} current={v24h} unit="m³" onSelect={setV24h} />
        </div>

        {/* Flacon + Volume unitaire */}
        <div className="rounded-xl p-4 flex flex-col gap-4"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <Stepper
              label="Capacité du flacon"
              value={vFlacon} onChange={setVFlacon}
              unit="L" step={1} min={1} max={200}
            />
            <Chips values={PRESETS_FLACON} current={vFlacon} unit="L" onSelect={setVFlacon} />
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 16 }}>
            <Stepper
              label="Volume unitaire"
              hint="50–100 mL recommandés"
              value={vUnit} onChange={setVUnit}
              unit="mL" step={5} min={10} max={200}
            />
          </div>
        </div>

        {/* Volume entre prélèvements — uniquement en mode manuel */}
        {mode === 'manuel' && (
          <div className="rounded-xl p-4"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <Stepper
              label="Volume écoulé entre prélèvements"
              hint="Valeur à programmer"
              value={vEntre} onChange={setVEntre}
              unit="m³" step={0.1} min={0.01} max={100}
            />
          </div>
        )}

        {/* Résultats détaillés (stats + avertissements) */}
        {res && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {/* Stats */}
            {stats.map((s, i) => (
              <div key={s.label}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < stats.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <span className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>{s.label}</span>
                <span className="text-sm font-semibold tabular-nums"
                  style={{ color: 'danger' in s && s.danger ? tauxColor : COLORS.TEXT_PRIMARY }}>
                  {s.val}
                  {s.unit && <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{s.unit}</span>}
                </span>
              </div>
            ))}

            {/* Avertissements */}
            {res.warns.length > 0 && (
              <div className="px-4 py-3 flex flex-col gap-1.5"
                style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                {res.warns.map((w) => {
                  const bg    = w.type === 'ok' ? 'var(--color-success-light)' : w.type === 'error' ? 'var(--color-danger-light)' : w.type === 'warn' ? 'var(--color-warning-light)' : COLORS.BG_TERTIARY
                  const color = w.type === 'ok' ? COLORS.SUCCESS       : w.type === 'error' ? COLORS.DANGER       : w.type === 'warn' ? COLORS.WARNING       : COLORS.TEXT_SECONDARY
                  const dot   = w.type === 'ok' ? '✓' : w.type === 'error' ? '✕' : '•'
                  return (
                    <div key={w.txt} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: bg }}>
                      <span className="text-xs font-bold shrink-0 mt-px" style={{ color }}>{dot}</span>
                      <span className="text-xs leading-relaxed" style={{ color: COLORS.TEXT_PRIMARY }}>{w.txt}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Réglementation — accordéon */}
        <div className="rounded-xl overflow-hidden mb-2"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          <button type="button"
            onClick={() => setRegleOpen(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <ClipboardList size={15} strokeWidth={1.8} className="shrink-0"
              style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-sm font-medium flex-1" style={{ color: COLORS.TEXT_PRIMARY }}>
              Réglementation & bonnes pratiques
            </span>
            <ChevronDown size={14} strokeWidth={2}
              style={{ color: 'var(--color-text-tertiary)', transform: regleOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {regleOpen && (
            <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="flex flex-col pt-1">
                {REGLE.map((t, i) => (
                  <div key={t.slice(0, 30)} className="flex gap-3 py-2.5 text-xs leading-relaxed"
                    style={{ borderBottom: i < REGLE.length - 1 ? '1px solid var(--color-border-subtle)' : 'none', color: COLORS.TEXT_SECONDARY }}>
                    <span className="text-xs font-semibold tabular-nums shrink-0 mt-px"
                      style={{ color: 'var(--color-text-tertiary)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {t}
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                Agence de l'Eau RMC / INSA Lyon (2010) · À titre indicatif
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Barre sticky résultat ── */}
      {/* Toujours visible en bas — valeur à programmer sur le préleveur */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--color-border-subtle)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}>
        {res && !hasError ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                Volume à programmer
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tabular-nums"
                  style={{ color: COLORS.ACCENT, letterSpacing: '-0.02em' }}>
                  {res.vEP}
                </span>
                <span className="text-lg font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>m³</span>
                <span className="text-xs ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  · {res.nbP} prélèv. · {res.freq}/h
                </span>
              </div>
            </div>
            <button type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-sm shrink-0"
              style={{
                background: copied ? COLORS.SUCCESS : COLORS.ACCENT,
                color: 'white',
                minWidth: 88,
                justifyContent: 'center',
              }}>
              {copied
                ? <><Check size={15} /> Copié</>
                : <><Copy size={15} /> Copier</>
              }
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            {hasError ? (
              <p className="text-sm font-medium" style={{ color: COLORS.DANGER }}>
                ✕ Configuration invalide — vérifiez les paramètres
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                Renseignez le rejet 24h pour calculer
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
