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

export default function DonutChart({ segments, total, size = 120, strokeWidth = 14 }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  // Calcule les arcs
  let offset = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct = total > 0 ? s.value / total : 0
      const dash = pct * circumference
      const gap = circumference - dash
      const arc = { ...s, dash, gap, offset }
      offset += dash
      return arc
    })

  return (
    <div className="flex items-center gap-6">
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
            <circle
              key={i}
              cx={center} cy={center} r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        {/* Texte centré */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            {total}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>équip.</span>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-col gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
            <span className="text-sm font-semibold ml-auto pl-4" style={{ color: 'var(--color-text-primary)' }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
