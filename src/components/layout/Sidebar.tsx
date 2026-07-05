import React, { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, ListTodo, Wrench, Gauge, Hammer, Inbox, BookOpen, ShieldAlert, Pipette, HelpCircle, Bug, FileText, Sparkles, FlaskConical, CloudRain, MessageSquare } from 'lucide-react'
import { m } from 'framer-motion'
import { COLORS } from '@/lib/constants'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectAppUser, selectRole } from '@/stores/authStore'
import { isSamplingOverdue } from '@/lib/overdue'
import UserAvatar from '@/components/ui/UserAvatar'
import BugReportModal from '@/components/ui/BugReportModal'
import SyncBadge from '@/components/ui/SyncBadge'
import { useChangelogState } from '@/components/ui/ChangelogModal'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'


interface NavItem {
  to: string
  icon?: React.ElementType
  label: string
  end?: boolean
  badge?: boolean
  isAccount?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}


export default function Sidebar() {
  const { clients } = useMissionsStore()
  const appUser = useAuthStore(selectAppUser)
  const role    = useAuthStore(selectRole)
  const [bugOpen, setBugOpen] = useState(false)
  const changelog = useChangelogState()
  const { unreadCount: chatUnreadCount, hasMention: chatHasMention } = useChatNotificationStore()

  const overdueCount = useMemo(() => {
    let count = 0
    for (const client of clients)
      for (const plan of client.plans)
        for (const s of plan.samplings)
          if (isSamplingOverdue(s, Number(client.annee) || undefined, plan.methode === 'Automatique')) count++
    return count
  }, [clients])

  const sections = useMemo((): NavSection[] => [
    {
      title: 'Activité & Planning',
      items: [
        { to: '/',             icon: LayoutDashboard, label: 'Tableau de bord', end: true },
        { to: '/planning',     icon: CalendarDays,    label: 'Planning'               },
        { to: '/missions',     icon: ClipboardList,   label: 'Missions',        badge: true },
        { to: '/demandes',     icon: Inbox,           label: 'Demandes'               },
        { to: '/todos',        icon: ListTodo,        label: 'Tâches'                 },
        { to: '/chat',         icon: MessageSquare,   label: 'Messagerie'             },
      ]
    },
    {
      title: 'Matériel & Suivi',
      items: [
        { to: '/materiel',     icon: Wrench,          label: 'Matériel'               },
        { to: '/metrologie',   icon: Gauge,           label: 'Métrologie'             },
        { to: '/maintenances', icon: Hammer,          label: 'Maintenances'           },
        { to: '/rapports',     icon: FileText,        label: 'Rapports'               },
      ]
    },
    {
      title: 'Outils & Support',
      items: [
        { to: '/outils/asservissement', icon: FlaskConical, label: 'Asservissement'   },
        { to: '/outils/estimation-volume', icon: CloudRain, label: 'Estimation volume' },
        { to: '/outils/tuyaux',        icon: Pipette,      label: 'Tuyaux'             },
        { to: '/infos',                icon: BookOpen,        label: 'Infos terrain'       },
        { to: '/aide',                 icon: HelpCircle,  label: 'Mode d\'emploi'       },
      ]
    },
    {
      title: 'Mon Espace',
      items: [
        { to: '/compte',                               label: 'Mon compte', isAccount: true },
        ...(role === 'admin' ? [{ to: '/admin', icon: ShieldAlert, label: 'Administration' }] : []),
      ]
    }
  ], [role])

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0 h-screen sticky top-0"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'var(--glass-panel)',
        WebkitBackdropFilter: 'var(--glass-panel)',
        borderRight: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* Logo + titre app */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <img src="/logo.png" alt="Labocea" className="size-8 object-contain shrink-0" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            Labocea PMC
          </span>
          {import.meta.env.DEV && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              DEV
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-4" style={{ scrollbarWidth: 'none' }}>
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5 block select-none"
              style={{ color: COLORS.TEXT_SECONDARY, opacity: 0.5 }}>
              {section.title}
            </span>
            {section.items.map(({ to, icon: Icon, label, end, badge, isAccount }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                style={({ isActive }) => ({
                  color: isActive ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'color 0.2s cubic-bezier(0.4,0,0.2,1)',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <m.div
                        layoutId="active-sidebar-bg"
                        className="absolute inset-0 rounded-lg -z-10"
                        style={{ background: 'var(--color-accent-light)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    {isAccount ? (
                      <UserAvatar
                        initiales={appUser?.initiales}
                        color={appUser?.avatarColor}
                        size={20}
                        fontSize={8}
                      />
                    ) : Icon ? (
                      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    ) : null}
                    <span className="flex-1 z-10 truncate">{label}</span>
                    {to === '/missions' && overdueCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10"
                        style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', minWidth: 18, textAlign: 'center' }}>
                        {overdueCount}
                      </span>
                    )}
                    {to === '/chat' && chatUnreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10"
                        style={{ 
                          background: chatHasMention ? 'var(--color-danger)' : 'var(--color-accent-light)', 
                          color: chatHasMention ? 'white' : 'var(--color-accent)', 
                          minWidth: 18, 
                          textAlign: 'center' 
                        }}
                      >
                        {chatUnreadCount}
                      </span>
                    )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Sync badge + Bouton signalement bug */}
      <div className="shrink-0 px-3 pb-4 flex flex-col gap-1" style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 12 }}>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <SyncBadge />
        </div>
        <button type="button"
          onClick={() => changelog.show()}
          className="relative flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = COLORS.TEXT_SECONDARY)}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
          <Sparkles size={14} strokeWidth={1.8} />
          Nouveautés
          {changelog.hasNew && (
            <span className="size-2 rounded-full shrink-0 ml-auto"
              style={{ background: COLORS.ACCENT }} />
          )}
        </button>
        <button type="button"
          onClick={() => setBugOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = COLORS.TEXT_SECONDARY)}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
          <Bug size={14} strokeWidth={1.8} />
          Signaler un problème
        </button>
      </div>

      <BugReportModal isOpen={bugOpen} onClose={() => setBugOpen(false)} />
    </aside>
  )
}
