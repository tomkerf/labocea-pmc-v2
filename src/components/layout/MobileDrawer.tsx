import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { m, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, ClipboardList, CalendarDays, ListTodo, Wrench, BookOpen, ShieldAlert, X, FlaskConical, Pipette, HelpCircle, Gauge, Hammer, FileText,
} from 'lucide-react'
import { useAuthStore, selectAppUser, selectRole } from '@/stores/authStore'
import UserAvatar from '@/components/ui/UserAvatar'
import { COLORS } from '@/lib/constants'


const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/missions',   icon: ClipboardList,   label: 'Missions'                   },
  { to: '/planning',   icon: CalendarDays,    label: 'Planning'                   },
  { to: '/todos',      icon: ListTodo,        label: 'Tâches'                     },
  { to: '/infos',      icon: BookOpen,        label: 'Infos terrain'              },
  { to: '/rapports',              icon: FileText,     label: 'Rapports'           },
  { to: '/materiel',   icon: Wrench,          label: 'Matériel'                   },
  { to: '/metrologie',            icon: Gauge,        label: 'Métrologie'         },
  { to: '/maintenances',          icon: Hammer,       label: 'Maintenances'       },
  { to: '/outils/asservissement', icon: FlaskConical, label: 'Asservissement'     },
  { to: '/outils/tuyaux',        icon: Pipette,      label: 'Tuyaux'             },
  { to: '/aide',                 icon: HelpCircle,   label: 'Mode d\'emploi'     },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function MobileDrawer({ open, onClose }: Props) {
  const appUser = useAuthStore(selectAppUser)
  const role    = useAuthStore(selectRole)

  // Bloquer le scroll du body
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const allItems = [
    ...NAV_ITEMS,
    ...(role === 'admin' ? [{ to: '/admin', icon: ShieldAlert, label: 'Administration', end: false, badge: false }] : []),
    { to: '/compte', icon: null, label: 'Mon compte', end: false, badge: false, isAccount: true },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <m.div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <m.div
            className="md:hidden fixed top-0 right-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 280,
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(9px)',
              borderLeft: '1px solid var(--color-border-subtle)',
              boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            initial={{ x: 280 }}
            animate={{ x: 0 }}
            exit={{ x: 280 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between px-4 h-14 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <button type="button" onClick={onClose}
                aria-label="Fermer le menu"
                className="p-1.5 rounded-lg"
                style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
                <X size={16} strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                    Labocea PMC
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                    V2
                  </span>
                </div>
                <img src="/logo.png" alt="Labocea" className="size-7 object-contain" />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
              {allItems.map(({ to, icon: Icon, label, end, isAccount }: { to: string; icon: LucideIcon | null; label: string; end?: boolean; isAccount?: boolean }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
                  style={({ isActive }) => ({
                    color: isActive ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
                    fontWeight: isActive ? 500 : 400,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <m.div
                          layoutId="active-mobile-drawer-bg"
                          className="absolute inset-0 rounded-xl -z-10"
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
                        <Icon size={18} strokeWidth={1.8} />
                      ) : null}
                      <span className="flex-1 z-10">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Pied : infos utilisateur */}
            <div className="px-4 py-3 shrink-0"
              style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-center gap-3">
                <UserAvatar
                  initiales={appUser?.initiales}
                  color={appUser?.avatarColor}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                    {appUser?.prenom} {appUser?.nom}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {appUser?.email}
                  </p>
                </div>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
