import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, ClipboardList, Wrench, MoreHorizontal } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { isSamplingOverdue } from '@/lib/overdue'
import { COLORS } from '@/lib/constants'

const INACTIVE = '#8E8E93'

function getActiveTab(pathname: string): string {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/planning')) return '/planning'
  if (pathname.startsWith('/missions')) return '/missions'
  if (pathname.startsWith('/materiel')) return '/materiel'
  return '/plus'
}

export default function BottomTabBar() {
  const { pathname } = useLocation()
  const { clients } = useMissionsStore()
  const activeTab = getActiveTab(pathname)

  const overdueCount = useMemo(() => {
    let count = 0
    for (const client of clients)
      for (const plan of client.plans)
        for (const s of plan.samplings)
          if (isSamplingOverdue(s, Number(client.annee) || undefined, plan.methode === 'Automatique')) count++
    return count
  }, [clients])

  const tabs = [
    { to: '/',          key: '/',          label: 'Accueil',  icon: LayoutDashboard },
    { to: '/planning',  key: '/planning',  label: 'Planning', icon: CalendarDays    },
    { to: '/missions',  key: '/missions',  label: 'Missions', icon: ClipboardList,  badge: overdueCount || undefined },
    { to: '/materiel',  key: '/materiel',  label: 'Matériel', icon: Wrench          },
    { to: '/plus',      key: '/plus',      label: 'Plus',     icon: MoreHorizontal  },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        height: 80,
        background: 'rgba(248,248,250,0.82)',
        backdropFilter: 'var(--glass-bar)',
        WebkitBackdropFilter: 'var(--glass-bar)',
        borderTop: '1px solid var(--color-border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {tabs.map(({ to, key, label, icon: Icon, badge }) => {
        const active = activeTab === key
        return (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2"
            style={{ color: active ? COLORS.ACCENT : INACTIVE, textDecoration: 'none' }}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {badge !== undefined && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: COLORS.DANGER, color: 'white' }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
