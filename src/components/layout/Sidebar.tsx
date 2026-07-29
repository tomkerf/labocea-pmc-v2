import React, { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, ListTodo, Wrench, Gauge, Hammer, Inbox, BookOpen, ShieldAlert, Pipette, HelpCircle, Bug, FileText, Sparkles, FlaskConical, CloudRain, MessageSquare, Newspaper, ChevronDown, Search, Compass, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { m } from 'framer-motion'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectAppUser, selectRole, selectUid } from '@/stores/authStore'
import { isSamplingOverdue } from '@/lib/overdue'
import UserAvatar from '@/components/ui/UserAvatar'
import BugReportModal from '@/components/ui/BugReportModal'
import SyncBadge from '@/components/ui/SyncBadge'
import { useChangelogState } from '@/components/ui/ChangelogModal'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'
import { useActusStore } from '@/stores/actusStore'
import { useSpotlightStore } from '@/stores/spotlightStore'


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
  collapsible?: boolean
}


export default function Sidebar() {
  const { clients } = useMissionsStore()
  const appUser = useAuthStore(selectAppUser)
  const role    = useAuthStore(selectRole)
  const [bugOpen, setBugOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['Matériel & Suivi', 'Outils & Support']))
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const openSpotlight = useSpotlightStore((s) => s.open)

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed))
  }, [collapsed])

  const toggleCollapsed = () => setCollapsed(prev => !prev)

  const toggleSection = (title: string) => setCollapsedSections(prev => {
    const next = new Set(prev)
    if (next.has(title)) next.delete(title)
    else next.add(title)
    return next
  })
  const changelog = useChangelogState()
  const { unreadCount: chatUnreadCount } = useChatNotificationStore()
  const uid = useAuthStore(selectUid)
  const actus = useActusStore(s => s.actus)

  const actusUnreadCount = useMemo(() => {
    if (!uid) return 0
    return actus.filter(actu => !actu.lectureUids.includes(uid)).length
  }, [actus, uid])

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
        { to: '/actus',        icon: Newspaper,       label: 'Actualités'             },
        { to: '/demandes',     icon: Inbox,           label: 'Demandes'               },
        { to: '/missions',     icon: ClipboardList,   label: 'Missions',        badge: true },
        { to: '/pilotage',     icon: Compass,         label: 'Pilotage'                },
        { to: '/planning',     icon: CalendarDays,    label: 'Planning'               },
        { to: '/rapports',     icon: FileText,        label: 'Rapports'               },
        { to: '/todos',        icon: ListTodo,        label: 'Tâches'                 },
        { to: '/chat',         icon: MessageSquare,   label: 'Messagerie'             },
      ]
    },
    {
      title: 'Matériel & Suivi',
      collapsible: true,
      items: [
        { to: '/materiel',     icon: Wrench,          label: 'Matériel'               },
        { to: '/metrologie',   icon: Gauge,           label: 'Métrologie'             },
        { to: '/maintenances', icon: Hammer,          label: 'Maintenances'           },
        { to: '/outils/tuyaux', icon: Pipette,        label: 'Tuyaux'                 },
      ]
    },
    {
      title: 'Outils & Support',
      collapsible: true,
      items: [
        { to: '/outils/asservissement', icon: FlaskConical, label: 'Asservissement'   },
        { to: '/outils/estimation-volume', icon: CloudRain, label: 'Estimation volume' },
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
      className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 bg-[rgba(255,255,255,0.85)] backdrop-blur-md border-r border-[var(--color-border-subtle)]"
      style={{ width: collapsed ? 64 : 220, transition: 'width 200ms ease' }}
    >
      {/* Logo + titre app */}
      <div className={collapsed
        ? 'px-2 py-4 flex flex-col items-center gap-2 border-b border-[var(--color-border-subtle)]'
        : 'px-4 py-4 flex items-center gap-3 border-b border-[var(--color-border-subtle)]'}>
        <img src="/logo.png" alt="Labocea" className="size-8 object-contain shrink-0" />
        {!collapsed && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold text-[var(--color-text-primary)]">
              Labocea PMC
            </span>
            {import.meta.env.DEV && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.12)]">
                DEV
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Développer la barre latérale' : 'Réduire la barre latérale'}
          title={collapsed ? 'Développer la barre latérale' : 'Réduire la barre latérale'}
          className={collapsed
            ? 'flex items-center justify-center p-1.5 rounded-md transition-all cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50'
            : 'ml-auto flex items-center justify-center p-1.5 rounded-md transition-all cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50'}
        >
          {collapsed
            ? <PanelLeftOpen size={16} strokeWidth={1.8} />
            : <PanelLeftClose size={16} strokeWidth={1.8} />}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className={collapsed
          ? 'flex-1 min-h-0 overflow-y-auto px-2 py-3 flex flex-col gap-2'
          : 'flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-4'}
        style={{ scrollbarWidth: 'none' }}
      >
        {sections.map((section, index) => {
          const isExpanded = !collapsedSections.has(section.title)
          const showItems = collapsed || !section.collapsible || isExpanded
          return (
            <div key={section.title} className="flex flex-col gap-0.5">
              {collapsed ? (
                index > 0 && <div role="separator" className="mx-2 border-t border-[var(--color-border-subtle)]" />
              ) : section.collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center gap-1.5 px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] opacity-75 hover:opacity-100 transition-opacity cursor-pointer text-left"
                  aria-expanded={isExpanded}
                >
                  {section.title}
                  <ChevronDown size={11} strokeWidth={2.2}
                    className="transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                </button>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5 block text-[var(--color-text-secondary)] opacity-60 select-none">
                  {section.title}
                </span>
              )}
              {showItems && section.items.map(({ to, icon: Icon, label, end, isAccount }) => {
                const badge = to === '/missions' ? { count: overdueCount, danger: true }
                  : to === '/chat'  ? { count: chatUnreadCount, danger: true }
                  : to === '/actus' ? { count: actusUnreadCount, danger: false }
                  : null
                const railName = badge && badge.count > 0 ? `${label} (${badge.count})` : label
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    aria-label={collapsed ? railName : undefined}
                    title={collapsed ? railName : undefined}
                    className={({ isActive }) => collapsed
                      ? `relative flex items-center justify-center py-2.5 rounded-lg transition-all cursor-pointer ${
                          isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/40'
                        }`
                      : `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                          isActive ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-text-secondary)] font-normal hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/40'
                        }`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <m.div
                            layoutId="active-sidebar-bg"
                            className="absolute inset-0 rounded-lg -z-10 bg-[var(--color-accent-light)] border border-[rgba(52,82,122,0.08)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}

                        <span className="relative shrink-0">
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
                          {collapsed && badge && badge.count > 0 && (
                            <span className={badge.danger
                              ? 'absolute -top-1.5 -right-2 text-[9px] font-bold px-1 rounded-full min-w-[15px] text-center z-10 bg-[var(--color-danger-light)] text-[var(--color-danger-text)] border border-[rgba(255,59,48,0.15)]'
                              : 'absolute -top-1.5 -right-2 text-[9px] font-bold px-1 rounded-full min-w-[15px] text-center z-10 bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[rgba(0,113,227,0.15)]'}>
                              {badge.count > 99 ? '99+' : badge.count}
                            </span>
                          )}
                        </span>
                        {!collapsed && <span className="flex-1 z-10 truncate">{label}</span>}
                        {!collapsed && badge && badge.count > 0 && (
                          <span className={badge.danger
                            ? 'text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 bg-[var(--color-danger-light)] text-[var(--color-danger-text)] border border-[rgba(255,59,48,0.15)] min-w-[18px] text-center'
                            : 'text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[rgba(0,113,227,0.15)] min-w-[18px] text-center'}>
                            {badge.count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Sync badge + Bouton signalement bug */}
      <div className={collapsed
        ? 'shrink-0 px-2 pb-4 flex flex-col items-stretch gap-1 border-t border-[var(--color-border-subtle)] pt-3.5'
        : 'shrink-0 px-3 pb-4 flex flex-col gap-1 border-t border-[var(--color-border-subtle)] pt-3.5'}>
        <div className={collapsed
          ? 'flex items-center justify-center py-1.5'
          : 'flex items-center gap-2 px-3 py-1.5'}>
          <SyncBadge />
        </div>
        <button type="button"
          onClick={openSpotlight}
          aria-label={collapsed ? 'Rechercher (⌘K)' : undefined}
          title={collapsed ? 'Rechercher (⌘K)' : undefined}
          className={collapsed
            ? 'relative flex items-center justify-center w-full py-2 rounded-lg text-xs font-medium transition-all text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50 cursor-pointer'
            : 'relative flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50 cursor-pointer'}
        >
          <Search size={14} strokeWidth={1.8} />
          {!collapsed && <span>Rechercher</span>}
          {!collapsed && (
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]">
              ⌘K
            </span>
          )}
        </button>
        <button type="button"
          onClick={() => changelog.show()}
          aria-label={collapsed ? 'Nouveautés' : undefined}
          title={collapsed ? 'Nouveautés' : undefined}
          className={collapsed
            ? 'relative flex items-center justify-center w-full py-2 rounded-lg text-xs font-medium transition-all text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50 cursor-pointer'
            : 'relative flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50 cursor-pointer'}
        >
          {collapsed ? (
            <span className="relative">
              <Sparkles size={14} strokeWidth={1.8} />
              {changelog.hasNew && (
                <span className="size-2 rounded-full shrink-0 absolute -top-0.5 -right-0.5 bg-[var(--color-accent)] animate-pulse" />
              )}
            </span>
          ) : (
            <Sparkles size={14} strokeWidth={1.8} />
          )}
          {!collapsed && <span>Nouveautés</span>}
          {!collapsed && changelog.hasNew && (
            <span className="size-2 rounded-full shrink-0 ml-auto bg-[var(--color-accent)] animate-pulse" />
          )}
        </button>
        <button type="button"
          onClick={() => setBugOpen(true)}
          aria-label={collapsed ? 'Signaler un problème' : undefined}
          title={collapsed ? 'Signaler un problème' : undefined}
          className={collapsed
            ? 'relative flex items-center justify-center w-full py-2 rounded-lg text-xs font-medium transition-all text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50 cursor-pointer'
            : 'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50 cursor-pointer'}
        >
          <Bug size={14} strokeWidth={1.8} />
          {!collapsed && <span>Signaler un problème</span>}
        </button>
      </div>

      <BugReportModal isOpen={bugOpen} onClose={() => setBugOpen(false)} />
    </aside>
  )
}
