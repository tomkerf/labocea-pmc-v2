import { FileText } from 'lucide-react'
import { type VolumeResult, type VitesseResult, type PeseeResult, type TempResult, type AnalyseRow, analyseConforme } from '@/lib/bilanCalcs'
import { Card, SectionTitle, StatusBadge, ResultRow } from './BilanUI'

export function TabSynthese({
  fields, volRes, vitRes, pesRes, tmpRes, analyses
}: {
  fields: Record<string, string>
  volRes: VolumeResult | null
  vitRes: VitesseResult | null
  pesRes: PeseeResult | null
  tmpRes: TempResult | null
  analyses: AnalyseRow[]
}) {
  const f = (k: string) => fields[k] ?? '—'
  const allDone = volRes && vitRes && pesRes && tmpRes
  const allConf = allDone && volRes.conforme && vitRes.conforme && pesRes.conforme && tmpRes.conforme

  const analysesWithResult = analyses.filter(r => r.parametre && analyseConforme(r) !== null)
  const analysesConf = analysesWithResult.length > 0
    ? analysesWithResult.every(r => analyseConforme(r) === true)
    : null

  const items = [
    { label: 'Volume Unitaire', sub: 'FD T90-523-2 § 6.3.1', conf: volRes?.conforme ?? null },
    { label: 'Vitesse Aspiration', sub: 'FD T90-523-2 § 6.3.2', conf: vitRes?.conforme ?? null },
    { label: 'Pesée Volume Global', sub: 'FD T90-523-2 § 6.3.3', conf: pesRes?.conforme ?? null },
    { label: 'Température', sub: 'ISO 5667-3/10', conf: tmpRes?.conforme ?? null },
    ...(analysesWithResult.length > 0 ? [{ label: 'Analyses laboratoire', sub: 'Arrêté préfectoral', conf: analysesConf }] : []),
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
    if (analysesWithResult.length > 0) {
      const okA = 'color:#065f46;font-weight:bold'
      const koA = 'color:#991b1b;font-weight:bold'
      win.document.write(`<h2>Résultats d'analyses</h2><table>
        <tr><th>Paramètre</th><th>Résultat</th><th>Seuil</th><th>Statut</th></tr>`)
      analysesWithResult.forEach(row => {
        const conf = analyseConforme(row)
        const op = row.typeComp === 'max' ? '≤' : '≥'
        win.document.write(`<tr>
          <td>${row.parametre}</td>
          <td>${row.resultat} ${row.unite}</td>
          <td>${op} ${row.seuil} ${row.unite}</td>
          <td style="${conf ? okA : koA}">${conf ? '✅ CONFORME' : '❌ NON CONFORME'}</td>
        </tr>`)
      })
      win.document.write(`</table>`)
      if (analysesConf !== null) {
        win.document.write(`<p style="${analysesConf ? okA : koA}"><strong>Conclusion analyses : ${analysesConf ? '✅ CONFORMES' : '❌ NON CONFORMES'} aux seuils de l'arrêté</strong></p>`)
      }
    }
    win.document.write(`<p style="margin-top:32px"><strong>Signature opérateur :</strong> ___________________________</p>
      <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#0c6b6b;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimer / Sauvegarder PDF</button>
      </body></html>`)
    win.document.close()
  }

  return (
    <div className="flex flex-col gap-4">
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

      {analysesWithResult.length > 0 && (
        <Card>
          <SectionTitle>Analyses laboratoire</SectionTitle>
          {analysesWithResult.map(row => {
            const conf = analyseConforme(row)
            const op = row.typeComp === 'max' ? '≤' : '≥'
            return (
              <ResultRow
                key={row.id}
                label={`${row.parametre} (${op} ${row.seuil} ${row.unite})`}
                val={`${row.resultat} ${row.unite}`}
                ok={conf ?? undefined}
              />
            )
          })}
        </Card>
      )}

      <button onClick={generatePDF}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-[var(--radius-md)] font-semibold text-sm"
        style={{ background: 'var(--color-accent)', color: '#fff' }}>
        <FileText size={16} strokeWidth={1.8} />
        Générer le rapport PDF
      </button>
    </div>
  )
}
