import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'
import ErrorBoundary from './ErrorBoundary'
import GlobalListeners from './GlobalListeners'
import ToastContainer from '@/components/ui/ToastContainer'
import ChangelogModal, { useChangelogState } from '@/components/ui/ChangelogModal'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import SyncBadge from '@/components/ui/SyncBadge'
import SpotlightModal from '@/components/spotlight/SpotlightModal'
import { useSpotlightStore } from '@/stores/spotlightStore'
import { useGlobalHotkey } from '@/hooks/useGlobalHotkey'
import { Search } from 'lucide-react'


export default function AppLayout() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const changelog = useChangelogState()
  useNetworkStatus()

  const openSpotlight = useSpotlightStore((s) => s.open)
  useGlobalHotkey('k', openSpotlight)

  const isChatPage = pathname.startsWith('/chat')

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => setScrolled(container.scrollTop > 5)
    container.addEventListener('scroll', handleScroll, { passive: true })
    setScrolled(false)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [pathname])

  // Contourne un bug de repaint Chromium : le DOM est à jour (nouvelle page
  // montée, opacité animée à 1) mais les pixels ne sont pas repeints tant
  // qu'aucun scroll ne survient. Se produit au retour sur l'onglet ET après
  // une navigation SPA — on force donc un micro-scroll dans les deux cas.
  // Pour la navigation, on se cale sur la fin réelle de l'animation
  // framer-motion (onAnimationComplete) plutôt qu'un délai fixe, qui peut
  // être trop court si l'onglet est ralenti (beaucoup d'onglets ouverts…).
  function forceRepaint() {
    const container = scrollContainerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      container.scrollTop += 1
      container.scrollTop -= 1
    })
  }

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') forceRepaint()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Listeners Firestore globaux — montés une seule fois pour toute la session */}
      <GlobalListeners />

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
          {/* Recherche + Sync badge — visibles sur mobile uniquement (desktop les a dans la sidebar) */}
          <div className="md:hidden flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={openSpotlight}
              aria-label="Rechercher"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <Search size={18} strokeWidth={1.8} />
            </button>
            <SyncBadge />
          </div>
        </header>

        {/* Pages avec transition */}
        <div 
          ref={scrollContainerRef} 
          className={`flex-1 ${
            isChatPage 
              ? 'overflow-hidden pb-0' 
              : 'overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-0'
          }`}
        >
          {/* Pas de mode="wait" : si l'exit d'une page se fige (onglet en
              arrière-plan, rAF gelé), l'entrant reste bloqué à opacity: 0
              indéfiniment (deadlock AnimatePresence). En mode par défaut
              (sync), l'entrant monte sans attendre la fin de l'exit. */}
          <AnimatePresence>
            <m.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onAnimationComplete={forceRepaint}
              className="h-full"
            >
              <ErrorBoundary>
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

      {/* Spotlight */}
      <SpotlightModal />
    </div>
  )
}
