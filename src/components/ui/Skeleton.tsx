import { COLORS } from '@/lib/constants'

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
  rounded?: string
}

function Skeleton({ className = '', height = 'h-4', width = 'w-full', rounded = 'rounded-md' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${height} ${width} ${rounded} ${className}`}
      style={{ background: COLORS.BG_TERTIARY }}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between">
        <Skeleton height="h-4" width="w-1/3" />
        <Skeleton height="h-5" width="w-16" rounded="rounded-full" />
      </div>
      <Skeleton height="h-3" width="w-1/2" />
      <Skeleton height="h-3" width="w-2/3" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <Skeleton height="h-9" width="w-9" rounded="rounded-full" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton height="h-3.5" width="w-1/3" />
        <Skeleton height="h-3" width="w-1/2" />
      </div>
      <Skeleton height="h-5" width="w-20" rounded="rounded-full" />
    </div>
  )
}

export function SkeletonList({ count = 4, variant = 'card' }: { count?: number; variant?: 'card' | 'row' }) {
  return (
    <div className={variant === 'card' ? 'flex flex-col gap-3' : 'rounded-xl overflow-hidden'
      + (variant === 'row' ? ' border' : '')}
      style={variant === 'row' ? { borderColor: 'var(--color-border-subtle)', background: COLORS.BG_SECONDARY } : undefined}>
      {Array.from({ length: count }).map((_, i) => (
        variant === 'card'
          ? <SkeletonCard key={i} />
          : <SkeletonRow key={i} />
      ))}
    </div>
  )
}
