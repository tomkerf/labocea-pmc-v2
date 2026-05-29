import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import ErrorBoundary from './ErrorBoundary'
import ToastContainer from '@/components/ui/ToastContainer'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { getAvatarColor, AVATAR_COLORS } from '@/components/ui/avatarColors'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import SyncBadge from '@/components/ui/SyncBadge'

export default function AppLayout() {
  const { pathname } = useLocation()
  const appUser   = useAuthStore(selectAppUser)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useNetworkStatus()

  const avatarColor = appUser?.avatarColor

  // Fermer le drawer à chaque changement de route
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false) }, [pathname])

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

  // Écouteur de scroll dynamique pour la barre supérieure mobile
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      setScrolled(container.scrollTop > 5)
    }
    container.addEventListener('scroll', handleScroll)
    // Réinitialiser au changement de route
    setScrolled(false)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [pathname])

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
          className="flex items-center px-4 h-14 shrink-0 transition-all duration-300 z-30"
          style={{
            background: scrolled ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.85)',
            backdropFilter: scrolled ? 'blur(20px)' : 'blur(12px)',
            borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid var(--color-border-subtle)',
            boxShadow: scrolled ? '0 4px 16px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' : 'none',
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
            <button type="button"
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
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
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
