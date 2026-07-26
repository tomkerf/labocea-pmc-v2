import type { ReactNode } from 'react'

export function EmptyCard({ children, icon }: { children: React.ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] px-5 py-8 flex flex-col items-center gap-2 text-center bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
      {icon && (
        <div className="size-9 rounded-full flex items-center justify-center bg-[var(--color-accent-light)]">
          {icon}
        </div>
      )}
      <p className="text-sm text-[var(--color-text-secondary)]">{children}</p>
    </div>
  )
}
