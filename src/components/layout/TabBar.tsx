import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, Wrench, Plus } from 'lucide-react'

const navItems: { to: string; icon: React.ElementType; label: string; end?: boolean }[] = [
  { to: '/',         icon: LayoutDashboard, label: 'Accueil',  end: true },
  { to: '/missions', icon: ClipboardList,   label: 'Missions'            },
  { to: '/planning', icon: CalendarDays,    label: 'Planning'            },
  { to: '/materiel', icon: Wrench,          label: 'Matériel'            },
]

export default function TabBar() {
  const navigate = useNavigate()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--color-border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* 2 premiers onglets */}
      {navItems.slice(0, 2).map(({ to, icon: Icon, label, end }) => (
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

      {/* FAB centré */}
      <div className="flex-1 flex flex-col items-center justify-end pb-2">
        <button
          onClick={() => navigate('/missions')}
          className="w-12 h-12 rounded-full flex items-center justify-center -mt-6"
          style={{
            background: 'var(--color-accent)',
            boxShadow: '0 4px 14px rgba(0,113,227,0.4)',
          }}
        >
          <Plus size={24} color="white" strokeWidth={2.5} />
        </button>
      </div>

      {/* 2 derniers onglets */}
      {navItems.slice(2).map(({ to, icon: Icon, label, end }) => (
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
