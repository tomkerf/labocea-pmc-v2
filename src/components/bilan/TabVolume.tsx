import { calcVolume } from '@/lib/bilanCalcs'
import { Card, SectionTitle, FieldLabel, NumInput, ResultBox, ResultRow, NormInfo } from './BilanUI'

export function TabVolume({ vTheo, setVTheo, vD, setVD, vF, setVF }: {
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
            <div key={n} className="mb-3">
              <FieldLabel>Essai {n} (mL)</FieldLabel>
              <NumInput value={vD[i]} onChange={v => setVD(i, v)} unit="mL" placeholder="0.0" />
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Mesures FIN de mission</SectionTitle>
          {([1, 2, 3] as const).map((n, i) => (
            <div key={n} className="mb-3">
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
