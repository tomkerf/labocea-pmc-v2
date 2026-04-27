import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, FileText } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface VolumeResult {
  conforme: boolean
  moyD: number; moyFn: number; moyG: number
  fidD: number; fidFn: number; fidOK: boolean
  justesse: number; justOK: boolean; volOK: boolean
}

interface VitesseResult {
  conforme: boolean
  vD: number[]; vFn: number[]
  moyVD: number; moyVFn: number
}

interface PeseeResult {
  conforme: boolean
  confNb: boolean; confVol: boolean
  nbAtt: number; nbReal: number; ecartNbPct: number
  volTheo: number; volReel: number; ecartVolPct: number
}

interface TempResult {
  conforme: boolean
  tD: number; tFn: number; tMn: number; tMx: number
}

type TabId = 'identification' | 'volume' | 'vitesse' | 'pesee' | 'temperature' | 'synthese'

// ─────────────────────────────────────────────────────────────────────────────
// Calculs
// ─────────────────────────────────────────────────────────────────────────────

function calcVolume(
  vTheo: string,
  vD: [string, string, string],
  vF: [string, string, string]
): VolumeResult | null {
  const theo = parseFloat(vTheo)
  const d = vD.map(parseFloat)
  const f = vF.map(parseFloat)
  if ([theo, ...d, ...f].some(isNaN)) return null

  const moyD  = d.reduce((a, b) => a + b) / 3
  const moyFn = f.reduce((a, b) => a + b) / 3
  const moyG  = (moyD + moyFn) / 2
  const fidD  = ((Math.max(...d) - Math.min(...d)) / moyD) * 100
  const fidFn = ((Math.max(...f) - Math.min(...f)) / moyFn) * 100
  const fidOK = fidD <= 5 && fidFn <= 5
  const justesse = Math.abs(((moyG - theo) / theo) * 100)
  const justOK = justesse <= 10
  const volOK  = moyG >= 50
  return { conforme: fidOK && justOK && volOK, moyD, moyFn, moyG, fidD, fidFn, fidOK, justesse, justOK, volOK }
}

function calcVitesse(
  distD: string, distF: string,
  tD: [string, string, string],
  tF: [string, string, string]
): VitesseResult | null {
  const dD = parseFloat(distD), dFn = parseFloat(distF)
  const timesD = tD.map(parseFloat)
  const timesFn = tF.map(parseFloat)
  if ([dD, dFn, ...timesD, ...timesFn].some(isNaN)) return null
  const vD  = timesD.map(t => dD / t)
  const vFn = timesFn.map(t => dFn / t)
  const moyVD  = vD.reduce((a, b) => a + b) / 3
  const moyVFn = vFn.reduce((a, b) => a + b) / 3
  const conforme = [...vD, ...vFn].every(v => v >= 0.5)
  return { conforme, vD, vFn, moyVD, moyVFn }
}

function calcPesee(
  volRejet: string, asserv: string, nbReal: string,
  volUnit: string, pVide: string, pPlein: string
): PeseeResult | null {
  const vals = [volRejet, asserv, nbReal, volUnit, pVide, pPlein].map(parseFloat)
  if (vals.some(isNaN)) return null
  const [vR, as, nb, vu, pV, pP] = vals
  const nbAtt = vR / as
  const ecartNbPct = ((nb - nbAtt) / nbAtt) * 100
  const confNb = Math.abs(ecartNbPct) <= 5
  const volTheo = (nb * vu) / 1000
  const volReel = pP - pV
  const ecartVolPct = ((volReel - volTheo) / volTheo) * 100
  const confVol = Math.abs(ecartVolPct) <= 10
  return { conforme: confNb && confVol, confNb, confVol, nbAtt, nbReal: nb, ecartNbPct, volTheo, volReel, ecartVolPct }
}

function calcTemp(tD: string, tFn: string, tMn: string, tMx: string): TempResult | null {
  const vals = [tD, tFn, tMn, tMx].map(parseFloat)
  if (vals.some(isNaN)) return null
  const [d, f, mn, mx] = vals
  return { conforme: mn >= 2 && mx <= 8 && d >= 2 && d <= 8 && f >= 2 && f <= 8, tD: d, tFn: f, tMn: mn, tMx: mx }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] p-5"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-4"
      style={{ color: 'var(--color-text-tertiary)' }}>
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-1"
      style={{ color: 'var(--color-text-secondary)' }}>
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg text-sm"
      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
    />
  )
}

