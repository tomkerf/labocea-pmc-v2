interface CircleProgressProps {
  /** Pourcentage restant avant échéance (0-100) */
  percent: number
  size?: number
  strokeWidth?: number
  label?: string
}

function getColor(percent: number): string {
  if (percent >= 60) return 'var(--color-success)'
  if (percent >= 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export default function CircleProgress({ percent, size = 40, strokeWidth = 3, label }: CircleProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(Math.max(percent, 0), 100) / 100) * circumference
  const color = getColor(percent)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        {/* Texte centré — on contre-rotate */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            transform: `rotate(90deg) translate(0, -${size}px)`,
            transformOrigin: `${size / 2}px ${size / 2}px`,
            fontSize: size <= 44 ? '9px' : '11px',
            fontWeight: 600,
            fill: color,
          }}
        >
          {Math.round(percent)}%
        </text>
      </svg>
      {label && (
        <span className="text-[10px] text-center" style={{ color: 'var(--color-text-tertiary)', maxWidth: size + 8 }}>
          {label}
        </span>
      )}
    </div>
  )
}
