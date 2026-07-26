import { m } from 'framer-motion'

interface Segment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: Segment[]
  total: number
  size?: number
  strokeWidth?: number
}

const GAP_DEG = 3

export default function DonutChart({ segments, total, size = 96, strokeWidth = 11 }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gapLength = (GAP_DEG / 360) * circumference
  const center = size / 2
  const visibleCount = segments.filter((s) => s.value > 0).length

  const arcs = segments
    .filter((s) => s.value > 0)
    .reduce<Array<Segment & { dash: number; gap: number; offset: number }>>((acc, s) => {
      const pct = total > 0 ? s.value / total : 0
      const rawDash = pct * circumference
      const dash = visibleCount > 1 ? Math.max(rawDash - gapLength, 0) : rawDash
      const gap = circumference - dash
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash + (visibleCount > 1 ? gapLength : 0) : 0
      acc.push({ ...s, dash, gap, offset })
      return acc
    }, [])

  return (
    <div className="flex items-center gap-4">
      {/* Donut SVG */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {arcs.map((arc, i) => (
            <m.circle
              key={arc.label}
              cx={center} cy={center} r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDashoffset={-arc.offset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${arc.dash} ${arc.gap}` }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
            />
          ))}
        </svg>
        {/* Texte centré */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[var(--color-text-primary)]" style={{ letterSpacing: '-0.5px' }}>
            {total}
          </span>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">équip.</span>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs whitespace-nowrap text-[var(--color-text-secondary)]">{s.label}</span>
            <span className="text-xs font-semibold ml-auto text-[var(--color-text-primary)]">
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
