import React, { useState, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, Wrench, Plus, X, UserPlus, Hammer, Gauge } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { isSamplingOverdue } from '@/lib/overdue'

const navItems: { to: string; icon: React.ElementType; label: string; end?: boolean; badge?: boolean }[] = [
  { to: '/',         icon: LayoutDashboard, label: 'Accueil',  end: true },
  { to: '/missions', icon: ClipboardList,   label: 'Missions', badge: true },
  { to: '/planning', icon: CalendarDays,    label: 'Planning'            },
  { to: '/materiel', icon: Wrench,          label: 'Matériel'            },
]

const actions = [
  { label: 'Nouveau client',       icon: UserPlus, path: '/missions?new=1',      color: 'var(--color-accent)'   },
  { label: 'Nouvelle maintenance', icon: Hammer,   path: '/maintenances?new=1',  color: 'var(--color-warning)'  },
  { label: 'Nouvelle métrologie',  icon: Gauge,    path: '/metrologie?new=1',    color: 'var(--color-success)'  },
]

export default function TabBar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { clients } = useMissionsStore()

  const overdueCount = useMemo(() => {
    let count = 0
    for (const client of clients)
      for (const plan of client.plans)
        for (const s of plan.samplings)
          if (isSamplingOverdue(s, Number(client.annee) || undefined)) count++
    return count
  }, [clients])

  function handleAction(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      {/* Overlay + action sheet */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-4 mb-24 rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase px-5 pt-4 pb-2"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Créer
            </p>
            {actions.map(({ label, icon: Icon, path, color }, i) => (
              <button
                key={path}
                onClick={() => handleAction(path)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left"
                style={{ borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}22` }}>
                  <Icon size={18} style={{ color }} />
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--color-border-subtle)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.slice(0, 2).map(({ to, icon: Icon, label, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-medium transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            })}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={1.8} />
              {badge && overdueCount > 0 && (
                <span className="absolute -top-1 -right-2 text-[9px] font-bold px-1 py-px rounded-full leading-none"
                  style={{ background: 'var(--color-danger)', color: 'white', minWidth: 14, textAlign: 'center' }}>
                  {overdueCount}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}

        {/* FAB centré */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-12 h-12 rounded-full flex items-center justify-center -mt-6 transition-transform"
            style={{
              background: open ? 'var(--color-text-secondary)' : 'var(--color-accent)',
              boxShadow: '0 4px 14px rgba(0,113,227,0.4)',
              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          >
            {open
              ? <X size={22} color="white" strokeWidth={2.5} />
              : <Plus size={24} color="white" strokeWidth={2.5} />
            }
          </button>
        </div>

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
    </>
  )
}
