import type { BilanRejet } from '@/types'

export interface EstimationWarning {
  type: 'peu_de_points' | 'correlation_faible' | 'extrapolation'
}

export interface EstimationResult {
  volumeEstime: number     // m³
  base: number             // ordonnée à l'origine ≈ volume "temps sec" 24h
  coef: number             // m³ par mm de pluie
  r2: number               // qualité d'ajustement [0..1]
  fourchetteBasse: number  // borne basse intervalle de prédiction
  fourchetteHaute: number  // borne haute
  nbPoints: number
  warnings: EstimationWarning[]
}

const R2_SEUIL = 0.5
const T_FACTEUR = 2 // ≈ 95 %, approximation assumée (pas de table de Student)

function valides(bilans: BilanRejet[]): BilanRejet[] {
  return bilans.filter(b => Number.isFinite(b.pluieMm) && Number.isFinite(b.volumeM3))
}

/** Régression linéaire moindres carrés : volume = base + coef × pluieMm. */
export function estimateVolume(bilans: BilanRejet[], pluieMm: number): EstimationResult | null {
  const pts = valides(bilans)
  const n = pts.length
  if (n < 3) return null

  const mx = pts.reduce((s, b) => s + b.pluieMm, 0) / n
  const my = pts.reduce((s, b) => s + b.volumeM3, 0) / n
  let sxx = 0, sxy = 0
  for (const b of pts) {
    sxx += (b.pluieMm - mx) ** 2
    sxy += (b.pluieMm - mx) * (b.volumeM3 - my)
  }
  const coef = sxx === 0 ? 0 : sxy / sxx
  const base = my - coef * mx
  const volumeEstime = base + coef * pluieMm

  let ssRes = 0, ssTot = 0
  for (const b of pts) {
    const pred = base + coef * b.pluieMm
    ssRes += (b.volumeM3 - pred) ** 2
    ssTot += (b.volumeM3 - my) ** 2
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const sResid = Math.sqrt(ssRes / Math.max(1, n - 2))
  const marge = T_FACTEUR * sResid

  const warnings: EstimationWarning[] = []
  if (r2 < R2_SEUIL) warnings.push({ type: 'correlation_faible' })
  const minP = Math.min(...pts.map(b => b.pluieMm))
  const maxP = Math.max(...pts.map(b => b.pluieMm))
  if (pluieMm < minP || pluieMm > maxP) warnings.push({ type: 'extrapolation' })

  return {
    volumeEstime,
    base,
    coef,
    r2,
    fourchetteBasse: Math.max(0, volumeEstime - marge),
    fourchetteHaute: volumeEstime + marge,
    nbPoints: n,
    warnings,
  }
}

/** Mode dégradé (< 3 bilans) : les k bilans les plus proches en pluviométrie. */
export function nearestBilans(bilans: BilanRejet[], pluieMm: number, k = 3): BilanRejet[] {
  return [...valides(bilans)]
    .sort((a, b) => Math.abs(a.pluieMm - pluieMm) - Math.abs(b.pluieMm - pluieMm))
    .slice(0, k)
}
