import { calcTemp } from '@/lib/bilanCalcs'
import { Card, FieldLabel, NumInput, ResultBox, ResultRow, NormInfo } from './BilanUI'

export function TabTemperature({ fields, set }: { fields: Record<string, string>; set: (k: string, v: string) => void }) {
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
