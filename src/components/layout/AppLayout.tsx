import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import ErrorBoundary from './ErrorBoundary'
import ToastContainer from '@/components/ui/ToastContainer'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { getAvatarColor, AVATAR_COLORS } from '@/components/ui/UserAvatar'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import SyncBadge from '@/components/ui/SyncBadge'

export default function AppLayout() {
  const location  = useLocation()
  const appUser   = useAuthStore(selectAppUser)
  const [drawerOpen, setDrawerOpen] = useState(false)
  useNetworkStatus()

  const avatarColor = appUser?.avatarColor

  // Fermer le drawer à chaque changement de route
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Synchronise la couleur d'accentuation avec la couleur d'avatar
  useEffect(() => {
    const accent = getAvatarColor(avatarColor)
    const match  = AVATAR_COLORS.find((c) => c.value === accent)
    const accentLight = match?.accentLight ?? '#E8F1FB'
    const root = document.documentElement
    root.style.setProperty('--color-accent',       accent)
    root.style.setProperty('--color-accent-hover',  accent)
    root.style.setProperty('--color-accent-light',  accentLight)
  }, [avatarColor])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Drawer burger — mobile uniquement */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header
          className="flex items-center px-4 h-14 shrink-0"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Titre app — mobile */}
          <div className="md:hidden flex items-center gap-2 flex-1">
            <img src="/logo.png" alt="Labocea" className="w-6 h-6 object-contain" />
            <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Labocea PMC
            </span>
          </div>

          {/* Sync badge + Burger — mobile */}
          <div className="md:hidden flex items-center gap-2">
            <SyncBadge />
            <button
              className="p-2 rounded-xl"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              onClick={() => setDrawerOpen(true)}
              aria-label="Menu"
            >
              <Menu size={18} strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Pages avec transition — plus de padding-bottom pour tab bar */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toasts */}
      <ToastContainer />
    </div>
  )
}
