import type { Tuyau, MateriauTuyau } from '@/types'

export const MATERIAUX: MateriauTuyau[] = ['VINYL (tricoclair)', 'TEFLON', 'SILICONE']

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const MAT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'VINYL (tricoclair)': { bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.25)', text: '#be185d' },
  'TEFLON':            { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  text: '#c2410c' },
  'SILICONE':          { bg: 'rgba(14,165,233,0.08)',  border: 'rgba(14,165,233,0.25)',  text: '#0369a1' },
}

export function matColor(m: string) {
  return MAT_COLORS[m] ?? MAT_COLORS['AUTRE']
}

export function fmtDate(iso: string) {
  if (!iso) return ''
  const [y, mo, d] = iso.split('-')
  return `${d}/${mo}/${y?.slice(2)}`
}

export function printLabel(tuyau: Tuyau) {
  const mc = matColor(tuyau.materiau)
  const ds = fmtDate(tuyau.dateCreation)
  const rows: [string, string][] = [
    tuyau.materiau    ? ['Matériau', tuyau.materiau]    : null,
    tuyau.objet       ? ['Objet',    tuyau.objet]       : null,
    tuyau.materiel    ? ['Matériel', tuyau.materiel]    : null,
    ds                ? ['Créé le',  ds]                : null,
    tuyau.fournisseur ? ['Fourn.',   tuyau.fournisseur] : null,
    tuyau.marque      ? ['Marque',   tuyau.marque]      : null,
    tuyau.numSerie    ? ['N° série', tuyau.numSerie]    : null,
    tuyau.type        ? ['Type',     tuyau.type]        : null,
    tuyau.notes       ? ['Notes',    tuyau.notes]       : null,
  ].filter(Boolean) as [string, string][]

  const rowsHtml = rows.map(([l, v]) =>
    `<tr><td class="lbl">${l}</td><td class="val">${escapeHtml(v)}</td></tr>`,
  ).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Étiquette — ${escapeHtml(tuyau.refLabo)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:85mm 55mm;margin:0}
body{width:85mm;height:55mm;font-family:Arial,sans-serif;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.top{background:${mc.text};padding:5px 8px 4px;display:flex;align-items:center;justify-content:space-between}
.ref{font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1}
.badge{font-size:8px;font-weight:700;color:${mc.text};background:#fff;border-radius:10px;padding:2px 7px;text-transform:uppercase;letter-spacing:.04em}
.body{flex:1;padding:4px 8px;display:flex;flex-direction:column;justify-content:space-between}
table{width:100%;border-collapse:collapse}
td{font-size:8.5px;padding:1.5px 0;vertical-align:top;line-height:1.3}
.lbl{color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.04em;width:44px;padding-right:4px}
.val{color:#111;font-weight:500}
.footer{font-size:7px;color:#bbb;text-align:right;padding:0 8px 3px;letter-spacing:.03em}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="top"><span class="ref">${escapeHtml(tuyau.refLabo)}</span><span class="badge">${escapeHtml(tuyau.annee || '')}</span></div>
<div class="body"><table>${rowsHtml}</table></div>
<div class="footer">Labocea · Tuyaux de prélèvement</div>
<script>window.onload=()=>{window.focus();window.print()}</script>
</body></html>`

  const w = window.open('', '_blank', 'width=340,height=240')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
