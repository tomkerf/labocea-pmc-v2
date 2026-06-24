import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'
import ErrorBoundary from './ErrorBoundary'
import ToastContainer from '@/components/ui/ToastContainer'
import ChangelogModal, { useChangelogState } from '@/components/ui/ChangelogModal'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import SyncBadge from '@/components/ui/SyncBadge'
import { COLORS } from '@/lib/constants'


export default function AppLayout() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const changelog = useChangelogState()
  useNetworkStatus()

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => setScrolled(container.scrollTop > 5)
    container.addEventListener('scroll', handleScroll, { passive: true })
    setScrolled(false)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: COLORS.BG_PRIMARY }}>
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar — desktop uniquement (mobile utilise BottomTabBar) */}
        <header
          className="flex items-center px-4 h-14 shrink-0 z-30"
          style={{
            background: scrolled ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'var(--glass-panel)',
            WebkitBackdropFilter: 'var(--glass-panel)',
            borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid var(--color-border-subtle)',
            boxShadow: scrolled ? '0 4px 16px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' : 'none',
            transition: 'background 300ms, border-color 300ms, box-shadow 300ms',
          }}
        >
          {/* Sync badge — visible sur mobile uniquement (desktop l'a dans la sidebar) */}
          <div className="md:hidden flex items-center ml-auto">
            <SyncBadge />
          </div>
        </header>

        {/* Pages avec transition */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-[74px] md:pb-0">
          <AnimatePresence mode="wait">
            <m.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              <ErrorBoundary key={pathname}>
                <Outlet />
              </ErrorBoundary>
            </m.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Tab bar mobile */}
      <BottomTabBar />

      {/* Toasts */}
      <ToastContainer />

      {/* Changelog */}
      <ChangelogModal open={changelog.open} onClose={changelog.dismiss} />
    </div>
  )
}
