import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
    container.scrollTo(0, 0)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [pathname])

  // Filet de sécurité : si un wrapper de page reste figé à opacity < 1
  // (animation CSS interrompue par un rAF/onglet gelé), on le rend visible
  // de force. Ne devrait normalement jamais se déclencher puisque .animate-page-in
  // n'a pas de fill-mode — l'état de repos est déjà opacity:1.
  useEffect(() => {
    const heal = () => {
      document.querySelectorAll<HTMLElement>('[data-route-wrapper]').forEach((el) => {
        if (parseFloat(getComputedStyle(el).opacity) < 1) {
          el.style.opacity = '1'
          el.style.transform = 'none'
        }
      })
    }
    const timer = setTimeout(heal, 300)
    document.addEventListener('visibilitychange', heal)
    window.addEventListener('pageshow', heal)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', heal)
      window.removeEventListener('pageshow', heal)
    }
  }, [pathname])

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
          {/* Animation CSS pure (pas de framer-motion) : dépendre d'une
              boucle rAF pour rendre le contenu visible est dangereux, un
              onglet gelé en arrière-plan fige l'opacité à 0 indéfiniment
              (page blanche jusqu'à reload). .animate-page-in n'a pas de
              fill-mode : l'état de repos est déjà opacity:1. */}
          <div key={pathname} data-route-wrapper className="h-full animate-page-in">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
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
