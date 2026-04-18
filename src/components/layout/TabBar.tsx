import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, Wrench, User } from 'lucide-react'

const navItems: { to: string; icon: React.ElementType; label: string; end?: boolean }[] = [
  { to: '/',           icon: LayoutDashboard, label: 'Accueil',   end: true },
  { to: '/missions',   icon: ClipboardList,   label: 'Missions'             },
  { to: '/planning',   icon: CalendarDays,    label: 'Planning'             },
  { to: '/materiel',   icon: Wrench,          label: 'Matériel'             },
  { to: '/compte',     icon: User,            label: 'Compte'               },
]

export default function TabBar() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--color-border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-medium transition-colors"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <Icon size={22} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
