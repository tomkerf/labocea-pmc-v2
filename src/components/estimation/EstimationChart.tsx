import { COLORS } from '@/lib/constants'
import type { BilanRejet } from '@/types'

interface Props {
  bilans: BilanRejet[]
  base: number
  coef: number
  pluieMm: number
  volumeEstime: number
}

const W = 320
const H = 200
const PAD = 36

export function EstimationChart({ bilans, base, coef, pluieMm, volumeEstime }: Props) {
  const pts = bilans.filter(b => Number.isFinite(b.pluieMm) && Number.isFinite(b.volumeM3))
  const xs = [...pts.map(b => b.pluieMm), pluieMm]
  const ys = [...pts.map(b => b.volumeM3), volumeEstime]
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(0, ...ys), yMax = Math.max(...ys)

  const sx = (x: number) =>
    PAD + (xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin)) * (W - 2 * PAD)
  const sy = (y: number) =>
    H - PAD - (yMax === yMin ? 0.5 : (y - yMin) / (yMax - yMin)) * (H - 2 * PAD)

  const lineX1 = xMin, lineX2 = xMax
  const lineY1 = base + coef * lineX1
  const lineY2 = base + coef * lineX2

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Nuage de points pluviométrie / volume">
      {/* axes */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-border)" strokeWidth={1} />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--color-border)" strokeWidth={1} />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-text-tertiary)">pluie (mm)</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize={10} fill="var(--color-text-tertiary)" transform={`rotate(-90 10 ${H / 2})`}>volume (m³)</text>

      {/* droite de régression */}
      <line x1={sx(lineX1)} y1={sy(lineY1)} x2={sx(lineX2)} y2={sy(lineY2)}
        stroke={COLORS.ACCENT} strokeWidth={1.5} strokeDasharray="4 3" />

      {/* bilans historiques */}
      {pts.map((b, i) => (
        <circle key={i} cx={sx(b.pluieMm)} cy={sy(b.volumeM3)} r={3.5}
          fill="var(--color-text-secondary)" />
      ))}

      {/* point estimé */}
      <circle cx={sx(pluieMm)} cy={sy(volumeEstime)} r={5.5} fill={COLORS.ACCENT}
        stroke="white" strokeWidth={1.5} />
    </svg>
  )
}
