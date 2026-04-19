import type { ReactNode } from 'react'

interface CircleProgressProps {
  /** Pourcentage restant avant échéance (0-100) */
  percent: number
  size?: number
  strokeWidth?: number
  label?: string
  /** Icône ou contenu affiché au centre du rond */
  icon?: ReactNode
}

function getColor(percent: number): string {
  if (percent >= 60) return 'var(--color-success)'
  if (percent >= 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export default function CircleProgress({ percent, size = 40, strokeWidth = 3, label, icon }: CircleProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(Math.max(percent, 0), 100) / 100) * circumference
  const color = getColor(percent)

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Anneau SVG */}
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
        </svg>

        {/* Contenu centré — icône ou % */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}>
          {icon ?? (
            <span style={{ fontSize: size <= 44 ? '9px' : '11px', fontWeight: 600, color }}>
              {Math.round(percent)}%
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="text-[10px] text-center" style={{ color: 'var(--color-text-tertiary)', maxWidth: size + 8 }}>
          {label}
        </span>
      )}
    </div>
  )
}
