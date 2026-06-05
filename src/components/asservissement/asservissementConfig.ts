export const REGLE = [
  "Préleveurs automatiques réfrigérés (5±3°C) obligatoires pour bilans 24h",
  "Asservissement au débit recommandé (40% d'incertitude en moins vs temps)",
  "Volume unitaire recommandé : 50-100 mL",
  "Fréquence optimale : 4-6 prélèvements/heure (100-140/jour)",
  "Volume total échantillon : 7-10 litres (homogénéisation facilitée)",
  "Homogénéisation mécanique obligatoire (perceuse, sans vortex)",
  "Délai max échantillon → analyse : 24h (48h weekend avec étude vieillissement)",
  "Conformité : ISO 5667, FD T90-523, Arrêté du 21/07/2015",
]

export const PRESETS_V24H   = [50, 100, 200, 500, 1000]
export const PRESETS_FLACON = [5, 10, 20, 30]

export type WarnType = 'ok' | 'warn' | 'error' | 'info'
export interface Warn   { type: WarnType; txt: string }
export interface Result {
  nbP: string; freq: string; periode: string
  vTot: string; vEP: string; vu: string
  taux: string; warns: Warn[]
}

export function calcResult(v24h: string, vFlacon: string, vUnit: string, mode: string, vEntre: string): Result | null {
  const V24 = parseFloat(v24h), Vfl = parseFloat(vFlacon)
  const Vu  = parseFloat(vUnit), Ve  = parseFloat(vEntre)
  if (isNaN(V24) || isNaN(Vfl) || isNaN(Vu) || V24 <= 0 || Vfl <= 0 || Vu <= 0) return null

  const warns: Warn[] = []
  let nbP: number, freq: number, periode: number, vTot: number, vEP: number

  if (mode === 'manuel') {
    if (isNaN(Ve) || Ve <= 0) return null
    nbP = V24 / Ve; vEP = Ve; freq = nbP / 24; periode = 60 / freq; vTot = (Vu * nbP) / 1000
    if (vTot > Vfl) warns.push({ type: 'error', txt: `Volume total (${vTot.toFixed(1)}L) dépasse la capacité du flacon (${Vfl}L).` })
  } else {
    nbP = (10 * 1000) / Vu
    if (nbP / 24 < 4) nbP = 4 * 24
    if (nbP / 24 > 6) nbP = 6 * 24
    vTot = (Vu * nbP) / 1000
    if (vTot > Vfl) { nbP = (Vfl * 1000) / Vu; vTot = (Vu * nbP) / 1000 }
    freq = nbP / 24; periode = 60 / freq; vEP = V24 / nbP
  }

  if (vTot > Vfl * 0.95 && vTot <= Vfl) warns.push({ type: 'warn', txt: 'Volume total proche de la capacité du flacon.' })
  if (Vu < 50)     warns.push({ type: 'warn', txt: 'Volume unitaire < 50 mL : répétabilité dégradée (ISO 5667-10).' })
  if (Vu > 100)    warns.push({ type: 'warn', txt: 'Volume unitaire > 100 mL : risque de volume total excessif.' })
  if (freq < 4)    warns.push({ type: 'warn', txt: 'Fréquence < 4/h : précision insuffisante.' })
  if (freq > 6)    warns.push({ type: 'info', txt: 'Fréquence > 6/h : vérifiez la capacité du flacon.' })
  if (periode < 3) warns.push({ type: 'warn', txt: "Période < 3 min : risque d'omissions." })
  if (vTot < 7)    warns.push({ type: 'info', txt: `Volume total ${vTot.toFixed(1)}L < 7L : homogénéisation difficile.` })
  if (vTot > 10 && vTot <= Vfl) warns.push({ type: 'info', txt: `Volume total ${vTot.toFixed(1)}L > 10L : privilégiez 7-10L.` })
  if (mode === 'auto') warns.push({ type: 'ok',   txt: 'Paramètres optimisés · Stratégie n°5.' })
  else                 warns.push({ type: 'info', txt: `Programmez ${vEP.toFixed(3)} m³ écoulés entre prélèvements.` })

  return {
    nbP: nbP.toFixed(0), freq: freq.toFixed(1), periode: periode.toFixed(1),
    vTot: vTot.toFixed(1), vEP: vEP.toFixed(3), vu: Vu.toFixed(0),
    taux: ((vTot / Vfl) * 100).toFixed(0), warns,
  }
}
