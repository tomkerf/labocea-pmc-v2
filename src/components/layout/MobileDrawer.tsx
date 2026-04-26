import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, Wrench, BookOpen, ShieldAlert, X, FlaskConical,
} from 'lucide-react'
import { useAuthStore, selectAppUser, selectRole } from '@/stores/authStore'
import UserAvatar from '@/components/ui/UserAvatar'

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/planning',   icon: CalendarDays,    label: 'Planning'                   },
  { to: '/materiel',   icon: Wrench,          label: 'Matériel'                   },
  { to: '/infos',      icon: BookOpen,        label: 'Infos terrain'              },
  { to: '/outils/asservissement', icon: FlaskConical, label: 'Asservissement'     },
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
          <motion.div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="md:hidden fixed top-0 left-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 280,
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(16px)',
              borderRight: '1px solid var(--color-border-subtle)',
              boxShadow: '4px 0 32px rgba(0,0,0,0.12)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between px-4 h-14 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Labocea" className="w-7 h-7 object-contain" />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Labocea PMC
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                    V2
                  </span>
                </div>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
              {allItems.map(({ to, icon: Icon, label, end, isAccount }: any) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
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
                      avatarSeed={appUser?.avatarSeed}
                      size={20}
                      fontSize={8}
                    />
                  ) : Icon ? (
                    <Icon size={18} strokeWidth={1.8} />
                  ) : null}
                  <span className="flex-1">{label}</span>
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
                  avatarSeed={appUser?.avatarSeed}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {appUser?.prenom} {appUser?.nom}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {appUser?.email}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
