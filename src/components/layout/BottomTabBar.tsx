import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, ClipboardList, Wrench, LayoutGrid } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'
import { isSamplingOverdue } from '@/lib/overdue'

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
  const { unreadCount: chatUnreadCount } = useChatNotificationStore()
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
    { to: '/plus',      key: '/plus',      label: 'Menu',     icon: LayoutGrid,      badge: chatUnreadCount || undefined },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-20 bg-[rgba(248,248,250,0.92)] backdrop-blur-lg border-t border-[var(--color-border-subtle)] shadow-[0_-1px_0_rgba(0,0,0,0.04),0_-8px_24px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      {tabs.map(({ to, key, label, icon: Icon, badge }) => {
        const active = activeTab === key
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-1 transition-colors ${
              active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            <div
              className={`relative flex items-center justify-center rounded-xl px-4 py-1 transition-all ${
                active ? 'bg-[var(--color-accent-light)]' : 'bg-transparent'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
              {badge !== undefined && badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-[var(--color-danger)] text-white border border-white"
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
