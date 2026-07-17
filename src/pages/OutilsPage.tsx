import { NavLink } from 'react-router-dom'
import { FlaskConical, CloudRain, BookOpen, HelpCircle, ChevronRight } from 'lucide-react'
import { COLORS } from '@/lib/constants'

const ITEMS = [
  { to: '/outils/asservissement',    icon: FlaskConical, label: 'Asservissement' },
  { to: '/outils/estimation-volume', icon: CloudRain,    label: 'Estimation volume' },
  { to: '/infos',                    icon: BookOpen,     label: 'Infos terrain' },
  { to: '/aide',                     icon: HelpCircle,   label: "Mode d'emploi" },
]

export default function OutilsPage() {
  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6" style={{ color: COLORS.TEXT_PRIMARY }}>
        Outils
      </h1>

      <div className="rounded-xl overflow-hidden"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        {ITEMS.map(({ to, icon: Icon, label }, idx) => (
          <NavLink
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors"
            style={({ isActive }) => ({
              background: isActive ? 'var(--color-accent-light)' : 'transparent',
              borderTop: idx > 0 ? '1px solid var(--color-border-subtle)' : undefined,
              textDecoration: 'none',
            })}
          >
            <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: COLORS.BG_TERTIARY }}>
              <Icon size={18} strokeWidth={1.8} style={{ color: COLORS.TEXT_SECONDARY }} />
            </div>
            <span className="flex-1 text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
              {label}
            </span>
            <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }} />
          </NavLink>
        ))}
      </div>
    </div>
  )
}
