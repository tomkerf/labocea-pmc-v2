import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, FlaskConical } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import ToastContainer from '@/components/ui/ToastContainer'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { getAvatarColor, AVATAR_COLORS } from '@/components/ui/UserAvatar'

export default function AppLayout() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const appUser   = useAuthStore(selectAppUser)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const showAsservBtn = !location.pathname.startsWith('/outils')
  const avatarColor   = appUser?.avatarColor

  // Fermer le drawer à chaque changement de route
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
          className="flex items-center gap-3 px-4 h-14 shrink-0"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Burger — mobile */}
          <button
            className="md:hidden p-2 rounded-xl"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>

          {/* Titre app — mobile */}
          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.png" alt="Labocea" className="w-6 h-6 object-contain" />
            <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Labocea PMC
            </span>
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
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bouton flottant Asservissement — mobile uniquement */}
      {showAsservBtn && (
        <button
          onClick={() => navigate('/outils/asservissement')}
          className="md:hidden fixed z-30 flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            right: '16px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            color: 'var(--color-accent)',
          }}>
          <FlaskConical size={15} strokeWidth={2} />
          <span className="text-xs font-semibold">Asservissement</span>
        </button>
      )}

      {/* Toasts */}
      <ToastContainer />
    </div>
  )
}
