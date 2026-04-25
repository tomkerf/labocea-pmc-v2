import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, Wrench, Gauge, Hammer, Inbox, BookOpen, ShieldAlert } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectAppUser, selectRole } from '@/stores/authStore'
import { isSamplingOverdue } from '@/lib/overdue'
import UserAvatar from '@/components/ui/UserAvatar'

const navItems: { to: string; icon?: React.ElementType; label: string; end?: boolean; badge?: boolean; isAccount?: boolean }[] = [
  { to: '/',             icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/demandes',     icon: Inbox,           label: 'Demandes'               },
  { to: '/missions',     icon: ClipboardList,   label: 'Missions',        badge: true },
  { to: '/planning',     icon: CalendarDays,    label: 'Planning'               },
  { to: '/materiel',     icon: Wrench,          label: 'Matériel'               },
  { to: '/metrologie',   icon: Gauge,           label: 'Métrologie'             },
  { to: '/maintenances', icon: Hammer,          label: 'Maintenances'           },
  { to: '/infos',        icon: BookOpen,        label: 'Infos terrain'          },
  { to: '/compte',                              label: 'Mon compte', isAccount: true },
]

export default function Sidebar() {
  const { clients } = useMissionsStore()
  const appUser = useAuthStore(selectAppUser)
  const role    = useAuthStore(selectRole)

  const overdueCount = useMemo(() => {
    let count = 0
    for (const client of clients)
      for (const plan of client.plans)
        for (const s of plan.samplings)
          if (isSamplingOverdue(s, Number(client.annee) || undefined)) count++
    return count
  }, [clients])

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0 h-screen sticky top-0"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* Logo + titre app */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <img src="/logo.png" alt="Labocea" className="w-8 h-8 object-contain shrink-0" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Labocea PMC
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            V2
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {[...navItems, ...(role === 'admin' ? [{ to: '/admin', icon: ShieldAlert, label: 'Admin', end: false, badge: false, isAccount: false }] : [])].map(({ to, icon: Icon, label, end, badge, isAccount }) => (
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
            {isAccount ? (
              <UserAvatar
                initiales={appUser?.initiales}
                color={appUser?.avatarColor}
                emoji={appUser?.avatarEmoji}
                size={20}
                fontSize={8}
              />
            ) : Icon ? (
              <Icon size={17} strokeWidth={1.8} />
            ) : null}
            <span className="flex-1">{label}</span>
            {badge && overdueCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-danger)', color: 'white', minWidth: 18, textAlign: 'center' }}>
                {overdueCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