function NumInput({ value, onChange, unit, placeholder }: { value: string; onChange: (v: string) => void; unit?: string; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number" inputMode="decimal" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2.5 rounded-lg text-right text-base font-semibold"
        style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
      />
      {unit && <span className="text-sm w-8 shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{unit}</span>}
    </div>
  )
}

function StatusBadge({ conforme }: { conforme: boolean | null }) {
  if (conforme === null) return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
      ⏳ Non vérifié
    </span>
  )
  return conforme
    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>✓ Conforme</span>
    : <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>✕ Non conforme</span>
}

function ResultRow({ label, val, ok }: { label: string; val: string; ok?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5 px-4"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
        {val}
        {ok !== undefined && <span>{ok ? '✅' : '❌'}</span>}
      </span>
    </div>
  )
}

function ResultBox({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] overflow-hidden mt-4"
      style={{ border: `1px solid ${ok ? 'var(--color-success)' : 'var(--color-danger)'}`, background: ok ? 'var(--color-success-light)' : 'var(--color-danger-light)' }}>
      <div className="px-4 py-2.5 font-bold text-sm"
        style={{ color: ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {ok ? '✅ CONFORME' : '❌ NON CONFORME'}
      </div>
      <div className="rounded-b-[var(--radius-md)] overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)' }}>
        {children}
      </div>
    </div>
  )
}

function NormInfo({ text }: { text: string }) {
  return (
    <p className="text-xs px-3 py-2 rounded-lg mb-4"
      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
      {text}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Identification
// ─────────────────────────────────────────────────────────────────────────────

function TabIdentification({ fields, set }: {
  fields: Record<string, string>
  set: (k: string, v: string) => void
}) {
  const f = (k: string) => fields[k] ?? ''
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Informations générales</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><FieldLabel>Client</FieldLabel><TextInput value={f('client')} onChange={v => set('client', v)} placeholder="Nom du client" /></div>
          <div><FieldLabel>Site</FieldLabel><TextInput value={f('site')} onChange={v => set('site', v)} placeholder="Nom du site" /></div>
          <div><FieldLabel>N° Convention</FieldLabel><TextInput value={f('convention')} onChange={v => set('convention', v)} placeholder="REF-XXXX" /></div>
          <div><FieldLabel>Opérateur Labocea</FieldLabel><TextInput value={f('operateur')} onChange={v => set('operateur', v)} placeholder="Prénom NOM" /></div>
          <div><FieldLabel>Date vérification</FieldLabel><TextInput value={f('dateVerif')} onChange={v => set('dateVerif', v)} placeholder="JJ/MM/AAAA" /></div>
          <div><FieldLabel>Heure début</FieldLabel><TextInput value={f('heureDebut')} onChange={v => set('heureDebut', v)} placeholder="HH:MM" /></div>
        </div>
      </Card>
      <Card>
        <SectionTitle>Échantillonneur & éprouvette</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Nature échantillon</FieldLabel>
            <select value={f('nature')} onChange={e => set('nature', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}>
              <option value="">Sélectionner…</option>
              <option>Effluent brut</option>
              <option>Effluent prétraité</option>
              <option>Effluent traité</option>
              <option>Eau pluviale</option>
            </select>
          </div>
          <div><FieldLabel>Point d'échantillonnage</FieldLabel><TextInput value={f('pointEch')} onChange={v => set('pointEch', v)} placeholder="Ex: Entrée STEP" /></div>
          <div><FieldLabel>Marque / Modèle préleveur</FieldLabel><TextInput value={f('preleveur')} onChange={v => set('preleveur', v)} placeholder="Ex: ISCO 6712" /></div>
          <div><FieldLabel>N° série</FieldLabel><TextInput value={f('seriePrel')} onChange={v => set('seriePrel', v)} placeholder="SN-XXXXXX" /></div>
          <div><FieldLabel>N° éprouvette réf.</FieldLabel><TextInput value={f('eprouvette')} onChange={v => set('eprouvette', v)} placeholder="EP-XXX" /></div>
          <div><FieldLabel>Vol. unitaire programmé (mL)</FieldLabel><NumInput value={f('volumeProgr')} onChange={v => set('volumeProgr', v)} placeholder="Ex: 70" /></div>
        </div>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Volume
// ─────────────────────────────────────────────────────────────────────────────

function TabVolume({ vTheo, setVTheo, vD, setVD, vF, setVF }: {
  vTheo: string; setVTheo: (v: string) => void
  vD: [string, string, string]; setVD: (i: number, v: string) => void
  vF: [string, string, string]; setVF: (i: number, v: string) => void
}) {
  const res = calcVolume(vTheo, vD, vF)
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <NormInfo text="Norme FD T90-523-2 § 6.3.1 — Fidélité ≤ 5 %, justesse ≤ 10 %, volume moyen ≥ 50 mL" />
        <FieldLabel>Volume unitaire théorique programmé (mL)</FieldLabel>
        <NumInput value={vTheo} onChange={setVTheo} unit="mL" placeholder="Ex: 70" />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Mesures DÉBUT de mission</SectionTitle>
          {([1, 2, 3] as const).map((n, i) => (
            <div key={i} className="mb-3">
              <FieldLabel>Essai {n} (mL)</FieldLabel>
              <NumInput value={vD[i]} onChange={v => setVD(i, v)} unit="mL" placeholder="0.0" />
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Mesures FIN de mission</SectionTitle>
          {([1, 2, 3] as const).map((n, i) => (
            <div key={i} className="mb-3">
              <FieldLabel>Essai {n} (mL)</FieldLabel>
              <NumInput value={vF[i]} onChange={v => setVF(i, v)} unit="mL" placeholder="0.0" />
            </div>
          ))}
        </Card>
      </div>
      {res && (
        <ResultBox ok={res.conforme}>
          <ResultRow label="Moyenne DÉBUT" val={`${res.moyD.toFixed(1)} mL`} />
          <ResultRow label="Moyenne FIN" val={`${res.moyFn.toFixed(1)} mL`} />
          <ResultRow label="Moyenne GLOBALE" val={`${res.moyG.toFixed(1)} mL`} />
          <ResultRow label="Fidélité DÉBUT (≤ 5 %)" val={`${res.fidD.toFixed(2)} %`} ok={res.fidOK} />
          <ResultRow label="Fidélité FIN (≤ 5 %)" val={`${res.fidFn.toFixed(2)} %`} ok={res.fidOK} />
          <ResultRow label="Justesse (≤ 10 %)" val={`${res.justesse.toFixed(2)} %`} ok={res.justOK} />
          <ResultRow label="Volume moyen ≥ 50 mL" val={`${res.moyG.toFixed(1)} mL`} ok={res.volOK} />
        </ResultBox>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Vitesse
// ─────────────────────────────────────────────────────────────────────────────

function TabVitesse({ distD, setDistD, distF, setDistF, tD, setTD, tF, setTF }: {
  distD: string; setDistD: (v: string) => void
  distF: string; setDistF: (v: string) => void
  tD: [string, string, string]; setTD: (i: number, v: string) => void
  tF: [string, string, string]; setTF: (i: number, v: string) => void
}) {
  const res = calcVitesse(distD, distF, tD, tF)
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <NormInfo text="Norme FD T90-523-2 § 6.3.2 — Critère : vitesse ≥ 0,5 m/s pour chaque essai" />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Mesures DÉBUT</SectionTitle>
          <div className="mb-3"><FieldLabel>Distance tube (m)</FieldLabel><NumInput value={distD} onChange={setDistD} unit="m" placeholder="Ex: 1.5" /></div>
          {([1, 2, 3] as const).map((n, i) => (
            <div key={i} className="mb-3">
              <FieldLabel>Temps essai {n} (s)</FieldLabel>
              <NumInput value={tD[i]} onChange={v => setTD(i, v)} unit="s" placeholder="0.0" />
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Mesures FIN</SectionTitle>
          <div className="mb-3"><FieldLabel>Distance tube (m)</FieldLabel><NumInput value={distF} onChange={setDistF} unit="m" placeholder="Ex: 1.5" /></div>
          {([1, 2, 3] as const).map((n, i) => (
            <div key={i} className="mb-3">
              <FieldLabel>Temps essai {n} (s)</FieldLabel>
              <NumInput value={tF[i]} onChange={v => setTF(i, v)} unit="s" placeholder="0.0" />
            </div>
          ))}
        </Card>
      </div>
      {res && (
        <ResultBox ok={res.conforme}>
          <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Vitesses DÉBUT</p>
          {res.vD.map((v, i) => <ResultRow key={i} label={`Essai ${i + 1}`} val={`${v.toFixed(2)} m/s`} ok={v >= 0.5} />)}
          <ResultRow label="Moyenne DÉBUT" val={`${res.moyVD.toFixed(2)} m/s`} />
          <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Vitesses FIN</p>
          {res.vFn.map((v, i) => <ResultRow key={i} label={`Essai ${i + 1}`} val={`${v.toFixed(2)} m/s`} ok={v >= 0.5} />)}
          <ResultRow label="Moyenne FIN" val={`${res.moyVFn.toFixed(2)} m/s`} />
        </ResultBox>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Pesée
// ─────────────────────────────────────────────────────────────────────────────

function TabPesee({ fields, set }: { fields: Record<string, string>; set: (k: string, v: string) => void }) {
  const f = (k: string) => fields[k] ?? ''
  const res = calcPesee(f('volRejet'), f('asserv'), f('nbReal'), f('volUnit'), f('pVide'), f('pPlein'))
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <NormInfo text="Norme FD T90-523-2 § 6.3.3 — Écart nb prélèvements ≤ 5 %, écart volume ≤ 10 %" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><FieldLabel>Volume rejet 24h (m³)</FieldLabel><NumInput value={f('volRejet')} onChange={v => set('volRejet', v)} unit="m³" placeholder="Ex: 1200" /></div>
          <div><FieldLabel>Asservissement (m³)</FieldLabel><NumInput value={f('asserv')} onChange={v => set('asserv', v)} unit="m³" placeholder="Ex: 12" /></div>
          <div><FieldLabel>Nb prélèvements réalisés</FieldLabel><NumInput value={f('nbReal')} onChange={v => set('nbReal', v)} placeholder="Ex: 96" /></div>
          <div><FieldLabel>Volume unitaire moyen (mL)</FieldLabel><NumInput value={f('volUnit')} onChange={v => set('volUnit', v)} unit="mL" placeholder="Ex: 70" /></div>
          <div><FieldLabel>Poids flacon vide (kg)</FieldLabel><NumInput value={f('pVide')} onChange={v => set('pVide', v)} unit="kg" placeholder="Ex: 1.235" /></div>
          <div><FieldLabel>Poids flacon plein (kg)</FieldLabel><NumInput value={f('pPlein')} onChange={v => set('pPlein', v)} unit="kg" placeholder="Ex: 8.235" /></div>
        </div>
      </Card>
      {res && (
        <div className="flex flex-col gap-3">
          <ResultBox ok={res.confNb}>
            <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>1. Nombre de prélèvements</p>
            <ResultRow label="Attendus" val={res.nbAtt.toFixed(0)} />
            <ResultRow label="Réalisés" val={res.nbReal.toFixed(0)} />
            <ResultRow label="Écart (≤ 5 %)" val={`${res.ecartNbPct >= 0 ? '+' : ''}${res.ecartNbPct.toFixed(1)} %`} ok={res.confNb} />
          </ResultBox>
          <ResultBox ok={res.confVol}>
            <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>2. Volume collecté (pesée)</p>
            <ResultRow label="Volume théorique" val={`${res.volTheo.toFixed(2)} L`} />
            <ResultRow label="Volume réel (pesée)" val={`${res.volReel.toFixed(2)} L`} />
            <ResultRow label="Écart (≤ 10 %)" val={`${res.ecartVolPct >= 0 ? '+' : ''}${res.ecartVolPct.toFixed(1)} %`} ok={res.confVol} />
          </ResultBox>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Température
// ─────────────────────────────────────────────────────────────────────────────

function TabTemperature({ fields, set }: { fields: Record<string, string>; set: (k: string, v: string) => void }) {
  const f = (k: string) => fields[k] ?? ''
  const res = calcTemp(f('tD'), f('tFn'), f('tMn'), f('tMx'))
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <NormInfo text="ISO 5667-3 / ISO 5667-10 — Critère : 2 °C ≤ T ≤ 8 °C (5 °C ± 3 °C)" />
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Temp. début (°C)</FieldLabel><NumInput value={f('tD')} onChange={v => set('tD', v)} unit="°C" placeholder="Ex: 4.0" /></div>
          <div><FieldLabel>Temp. fin (°C)</FieldLabel><NumInput value={f('tFn')} onChange={v => set('tFn', v)} unit="°C" placeholder="Ex: 6.5" /></div>
          <div><FieldLabel>Temp. minimale (°C)</FieldLabel><NumInput value={f('tMn')} onChange={v => set('tMn', v)} unit="°C" placeholder="Ex: 2.0" /></div>
          <div><FieldLabel>Temp. maximale (°C)</FieldLabel><NumInput value={f('tMx')} onChange={v => set('tMx', v)} unit="°C" placeholder="Ex: 8.0" /></div>
        </div>
      </Card>
      {res && (
        <ResultBox ok={res.conforme}>
          <ResultRow label="Temp. début" val={`${res.tD.toFixed(1)} °C`} ok={res.tD >= 2 && res.tD <= 8} />
          <ResultRow label="Temp. fin" val={`${res.tFn.toFixed(1)} °C`} ok={res.tFn >= 2 && res.tFn <= 8} />
          <ResultRow label="Temp. min. (≥ 2 °C)" val={`${res.tMn.toFixed(1)} °C`} ok={res.tMn >= 2} />
          <ResultRow label="Temp. max. (≤ 8 °C)" val={`${res.tMx.toFixed(1)} °C`} ok={res.tMx <= 8} />
        </ResultBox>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Synthèse
// ─────────────────────────────────────────────────────────────────────────────

function TabSynthese({
  fields, volRes, vitRes, pesRes, tmpRes
}: {
  fields: Record<string, string>
  volRes: VolumeResult | null
  vitRes: VitesseResult | null
  pesRes: PeseeResult | null
  tmpRes: TempResult | null
}) {
  const f = (k: string) => fields[k] ?? '—'
  const allDone = volRes && vitRes && pesRes && tmpRes
  const allConf = allDone && volRes.conforme && vitRes.conforme && pesRes.conforme && tmpRes.conforme

  const items = [
    { label: 'Volume Unitaire', sub: 'FD T90-523-2 § 6.3.1', conf: volRes?.conforme ?? null },
    { label: 'Vitesse Aspiration', sub: 'FD T90-523-2 § 6.3.2', conf: vitRes?.conforme ?? null },
    { label: 'Pesée Volume Global', sub: 'FD T90-523-2 § 6.3.3', conf: pesRes?.conforme ?? null },
    { label: 'Température', sub: 'ISO 5667-3/10', conf: tmpRes?.conforme ?? null },
  ]

  function generatePDF() {
    const win = window.open('', '_blank')
    if (!win) return
    const now = new Date()
    const d = now.toLocaleDateString('fr-FR')
    const h = now.toLocaleTimeString('fr-FR')
    const ok = 'color:#065f46;font-weight:bold'
    const ko = 'color:#991b1b;font-weight:bold'
    const vc = volRes?.conforme, vitc = vitRes?.conforme
    const pc = pesRes?.conforme, tc = tmpRes?.conforme
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport COFRAC</title>
      <style>body{font-family:Arial,sans-serif;margin:2cm;color:#0f172a;}
      h1{color:#0c6b6b;border-bottom:3px solid #0c6b6b;padding-bottom:8px;}
      h2{color:#0c6b6b;margin-top:24px;}
      table{width:100%;border-collapse:collapse;margin:10px 0;}
      td,th{border:1px solid #c5e0e0;padding:8px 10px;}th{background:#eef9f9;text-align:left;}
      @media print{button{display:none;}}</style></head><body>`)
    win.document.write(`<h1>📋 RAPPORT DE CONFORMITÉ COFRAC</h1>`)
    win.document.write(`<p><strong>Prélèvement Automatique 24h – Asservissement au Débit</strong></p>`)
    win.document.write(`<p>Généré le : ${d} à ${h}</p>`)
    win.document.write(`<table>
      <tr><td style="width:180px"><strong>Client</strong></td><td>${f('client')}</td></tr>
      <tr><td><strong>Site</strong></td><td>${f('site')}</td></tr>
      <tr><td><strong>Convention</strong></td><td>${f('convention')}</td></tr>
      <tr><td><strong>Opérateur</strong></td><td>${f('operateur')}</td></tr>
      <tr><td><strong>Date vérif.</strong></td><td>${f('dateVerif')}</td></tr>
      <tr><td><strong>Préleveur</strong></td><td>${f('preleveur')}${f('seriePrel') !== '—' ? ` (SN: ${f('seriePrel')})` : ''}</td></tr>
    </table>`)
    win.document.write(`<h2>Synthèse</h2><table>
      <tr><th>Vérification</th><th>Norme</th><th>Résultat</th></tr>
      <tr><td>Volume Unitaire</td><td>FD T90-523-2 § 6.3.1</td><td style="${vc ? ok : ko}">${vc ? '✅ CONFORME' : vc === false ? '❌ NON CONFORME' : '⏳'}</td></tr>
      <tr><td>Vitesse Aspiration</td><td>FD T90-523-2 § 6.3.2</td><td style="${vitc ? ok : ko}">${vitc ? '✅ CONFORME' : vitc === false ? '❌ NON CONFORME' : '⏳'}</td></tr>
      <tr><td>Pesée Volume Global</td><td>FD T90-523-2 § 6.3.3</td><td style="${pc ? ok : ko}">${pc ? '✅ CONFORME' : pc === false ? '❌ NON CONFORME' : '⏳'}</td></tr>
      <tr><td>Température</td><td>ISO 5667-3/10</td><td style="${tc ? ok : ko}">${tc ? '✅ CONFORME' : tc === false ? '❌ NON CONFORME' : '⏳'}</td></tr>
      <tr><th colspan="2">Résultat global</th><th style="${allConf ? ok : ko}">${allConf ? '✅ APPAREIL CONFORME' : '❌ NON CONFORME'}</th></tr>
    </table>`)
    if (volRes) {
      win.document.write(`<h2>Détail Volume</h2><table>
        <tr><th>Paramètre</th><th>Valeur</th><th>Statut</th></tr>
        <tr><td>Moy. DÉBUT</td><td>${volRes.moyD.toFixed(1)} mL</td><td>—</td></tr>
        <tr><td>Moy. FIN</td><td>${volRes.moyFn.toFixed(1)} mL</td><td>—</td></tr>
        <tr><td>Moy. GLOBALE</td><td>${volRes.moyG.toFixed(1)} mL</td><td>—</td></tr>
        <tr><td>Fidélité DÉBUT</td><td>${volRes.fidD.toFixed(2)} %</td><td style="${volRes.fidOK ? ok : ko}">${volRes.fidOK ? '✅' : '❌'} (crit. ≤ 5 %)</td></tr>
        <tr><td>Fidélité FIN</td><td>${volRes.fidFn.toFixed(2)} %</td><td style="${volRes.fidOK ? ok : ko}">${volRes.fidOK ? '✅' : '❌'}</td></tr>
        <tr><td>Justesse</td><td>${volRes.justesse.toFixed(2)} %</td><td style="${volRes.justOK ? ok : ko}">${volRes.justOK ? '✅' : '❌'} (crit. ≤ 10 %)</td></tr>
      </table>`)
    }
    if (pesRes) {
      win.document.write(`<h2>Détail Pesée</h2><table>
        <tr><th>Paramètre</th><th>Valeur</th><th>Statut</th></tr>
        <tr><td>Nb attendus</td><td>${pesRes.nbAtt.toFixed(0)}</td><td>—</td></tr>
        <tr><td>Nb réalisés</td><td>${pesRes.nbReal.toFixed(0)}</td><td>—</td></tr>
        <tr><td>Écart nb</td><td>${pesRes.ecartNbPct >= 0 ? '+' : ''}${pesRes.ecartNbPct.toFixed(1)} %</td><td style="${pesRes.confNb ? ok : ko}">${pesRes.confNb ? '✅' : '❌'} (crit. ≤ 5 %)</td></tr>
        <tr><td>Vol. théorique</td><td>${pesRes.volTheo.toFixed(2)} L</td><td>—</td></tr>
        <tr><td>Vol. réel</td><td>${pesRes.volReel.toFixed(2)} L</td><td>—</td></tr>
        <tr><td>Écart vol.</td><td>${pesRes.ecartVolPct >= 0 ? '+' : ''}${pesRes.ecartVolPct.toFixed(1)} %</td><td style="${pesRes.confVol ? ok : ko}">${pesRes.confVol ? '✅' : '❌'} (crit. ≤ 10 %)</td></tr>
      </table>`)
    }
    if (tmpRes) {
      win.document.write(`<h2>Détail Température</h2><table>
        <tr><th>Paramètre</th><th>Valeur</th><th>Statut</th></tr>
        <tr><td>Début</td><td>${tmpRes.tD.toFixed(1)} °C</td><td style="${tmpRes.tD >= 2 && tmpRes.tD <= 8 ? ok : ko}">${tmpRes.tD >= 2 && tmpRes.tD <= 8 ? '✅' : '❌'}</td></tr>
        <tr><td>Fin</td><td>${tmpRes.tFn.toFixed(1)} °C</td><td style="${tmpRes.tFn >= 2 && tmpRes.tFn <= 8 ? ok : ko}">${tmpRes.tFn >= 2 && tmpRes.tFn <= 8 ? '✅' : '❌'}</td></tr>
        <tr><td>Min. (≥ 2 °C)</td><td>${tmpRes.tMn.toFixed(1)} °C</td><td style="${tmpRes.tMn >= 2 ? ok : ko}">${tmpRes.tMn >= 2 ? '✅' : '❌'}</td></tr>
        <tr><td>Max. (≤ 8 °C)</td><td>${tmpRes.tMx.toFixed(1)} °C</td><td style="${tmpRes.tMx <= 8 ? ok : ko}">${tmpRes.tMx <= 8 ? '✅' : '❌'}</td></tr>
      </table>`)
    }
    win.document.write(`<p style="margin-top:32px"><strong>Signature opérateur :</strong> ___________________________</p>
      <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#0c6b6b;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimer / Sauvegarder PDF</button>
      </body></html>`)
    win.document.close()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Résultat global */}
      <div className="rounded-[var(--radius-md)] p-6 text-center"
        style={{
          background: !allDone ? 'var(--color-bg-secondary)'
            : allConf ? 'var(--color-success-light)' : 'var(--color-danger-light)',
          border: `1px solid ${!allDone ? 'var(--color-border-subtle)'
            : allConf ? 'var(--color-success)' : 'var(--color-danger)'}`,
          boxShadow: 'var(--shadow-card)',
        }}>
        <div className="text-4xl mb-2">{!allDone ? '⏳' : allConf ? '✅' : '❌'}</div>
        <div className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {!allDone ? 'En attente des vérifications' : allConf ? 'Appareil CONFORME' : 'Appareil NON CONFORME'}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          FD T90-523-2 · ISO 5667-3 · ISO 5667-10
        </div>
      </div>

      {/* Grille statuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.label} className="rounded-[var(--radius-md)] p-4 flex items-center justify-between"
            style={{
              background: 'var(--color-bg-secondary)',
              border: `1px solid ${item.conf === null ? 'var(--color-border-subtle)' : item.conf ? 'var(--color-success)' : 'var(--color-danger)'}`,
              boxShadow: 'var(--shadow-card)',
            }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.label}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{item.sub}</p>
            </div>
            <StatusBadge conforme={item.conf} />
          </div>
        ))}
      </div>

      {/* Bouton PDF */}
      <button onClick={generatePDF}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-[var(--radius-md)] font-semibold text-sm"
        style={{ background: 'var(--color-accent)', color: '#fff' }}>
        <FileText size={16} strokeWidth={1.8} />
        Générer le rapport PDF
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'identification', label: 'Identification' },
  { id: 'volume',         label: '💧 Volume' },
  { id: 'vitesse',        label: '💨 Vitesse' },
  { id: 'pesee',          label: '⚖️ Pesée' },
  { id: 'temperature',    label: '🌡️ Temp.' },
  { id: 'synthese',       label: '📊 Synthèse' },
]

export default function BilanPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('identification')

  // Identification fields
  const [ident, setIdent] = useState<Record<string, string>>({})
  const setIdentField = (k: string, v: string) => setIdent(p => ({ ...p, [k]: v }))

  // Volume
  const [vTheo, setVTheo] = useState('')
  const [vD, setVDArr] = useState<[string, string, string]>(['', '', ''])
  const [vF, setVFArr] = useState<[string, string, string]>(['', '', ''])
  const setVD = (i: number, v: string) => setVDArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })
  const setVF = (i: number, v: string) => setVFArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })

  // Vitesse
  const [distD, setDistD] = useState('')
  const [distF, setDistF] = useState('')
  const [tD, setTDArr] = useState<[string, string, string]>(['', '', ''])
  const [tF, setTFArr] = useState<[string, string, string]>(['', '', ''])
  const setTD = (i: number, v: string) => setTDArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })
  const setTF = (i: number, v: string) => setTFArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })

  // Pesée & Temp
  const [pesee, setPesee] = useState<Record<string, string>>({})
  const setPeseeField = (k: string, v: string) => setPesee(p => ({ ...p, [k]: v }))
  const [temp, setTemp] = useState<Record<string, string>>({})
  const setTempField = (k: string, v: string) => setTemp(p => ({ ...p, [k]: v }))

  // Résultats calculés
  const volRes = calcVolume(vTheo, vD, vF)
  const vitRes = calcVitesse(distD, distF, tD, tF)
  const pesRes = calcPesee(pesee['volRejet'] ?? '', pesee['asserv'] ?? '', pesee['nbReal'] ?? '', pesee['volUnit'] ?? '', pesee['pVide'] ?? '', pesee['pPlein'] ?? '')
  const tmpRes = calcTemp(temp['tD'] ?? '', temp['tFn'] ?? '', temp['tMn'] ?? '', temp['tMx'] ?? '')

  // Statut par onglet pour le dot de conformité
  const tabConf: Partial<Record<TabId, boolean | null>> = {
    volume:      volRes?.conforme ?? null,
    vitesse:     vitRes?.conforme ?? null,
    pesee:       pesRes?.conforme ?? null,
    temperature: tmpRes?.conforme ?? null,
    synthese:    volRes && vitRes && pesRes && tmpRes
                   ? (volRes.conforme && vitRes.conforme && pesRes.conforme && tmpRes.conforme)
                   : null,
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--color-bg-primary)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div>
          <h1 className="text-base font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
            Vérification bilan 24h
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Conformité COFRAC · FD T90-523-2 · ISO 5667
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 pt-4 pb-2 overflow-x-auto">
        {TABS.map(t => {
          const conf = tabConf[t.id]
          const dot = conf === true ? ' ✓' : conf === false ? ' ✗' : ''
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: active ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: active ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                boxShadow: active ? '0 2px 6px rgba(0,113,227,0.25)' : 'var(--shadow-card)',
              }}>
              {t.label}{dot}
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      <div className="px-4 pb-8 pt-2">
        {tab === 'identification' && <TabIdentification fields={ident} set={setIdentField} />}
        {tab === 'volume'         && <TabVolume vTheo={vTheo} setVTheo={setVTheo} vD={vD} setVD={setVD} vF={vF} setVF={setVF} />}
        {tab === 'vitesse'        && <TabVitesse distD={distD} setDistD={setDistD} distF={distF} setDistF={setDistF} tD={tD} setTD={setTD} tF={tF} setTF={setTF} />}
        {tab === 'pesee'          && <TabPesee fields={pesee} set={setPeseeField} />}
        {tab === 'temperature'    && <TabTemperature fields={temp} set={setTempField} />}
        {tab === 'synthese'       && <TabSynthese fields={ident} volRes={volRes} vitRes={vitRes} pesRes={pesRes} tmpRes={tmpRes} />}
      </div>

    </div>
  )
}
