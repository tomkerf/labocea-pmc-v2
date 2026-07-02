import { useState } from 'react'
import { X } from 'lucide-react'
import { COLORS, Z_INDEX } from '@/lib/constants'
import { parseBilansCsv, type ParsedBilanRow, type CsvParseError } from '@/lib/parseBilansCsv'
import { importBilans } from '@/services/pointsRejetService'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

interface Props {
  onClose: () => void
}

export function BilanImportModal({ onClose }: Props) {
  const uid = useAuthStore(selectUid)
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)
  const [rows, setRows] = useState<ParsedBilanRow[]>([])
  const [errors, setErrors] = useState<CsvParseError[]>([])
  const [parsed, setParsed] = useState(false)
  const [importing, setImporting] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      const res = parseBilansCsv(text)
      setRows(res.rows)
      setErrors(res.errors)
      setParsed(true)
    })
  }

  async function handleImport() {
    if (!uid || rows.length === 0) return
    setImporting(true)
    try {
      const r = await importBilans(rows, pointsRejet, uid)
      toast.success(`Import terminé : ${r.created} point(s) créé(s), ${r.updated} enrichi(s), ${r.added} bilan(s) ajouté(s).`)
      onClose()
    } catch (err) {
      toast.error(`Échec de l'import : ${(err as Error).message}`)
    } finally {
      setImporting(false)
    }
  }

  const nbPoints = new Set(rows.map((r) => r.point)).size

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', zIndex: Z_INDEX.MODAL }}>
      <div className="w-full max-w-lg rounded-2xl p-5 max-h-[85vh] overflow-auto"
        style={{ background: COLORS.BG_SECONDARY }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Importer des bilans (CSV)</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg" style={{ background: COLORS.BG_TERTIARY }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-[12px] mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          Format : <code>point,date,pluie_mm,volume_m3</code> — date au format AAAA-MM-JJ.
        </p>

        <input type="file" accept=".csv,text/csv" onChange={handleFile} className="mb-4 text-sm" aria-label="Fichier CSV" />

        {parsed && (
          <div className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
            <p className="mb-2">
              {rows.length} bilan(s) valides sur {nbPoints} point(s).
              {errors.length > 0 && <span style={{ color: COLORS.DANGER }}> {errors.length} ligne(s) ignorée(s).</span>}
            </p>

            {errors.length > 0 && (
              <ul className="mb-3 text-[12px]" style={{ color: COLORS.DANGER }}>
                {errors.slice(0, 10).map((e) => <li key={`${e.line}-${e.message}`}>Ligne {e.line} : {e.message}</li>)}
              </ul>
            )}

            <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--color-border-subtle)' }}>
              {rows.slice(0, 8).map((r, i) => (
                <div key={`${r.point}-${r.bilan.date}`} className="flex justify-between px-3 py-1.5 text-[12px]"
                  style={{ borderBottom: i < Math.min(rows.length, 8) - 1 ? '1px solid var(--color-border-subtle)' : undefined }}>
                  <span>{r.point}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{r.bilan.date} · {r.bilan.pluieMm} mm · {r.bilan.volumeM3} m³</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={handleImport} disabled={importing || rows.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: importing || rows.length === 0 ? 0.5 : 1 }}>
              {importing ? 'Import…' : `Importer ${rows.length} bilan(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
