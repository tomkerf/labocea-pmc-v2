export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase mb-3 tracking-[0.06em] text-[var(--color-text-tertiary)]">
      {children}
    </h2>
  )
}
