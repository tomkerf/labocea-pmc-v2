import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { type AnalyseRow, type TabId, analyseConforme, calcVolume, calcVitesse, calcPesee, calcTemp } from '@/lib/bilanCalcs'
import { TabIdentification } from '@/components/bilan/TabIdentification'
import { TabVolume } from '@/components/bilan/TabVolume'
import { TabVitesse } from '@/components/bilan/TabVitesse'
import { TabPesee } from '@/components/bilan/TabPesee'
import { TabTemperature } from '@/components/bilan/TabTemperature'
import { TabAnalyses } from '@/components/bilan/TabAnalyses'
import { TabSynthese } from '@/components/bilan/TabSynthese'
import { COLORS } from '@/lib/constants'


const TABS: { id: TabId; label: string }[] = [
  { id: 'identification', label: 'Identification' },
  { id: 'volume',         label: '💧 Volume' },
  { id: 'vitesse',        label: '💨 Vitesse' },
  { id: 'pesee',          label: '⚖️ Pesée' },
  { id: 'temperature',    label: '🌡️ Temp.' },
  { id: 'analyses',       label: '🔬 Analyses' },
  { id: 'synthese',       label: '📊 Synthèse' },
]

export default function BilanPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('identification')

  const [ident, setIdent] = useState<Record<string, string>>({})
  const setIdentField = (k: string, v: string) => setIdent(p => ({ ...p, [k]: v }))

  const [vTheo, setVTheo] = useState('')
  const [vD, setVDArr] = useState<[string, string, string]>(['', '', ''])
  const [vF, setVFArr] = useState<[string, string, string]>(['', '', ''])
  const setVD = (i: number, v: string) => setVDArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })
  const setVF = (i: number, v: string) => setVFArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })

  const [distD, setDistD] = useState('')
  const [distF, setDistF] = useState('')
  const [tD, setTDArr] = useState<[string, string, string]>(['', '', ''])
  const [tF, setTFArr] = useState<[string, string, string]>(['', '', ''])
  const setTD = (i: number, v: string) => setTDArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })
  const setTF = (i: number, v: string) => setTFArr(p => { const a = [...p] as [string,string,string]; a[i] = v; return a })

  const [pesee, setPesee] = useState<Record<string, string>>({})
  const setPeseeField = (k: string, v: string) => setPesee(p => ({ ...p, [k]: v }))
  const [temp, setTemp] = useState<Record<string, string>>({})
  const setTempField = (k: string, v: string) => setTemp(p => ({ ...p, [k]: v }))

  const [analyses, setAnalyses] = useState<AnalyseRow[]>([])

  const volRes = calcVolume(vTheo, vD, vF)
  const vitRes = calcVitesse(distD, distF, tD, tF)
  const pesRes = calcPesee(pesee['volRejet'] ?? '', pesee['asserv'] ?? '', pesee['nbReal'] ?? '', pesee['volUnit'] ?? '', pesee['pVide'] ?? '', pesee['pPlein'] ?? '')
  const tmpRes = calcTemp(temp['tD'] ?? '', temp['tFn'] ?? '', temp['tMn'] ?? '', temp['tMx'] ?? '')

  const analysesWithResult = analyses.filter(r => r.parametre && analyseConforme(r) !== null)
  const analysesConf = analysesWithResult.length > 0
    ? analysesWithResult.every(r => analyseConforme(r) === true)
    : null

  const tabConf: Partial<Record<TabId, boolean | null>> = {
    volume:      volRes?.conforme ?? null,
    vitesse:     vitRes?.conforme ?? null,
    pesee:       pesRes?.conforme ?? null,
    temperature: tmpRes?.conforme ?? null,
    analyses:    analysesConf,
    synthese:    volRes && vitRes && pesRes && tmpRes
                   ? (volRes.conforme && vitRes.conforme && pesRes.conforme && tmpRes.conforme)
                   : null,
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.BG_PRIMARY }}>

      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: COLORS.BG_PRIMARY, backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div>
          <h1 className="text-base font-semibold leading-tight" style={{ color: COLORS.TEXT_PRIMARY }}>
            Vérification bilan 24h
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Conformité COFRAC · FD T90-523-2 · ISO 5667
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pt-4 pb-2 overflow-x-auto">
        {TABS.map(t => {
          const conf = tabConf[t.id]
          const dot = conf === true ? ' ✓' : conf === false ? ' ✗' : ''
          const active = tab === t.id
          return (
            <button type="button" key={t.id} onClick={() => setTab(t.id)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: active ? COLORS.ACCENT : COLORS.BG_SECONDARY,
                color: active ? '#fff' : COLORS.TEXT_SECONDARY,
                border: `1px solid ${active ? COLORS.ACCENT : 'var(--color-border-subtle)'}`,
                boxShadow: active ? '0 2px 6px rgba(0,113,227,0.25)' : 'var(--shadow-card)',
              }}>
              {t.label}{dot}
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-8 pt-2">
        {tab === 'identification' && <TabIdentification fields={ident} set={setIdentField} />}
        {tab === 'volume'         && <TabVolume vTheo={vTheo} setVTheo={setVTheo} vD={vD} setVD={setVD} vF={vF} setVF={setVF} />}
        {tab === 'vitesse'        && <TabVitesse distD={distD} setDistD={setDistD} distF={distF} setDistF={setDistF} tD={tD} setTD={setTD} tF={tF} setTF={setTF} />}
        {tab === 'pesee'          && <TabPesee fields={pesee} set={setPeseeField} />}
        {tab === 'temperature'    && <TabTemperature fields={temp} set={setTempField} />}
        {tab === 'analyses'       && <TabAnalyses rows={analyses} setRows={setAnalyses} />}
        {tab === 'synthese'       && <TabSynthese fields={ident} volRes={volRes} vitRes={vitRes} pesRes={pesRes} tmpRes={tmpRes} analyses={analyses} />}
      </div>

    </div>
  )
}
