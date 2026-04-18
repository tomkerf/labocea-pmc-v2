import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, Wrench, Gauge, Hammer, User } from 'lucide-react'

const navItems: { to: string; icon: React.ElementType; label: string; end?: boolean }[] = [
  { to: '/',             icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/missions',     icon: ClipboardList,   label: 'Missions'               },
  { to: '/planning',     icon: CalendarDays,    label: 'Planning'               },
  { to: '/materiel',     icon: Wrench,          label: 'Matériel'               },
  { to: '/metrologie',   icon: Gauge,           label: 'Métrologie'             },
  { to: '/maintenances', icon: Hammer,          label: 'Maintenances'           },
  { to: '/compte',       icon: User,            label: 'Mon compte'             },
]

export default function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0 h-screen sticky top-0"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* Titre app */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Labocea PMC
        </span>
        <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
          V2
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={({ isActive }) => ({
              background: isActive ? 'var(--color-accent-light)' : 'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: isActive ? 500 : 400,
            })}
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
