import { useState, useEffect, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { calcResult, PRESETS_V24H, PRESETS_FLACON } from '@/components/asservissement/asservissementConfig'
import { Stepper, Chips } from '@/components/asservissement/AsservissementStepper'
import { AsservissementResultCard } from '@/components/asservissement/AsservissementResultCard'
import { AsservissementResultBar } from '@/components/asservissement/AsservissementResultBar'
import { AsservissementRegle } from '@/components/asservissement/AsservissementRegle'

interface CalcState {
  v24h:    string
  vFlacon: string
  vUnit:   string
  mode:    'auto' | 'manuel'
  vEntre:  string
}

type CalcAction = { type: 'field'; name: keyof CalcState; value: string | 'auto' | 'manuel' }

const initialCalcState: CalcState = {
  v24h:    '100',
  vFlacon: '10',
  vUnit:   '70',
  mode:    'auto',
  vEntre:  '1.0',
}

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  return { ...state, [action.name]: action.value }
}

export default function AsservissementPage() {
  const navigate = useNavigate()

  const [calc, dispatch] = useReducer(calcReducer, initialCalcState)
  const { v24h, vFlacon, vUnit, mode, vEntre } = calc
  const [copied, setCopied] = useState(false)

  // Suppression spinners natifs sur les inputs numériques
  useEffect(() => {
    if (document.getElementById('asserv-nospinner')) return
    const s = document.createElement('style')
    s.id = 'asserv-nospinner'
    s.textContent = `.asserv-inp::-webkit-inner-spin-button,.asserv-inp::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.asserv-inp{-moz-appearance:textfield}`
    document.head.appendChild(s)
    return () => { document.getElementById('asserv-nospinner')?.remove() }
  }, [])

  const res      = calcResult(v24h, vFlacon, vUnit, mode, vEntre)
  const tauxNum  = res ? parseInt(res.taux) : 0
  const tauxColor = tauxNum > 95 ? COLORS.DANGER : tauxNum > 85 ? COLORS.WARNING : COLORS.TEXT_PRIMARY
  const hasError  = res?.warns.some(w => w.type === 'error') ?? false

  function handleCopy() {
    if (!res) return
    navigator.clipboard.writeText(res.vEP).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: COLORS.BG_PRIMARY }}>

      {/* Header sticky */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate" style={{ color: COLORS.TEXT_PRIMARY }}>Asservissement 24h</h1>
          <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>ISO 5667 · Stratégie n°5</p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: mode === 'auto' ? 'var(--color-accent-light)' : COLORS.BG_TERTIARY, color: mode === 'auto' ? COLORS.ACCENT : COLORS.TEXT_SECONDARY }}>
          {mode === 'auto' ? 'Auto' : 'Manuel'}
        </span>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Mode toggle */}
        <div className="flex gap-1.5 p-1.5 rounded-xl"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          {(['auto', 'manuel'] as const).map(m => (
            <button type="button" key={m} onClick={() => dispatch({ type: 'field', name: 'mode', value: m })}
              className="flex-1 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === m ? COLORS.ACCENT : 'transparent', color: mode === m ? 'white' : COLORS.TEXT_SECONDARY }}>
              {m === 'auto' ? '⚡ Automatique' : '✎ Manuel'}
            </button>
          ))}
        </div>

        {/* Rejet 24h */}
        <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <Stepper label="Rejet 24h" hint="Volume total rejeté" value={v24h} onChange={v => dispatch({ type: 'field', name: 'v24h', value: v })} unit="m³" step={10} min={1} max={99999} />
          <Chips values={PRESETS_V24H} current={v24h} unit="m³" onSelect={v => dispatch({ type: 'field', name: 'v24h', value: v })} />
        </div>

        {/* Flacon + Volume unitaire */}
        <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <Stepper label="Capacité du flacon" value={vFlacon} onChange={v => dispatch({ type: 'field', name: 'vFlacon', value: v })} unit="L" step={1} min={1} max={200} />
            <Chips values={PRESETS_FLACON} current={vFlacon} unit="L" onSelect={v => dispatch({ type: 'field', name: 'vFlacon', value: v })} />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 16 }}>
            <Stepper label="Volume unitaire" hint="50–100 mL recommandés" value={vUnit} onChange={v => dispatch({ type: 'field', name: 'vUnit', value: v })} unit="mL" step={5} min={10} max={200} />
          </div>
        </div>

        {/* Volume entre prélèvements (mode manuel) */}
        {mode === 'manuel' && (
          <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <Stepper label="Volume écoulé entre prélèvements" hint="Valeur à programmer" value={vEntre} onChange={v => dispatch({ type: 'field', name: 'vEntre', value: v })} unit="m³" step={0.1} min={0.01} max={100} />
          </div>
        )}

        {res && <AsservissementResultCard res={res} tauxColor={tauxColor} />}

        <AsservissementRegle />
      </div>

      <AsservissementResultBar res={res} hasError={hasError} copied={copied} onCopy={handleCopy} />
    </div>
  )
}
