// ── Types ─────────────────────────────────────────────────────

export interface VolumeResult {
  conforme: boolean
  moyD: number; moyFn: number; moyG: number
  fidD: number; fidFn: number; fidOK: boolean
  justesse: number; justOK: boolean; volOK: boolean
}

export interface VitesseResult {
  conforme: boolean
  vD: number[]; vFn: number[]
  moyVD: number; moyVFn: number
}

export interface PeseeResult {
  conforme: boolean
  confNb: boolean; confVol: boolean
  nbAtt: number; nbReal: number; ecartNbPct: number
  volTheo: number; volReel: number; ecartVolPct: number
}

export interface TempResult {
  conforme: boolean
  tD: number; tFn: number; tMn: number; tMx: number
}

export interface AnalyseRow {
  id: string
  parametre: string
  unite: string
  resultat: string
  seuil: string
  typeComp: 'max' | 'min'
}

export type TabId = 'identification' | 'volume' | 'vitesse' | 'pesee' | 'temperature' | 'analyses' | 'synthese'

// ── Fonctions de calcul ───────────────────────────────────────

export function calcVolume(
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

export function calcVitesse(
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
  return { conforme: [...vD, ...vFn].every(v => v >= 0.5), vD, vFn, moyVD, moyVFn }
}

export function calcPesee(
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

export function calcTemp(tD: string, tFn: string, tMn: string, tMx: string): TempResult | null {
  const vals = [tD, tFn, tMn, tMx].map(parseFloat)
  if (vals.some(isNaN)) return null
  const [d, f, mn, mx] = vals
  return { conforme: mn >= 2 && mx <= 8 && d >= 2 && d <= 8 && f >= 2 && f <= 8, tD: d, tFn: f, tMn: mn, tMx: mx }
}

export function analyseConforme(row: AnalyseRow): boolean | null {
  const r = parseFloat(row.resultat)
  const s = parseFloat(row.seuil)
  if (isNaN(r) || isNaN(s)) return null
  return row.typeComp === 'max' ? r <= s : r >= s
}
