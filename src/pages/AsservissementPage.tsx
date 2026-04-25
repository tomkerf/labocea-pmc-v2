import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ClipboardList } from 'lucide-react'

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

type WarnType = 'ok' | 'warn' | 'error' | 'info'
interface Warn { type: WarnType; txt: string }
interface Result {
  nbP: string; freq: string; periode: string
  vTot: string; vEP: string; vu: string
  taux: string; warns: Warn[]; mode: string
}

// ── Helpers UI ────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold mb-1.5"
      style={{ color: 'var(--color-text-secondary)' }}>
      {children}
    </div>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
      {children}
    </p>
  )
}

function NumInput({ value, onChange, unit, min, max, step }: {
  value: string; onChange: (v: string) => void
  unit: string; min?: number; max?: number; step?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min} max={max} step={step}
        onChange={e => onChange(e.target.value)}
        className="asserv-inp flex-1 px-3 py-2.5 rounded-lg text-right text-base font-semibold"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          outline: 'none',
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      <span className="text-sm font-medium w-8 shrink-0"
        style={{ color: 'var(--color-text-tertiary)' }}>
        {unit}
      </span>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] p-5"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}>
      {children}
    </div>
  )
}

function SectionTitle({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="text-xs font-semibold tabular-nums"
        style={{ color: 'var(--color-text-tertiary)' }}>
        {num}
      </span>
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {children}
      </span>
    </div>
  )
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
  if (periode < 3) warns.push({ type: 'warn', txt: "Période < 3 min : risque d'omissions (limites techniques)." })
  if (vTot < 7)    warns.push({ type: 'info', txt: `Volume total ${vTot.toFixed(1)}L < 7L : homogénéisation difficile.` })
  if (vTot > 10 && vTot <= Vfl) warns.push({ type: 'info', txt: `Volume total ${vTot.toFixed(1)}L > 10L : privilégiez 7-10L.` })
  if (mode === 'auto') warns.push({ type: 'ok', txt: 'Paramètres optimisés pour 4-6 prélèvements/h · Stratégie n°5.' })
  else warns.push({ type: 'info', txt: `Programmez ${vEP.toFixed(3)} m³ écoulés entre prélèvements.` })

  return {
    nbP: nbP.toFixed(0), freq: freq.toFixed(1), periode: periode.toFixed(1),
    vTot: vTot.toFixed(1), vEP: vEP.toFixed(3), vu: Vu.toFixed(0),
    taux: ((vTot / Vfl) * 100).toFixed(0), warns, mode,
  }
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

  const res = calcResult(v24h, vFlacon, vUnit, mode, vEntre)

  const tauxNum = res ? parseInt(res.taux) : 0
  const tauxColor = tauxNum > 95 ? 'var(--color-danger)'
    : tauxNum > 85 ? 'var(--color-warning)'
    : 'var(--color-text-primary)'

  // Suppression des spinners sur les inputs number
  useEffect(() => {
    if (document.getElementById('asserv-nospinner')) return
    const s = document.createElement('style')
    s.id = 'asserv-nospinner'
    s.textContent = `.asserv-inp::-webkit-inner-spin-button,.asserv-inp::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.asserv-inp{-moz-appearance:textfield}`
    document.head.appendChild(s)
    return () => { document.getElementById('asserv-nospinner')?.remove() }
  }, [])

  const stats = res ? [
    { label: 'Fréquence',          val: res.freq,    unit: '/h'  },
    { label: 'Période',            val: res.periode, unit: 'min' },
    { label: 'Nb prélèv. / 24h',  val: res.nbP,     unit: ''    },
    { label: 'Vol. unitaire',      val: res.vu,      unit: 'mL'  },
    { label: 'Vol. total',         val: res.vTot,    unit: 'L'   },
    { label: 'Remplissage',        val: res.taux,    unit: '%', danger: tauxNum > 85 },
  ] : []

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>

      {/* Header — même style que les autres pages */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'var(--color-bg-primary)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}>
        <button onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div>
          <h1 className="text-base font-semibold leading-tight"
            style={{ color: 'var(--color-text-primary)' }}>
            Prélèvements automatiques 24h
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Asservissement au débit · ISO 5667
          </p>
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">

        {/* 01 — Rejet */}
        <Card>
          <SectionTitle num="01">Rejet 24h</SectionTitle>
          <FieldLabel>Volume de rejet estimé</FieldLabel>
          <FieldHint>Volume total rejeté sur 24h par la station</FieldHint>
          <NumInput value={v24h} onChange={setV24h} unit="m³" min={0} max={10000} step={1} />
        </Card>

        {/* 02 — Configuration */}
        <Card>
          <SectionTitle num="02">Configuration</SectionTitle>

          {/* Mode toggle — style segmented control */}
          <div className="flex gap-1 p-1 rounded-lg mb-5"
            style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
            {(['auto', 'manuel'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-md text-xs font-medium transition-all"
                style={{
                  background: mode === m ? 'var(--color-bg-secondary)' : 'transparent',
                  color: mode === m ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  boxShadow: mode === m ? 'var(--shadow-card)' : 'none',
                }}>
                {m === 'auto' ? 'Automatique' : 'Manuel'}
              </button>
            ))}
          </div>

          {mode === 'manuel' && (
            <div className="mb-4">
              <FieldLabel>Volume écoulé entre prélèvements</FieldLabel>
              <FieldHint>Valeur à programmer sur le préleveur</FieldHint>
              <NumInput value={vEntre} onChange={setVEntre} unit="m³" min={0.01} max={100} step={0.1} />
            </div>
          )}

          <div className="mb-4">
            <FieldLabel>Capacité du flacon</FieldLabel>
            <NumInput value={vFlacon} onChange={setVFlacon} unit="L" min={0} max={200} step={0.5} />
          </div>

          <div>
            <FieldLabel>Volume unitaire</FieldLabel>
            <FieldHint>Recommandé : 50-100 mL</FieldHint>
            <NumInput value={vUnit} onChange={setVUnit} unit="mL" min={10} max={200} step={5} />
          </div>
        </Card>

        {/* 03 — Résultats */}
        {res && (
          <Card>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="text-xs font-semibold tabular-nums"
                style={{ color: 'var(--color-text-tertiary)' }}>03</span>
              <span className="text-sm font-semibold flex-1"
                style={{ color: 'var(--color-text-primary)' }}>Recommandations</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                Stratégie n°5
              </span>
            </div>

            {/* Volume principal — sobre, juste les chiffres */}
            <div className="rounded-[var(--radius-md)] px-5 py-6 mb-4 text-center"
              style={{
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-subtle)',
              }}>
              <p className="text-xs font-medium mb-3"
                style={{ color: 'var(--color-text-secondary)' }}>
                Volume entre prélèvements
              </p>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-5xl font-bold tabular-nums"
                  style={{ color: 'var(--color-accent)', letterSpacing: '-0.02em' }}>
                  {res.vEP}
                </span>
                <span className="text-lg font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  m³
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Valeur à programmer sur le préleveur asservi
              </p>
            </div>

            {/* Stats — tableau simple, pas de couleurs sur les bordures */}
            <div className="rounded-[var(--radius-md)] overflow-hidden mb-4"
              style={{ border: '1px solid var(--color-border-subtle)' }}>
              {stats.map((s, i) => (
                <div key={s.label}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderBottom: i < stats.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    background: i % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
                  }}>
                  <span className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {s.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums"
                    style={{ color: 'danger' in s && s.danger ? tauxColor : 'var(--color-text-primary)' }}>
                    {s.val}{s.unit && <span className="text-xs font-normal ml-0.5"
                      style={{ color: 'var(--color-text-tertiary)' }}>{s.unit}</span>}
                  </span>
                </div>
              ))}
            </div>

            {/* Alertes — badges statut */}
            <div className="flex flex-col gap-1.5">
              {res.warns.map((w, i) => {
                const bg = w.type === 'ok'    ? 'var(--color-success-light)'
                  : w.type === 'error'  ? 'var(--color-danger-light)'
                  : w.type === 'warn'   ? 'var(--color-warning-light)'
                  : 'var(--color-bg-tertiary)'
                const color = w.type === 'ok'   ? 'var(--color-success)'
                  : w.type === 'error' ? 'var(--color-danger)'
                  : w.type === 'warn'  ? 'var(--color-warning)'
                  : 'var(--color-text-secondary)'
                const dot = w.type === 'ok' ? '✓' : w.type === 'error' ? '✕' : '•'
                return (
                  <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: bg }}>
                    <span className="text-xs font-bold shrink-0 mt-px" style={{ color }}>{dot}</span>
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                      {w.txt}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Réglementation — accordéon */}
        <div className="rounded-[var(--radius-md)] overflow-hidden"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}>
          <button
            onClick={() => setRegleOpen(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left">
            <ClipboardList size={16} strokeWidth={1.8} className="shrink-0"
              style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-sm font-medium flex-1"
              style={{ color: 'var(--color-text-primary)' }}>
              Réglementation & bonnes pratiques
            </span>
            <ChevronDown size={15} strokeWidth={2}
              style={{
                color: 'var(--color-text-tertiary)',
                transform: regleOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }} />
          </button>

          {regleOpen && (
            <div className="px-5 pb-5"
              style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="flex flex-col pt-1">
                {REGLE.map((t, i) => (
                  <div key={i} className="flex gap-3 py-2.5 text-xs leading-relaxed"
                    style={{
                      borderBottom: i < REGLE.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      color: 'var(--color-text-secondary)',
                    }}>
                    <span className="text-xs font-semibold tabular-nums shrink-0 mt-px"
                      style={{ color: 'var(--color-text-tertiary)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {t}
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-4 text-center"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Agence de l'Eau RMC / INSA Lyon (2010) · À titre indicatif
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
