import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import ErrorBoundary from './ErrorBoundary'
import ToastContainer from '@/components/ui/ToastContainer'
import ChangelogModal, { useChangelogState } from '@/components/ui/ChangelogModal'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import SyncBadge from '@/components/ui/SyncBadge'
import { COLORS } from '@/lib/constants'


export default function AppLayout() {
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const changelog = useChangelogState()
  useNetworkStatus()


  // Fermer le drawer à chaque changement de route
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false) }, [pathname])



  // Écouteur de scroll dynamique pour la barre supérieure mobile
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      setScrolled(container.scrollTop > 5)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    // Réinitialiser au changement de route
    setScrolled(false)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: COLORS.BG_PRIMARY }}>
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Drawer burger — mobile uniquement */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header
          className="flex items-center px-4 h-14 shrink-0 z-30"
          style={{
            background: scrolled ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid var(--color-border-subtle)',
            boxShadow: scrolled ? '0 4px 16px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' : 'none',
            transition: 'background 300ms, border-color 300ms, box-shadow 300ms',
          }}
        >
          {/* Titre app — mobile */}
          <div className="md:hidden flex items-center gap-2 flex-1">
            <img src="/logo.png" alt="Labocea" className="size-8 object-contain" />
            <span className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Labocea PMC
            </span>
          </div>

          {/* Sync badge + Burger — mobile */}
          <div className="md:hidden flex items-center gap-2">
            <SyncBadge />
            <button type="button"
              className="p-2 rounded-xl"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}
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
            <m.div
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
            </m.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toasts */}
      <ToastContainer />

      {/* Changelog */}
      <ChangelogModal open={changelog.open} onClose={changelog.dismiss} />
    </div>
  )
}
