import { calcVitesse } from '@/lib/bilanCalcs'
import { Card, SectionTitle, FieldLabel, NumInput, ResultBox, ResultRow, NormInfo } from './BilanUI'

export function TabVitesse({ distD, setDistD, distF, setDistF, tD, setTD, tF, setTF }: {
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
            <div key={n} className="mb-3">
              <FieldLabel>Temps essai {n} (s)</FieldLabel>
              <NumInput value={tD[i]} onChange={v => setTD(i, v)} unit="s" placeholder="0.0" />
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Mesures FIN</SectionTitle>
          <div className="mb-3"><FieldLabel>Distance tube (m)</FieldLabel><NumInput value={distF} onChange={setDistF} unit="m" placeholder="Ex: 1.5" /></div>
          {([1, 2, 3] as const).map((n, i) => (
            <div key={n} className="mb-3">
              <FieldLabel>Temps essai {n} (s)</FieldLabel>
              <NumInput value={tF[i]} onChange={v => setTF(i, v)} unit="s" placeholder="0.0" />
            </div>
          ))}
        </Card>
      </div>
      {res && (
        <ResultBox ok={res.conforme}>
          <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Vitesses DÉBUT</p>
          {res.vD.map((v, i) => <ResultRow key={i + 1} label={`Essai ${i + 1}`} val={`${v.toFixed(2)} m/s`} ok={v >= 0.5} />)}
          <ResultRow label="Moyenne DÉBUT" val={`${res.moyVD.toFixed(2)} m/s`} />
          <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Vitesses FIN</p>
          {res.vFn.map((v, i) => <ResultRow key={`fin-${i + 1}`} label={`Essai ${i + 1}`} val={`${v.toFixed(2)} m/s`} ok={v >= 0.5} />)}
          <ResultRow label="Moyenne FIN" val={`${res.moyVFn.toFixed(2)} m/s`} />
        </ResultBox>
      )}
    </div>
  )
}
