import { Plus, Trash2 } from 'lucide-react'
import { type AnalyseRow, analyseConforme } from '@/lib/bilanCalcs'
import { Card, SectionTitle, NormInfo, ResultRow } from './BilanUI'

export function TabAnalyses({ rows, setRows }: {
  rows: AnalyseRow[]
  setRows: (r: AnalyseRow[]) => void
}) {
  function addRow() {
    setRows([...rows, { id: crypto.randomUUID(), parametre: '', unite: 'mg/L', resultat: '', seuil: '', typeComp: 'max' }])
  }
  function removeRow(id: string) {
    setRows(rows.filter(r => r.id !== id))
  }
  function updateRow(id: string, field: keyof AnalyseRow, value: string) {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <NormInfo text="Résultats d'analyses du laboratoire — Seuils définis par l'arrêté préfectoral du site" />
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Saisir les paramètres analysés sur l'échantillon composite 24h. Les seuils sont ceux de l'autorisation de rejet du site.
        </p>

        {rows.length > 0 && (
          <div className="grid gap-2 mb-2 px-1" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 32px' }}>
            {['Paramètre', 'Unité', 'Résultat', 'Seuil', 'Type', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-tertiary)' }}>{h}</span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {rows.map(row => {
            const conf = analyseConforme(row)
            return (
              <div key={row.id} className="grid gap-2 items-center p-2 rounded-lg"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 32px',
                  background: conf === true ? 'var(--color-success-light)' : conf === false ? 'var(--color-danger-light)' : 'var(--color-bg-tertiary)',
                  border: `1px solid ${conf === true ? 'var(--color-success)' : conf === false ? 'var(--color-danger)' : 'var(--color-border)'}`,
                }}>
                <input
                  type="text" value={row.parametre} placeholder="Ex: DCO" aria-label="Paramètre"
                  onChange={e => updateRow(row.id, 'parametre', e.target.value)}
                  className="px-2 py-1.5 rounded text-sm w-full"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
                />
                <input
                  type="text" value={row.unite} placeholder="mg/L" aria-label="Unité"
                  onChange={e => updateRow(row.id, 'unite', e.target.value)}
                  className="px-2 py-1.5 rounded text-sm w-full text-center"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
                />
                <input
                  type="number" inputMode="decimal" value={row.resultat} placeholder="0" aria-label="Résultat"
                  onChange={e => updateRow(row.id, 'resultat', e.target.value)}
                  className="px-2 py-1.5 rounded text-sm w-full text-right font-semibold"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
                />
                <input
                  type="number" inputMode="decimal" value={row.seuil} placeholder="0" aria-label="Seuil"
                  onChange={e => updateRow(row.id, 'seuil', e.target.value)}
                  className="px-2 py-1.5 rounded text-sm w-full text-right"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', outline: 'none' }}
                />
                <select
                  aria-label="Type de comparaison"
                  value={row.typeComp}
                  onChange={e => updateRow(row.id, 'typeComp', e.target.value as 'max' | 'min')}
                  className="px-1 py-1.5 rounded text-xs w-full"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', outline: 'none' }}>
                  <option value="max">≤ seuil</option>
                  <option value="min">≥ seuil</option>
                </select>
                <button type="button" onClick={() => removeRow(row.id)}
                  className="flex items-center justify-center rounded p-1"
                  style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                  <Trash2 size={14} strokeWidth={1.8} />
                </button>
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addRow}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)', border: '1px dashed var(--color-accent)' }}>
          <Plus size={15} strokeWidth={2} />
          Ajouter un paramètre
        </button>
      </Card>

      {rows.length > 0 && rows.some(r => analyseConforme(r) !== null) && (
        <Card>
          <SectionTitle>Résultats</SectionTitle>
          {rows.filter(r => r.parametre).map(row => {
            const conf = analyseConforme(row)
            const op = row.typeComp === 'max' ? '≤' : '≥'
            return (
              <ResultRow
                key={row.id}
                label={`${row.parametre} (${op} ${row.seuil} ${row.unite})`}
                val={row.resultat ? `${row.resultat} ${row.unite}` : '—'}
                ok={conf ?? undefined}
              />
            )
          })}
        </Card>
      )}
    </div>
  )
}
