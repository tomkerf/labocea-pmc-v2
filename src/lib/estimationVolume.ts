import type { BilanRejet } from '@/types'

export interface EstimationWarning {
  type: 'peu_de_points' | 'correlation_faible' | 'extrapolation' | 'trop_d_aberrants'
}

export interface EstimationResult {
  volumeEstime: number     // m³
  base: number             // ordonnée à l'origine ≈ volume "temps sec" 24h
  coef: number             // m³ par mm de pluie
  r2: number               // qualité d'ajustement du mode actif [0..1]
  r2Brut: number           // qualité d'ajustement sur tous les points (comparaison avant/après)
  fourchetteBasse: number  // borne basse intervalle de prédiction
  fourchetteHaute: number  // borne haute
  nbPoints: number         // nombre de points utilisés pour la droite affichée
  pointsAberrants: BilanRejet[] // points détectés hors 2σ (toujours renseigné)
  nbAberrants: number
  warnings: EstimationWarning[]
}

export interface EstimationOptions {
  exclureAberrants?: boolean
}

const R2_SEUIL = 0.5
const T_FACTEUR = 2 // ≈ 95 %, approximation assumée (pas de table de Student)
const SEUIL_ABERRANT = 2 // un point est aberrant si |résidu| > 2 × σ_résidus
const MIN_POINTS_RESTANTS = 5
const MAX_FRACTION_EXCLUE = 0.2

interface Fit {
  base: number
  coef: number
  r2: number
  sResid: number
}

function valides(bilans: BilanRejet[]): BilanRejet[] {
  return bilans.filter(b => Number.isFinite(b.pluieMm) && Number.isFinite(b.volumeM3))
}

/** Ajustement moindres carrés : volume = base + coef × pluieMm, sur les points fournis. */
function fit(pts: BilanRejet[]): Fit {
  const n = pts.length
  const mx = pts.reduce((s, b) => s + b.pluieMm, 0) / n
  const my = pts.reduce((s, b) => s + b.volumeM3, 0) / n
  let sxx = 0, sxy = 0
  for (const b of pts) {
    sxx += (b.pluieMm - mx) ** 2
    sxy += (b.pluieMm - mx) * (b.volumeM3 - my)
  }
  const coef = sxx === 0 ? 0 : sxy / sxx
  const base = my - coef * mx

  let ssRes = 0, ssTot = 0
  for (const b of pts) {
    const pred = base + coef * b.pluieMm
    ssRes += (b.volumeM3 - pred) ** 2
    ssTot += (b.volumeM3 - my) ** 2
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const sResid = Math.sqrt(ssRes / Math.max(1, n - 2))
  return { base, coef, r2, sResid }
}

/**
 * Détecte les points aberrants (résidu > 2σ) avec garde-fou :
 * on n'exclut jamais plus de 20 % des points ni en dessous de 5 points restants.
 * Si le nombre de candidats dépasse ce plafond, on n'exclut personne (tropAberrants = true).
 */
function detecteAberrants(pts: BilanRejet[], f: Fit): { aberrants: BilanRejet[]; tropAberrants: boolean } {
  if (f.sResid === 0) return { aberrants: [], tropAberrants: false }

  const candidats = pts
    .map(b => ({ b, resid: Math.abs(b.volumeM3 - (f.base + f.coef * b.pluieMm)) }))
    .filter(({ resid }) => resid > SEUIL_ABERRANT * f.sResid)
    .sort((a, z) => z.resid - a.resid)

  if (candidats.length === 0) return { aberrants: [], tropAberrants: false }

  const maxExclus = Math.min(
    Math.floor(pts.length * MAX_FRACTION_EXCLUE),
    pts.length - MIN_POINTS_RESTANTS,
  )
  if (candidats.length > maxExclus) {
    return { aberrants: candidats.map(c => c.b), tropAberrants: true }
  }
  return { aberrants: candidats.map(c => c.b), tropAberrants: false }
}

/** Régression linéaire moindres carrés : volume = base + coef × pluieMm. */
export function estimateVolume(
  bilans: BilanRejet[],
  pluieMm: number,
  options: EstimationOptions = {},
): EstimationResult | null {
  const pts = valides(bilans)
  const n = pts.length
  if (n < 3) return null

  const fitBrut = fit(pts)
  const { aberrants, tropAberrants } = detecteAberrants(pts, fitBrut)

  // On n'exclut que si demandé ET si le garde-fou est respecté.
  const exclure = options.exclureAberrants === true && aberrants.length > 0 && !tropAberrants
  const ptsActifs = exclure ? pts.filter(b => !aberrants.includes(b)) : pts
  const f = exclure ? fit(ptsActifs) : fitBrut

  const volumeEstime = f.base + f.coef * pluieMm
  const marge = T_FACTEUR * f.sResid

  const warnings: EstimationWarning[] = []
  if (f.r2 < R2_SEUIL) warnings.push({ type: 'correlation_faible' })
  if (tropAberrants) warnings.push({ type: 'trop_d_aberrants' })
  const minP = Math.min(...ptsActifs.map(b => b.pluieMm))
  const maxP = Math.max(...ptsActifs.map(b => b.pluieMm))
  if (pluieMm < minP || pluieMm > maxP) warnings.push({ type: 'extrapolation' })

  return {
    volumeEstime,
    base: f.base,
    coef: f.coef,
    r2: f.r2,
    r2Brut: fitBrut.r2,
    fourchetteBasse: Math.max(0, volumeEstime - marge),
    fourchetteHaute: volumeEstime + marge,
    nbPoints: ptsActifs.length,
    pointsAberrants: aberrants,
    nbAberrants: aberrants.length,
    warnings,
  }
}

/** Mode dégradé (< 3 bilans) : les k bilans les plus proches en pluviométrie. */
export function nearestBilans(bilans: BilanRejet[], pluieMm: number, k = 3): BilanRejet[] {
  return [...valides(bilans)]
    .sort((a, b) => Math.abs(a.pluieMm - pluieMm) - Math.abs(b.pluieMm - pluieMm))
    .slice(0, k)
}
