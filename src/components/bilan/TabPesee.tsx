import { calcPesee } from '@/lib/bilanCalcs'
import { Card, FieldLabel, NumInput, ResultBox, ResultRow, NormInfo } from './BilanUI'
import { COLORS } from '@/lib/constants'


export function TabPesee({ fields, set }: { fields: Record<string, string>; set: (k: string, v: string) => void }) {
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
            <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: COLORS.TEXT_SECONDARY }}>1. Nombre de prélèvements</p>
            <ResultRow label="Attendus" val={res.nbAtt.toFixed(0)} />
            <ResultRow label="Réalisés" val={res.nbReal.toFixed(0)} />
            <ResultRow label="Écart (≤ 5 %)" val={`${res.ecartNbPct >= 0 ? '+' : ''}${res.ecartNbPct.toFixed(1)} %`} ok={res.confNb} />
          </ResultBox>
          <ResultBox ok={res.confVol}>
            <p className="px-4 pt-2.5 text-xs font-semibold" style={{ color: COLORS.TEXT_SECONDARY }}>2. Volume collecté (pesée)</p>
            <ResultRow label="Volume théorique" val={`${res.volTheo.toFixed(2)} L`} />
            <ResultRow label="Volume réel (pesée)" val={`${res.volReel.toFixed(2)} L`} />
            <ResultRow label="Écart (≤ 10 %)" val={`${res.ecartVolPct >= 0 ? '+' : ''}${res.ecartVolPct.toFixed(1)} %`} ok={res.confVol} />
          </ResultBox>
        </div>
      )}
    </div>
  )
}
