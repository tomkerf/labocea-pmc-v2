import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FlaskConical } from 'lucide-react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import ToastContainer from '@/components/ui/ToastContainer'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { getAvatarColor, AVATAR_COLORS } from '@/components/ui/UserAvatar'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const appUser = useAuthStore(selectAppUser)

  // Masquer le bouton sur la page asservissement elle-même
  const showAsservBtn = !location.pathname.startsWith('/outils')
  const avatarColor = appUser?.avatarColor

  // Synchronise la couleur d'accentuation de l'app avec la couleur d'avatar du user
  useEffect(() => {
    const accent = getAvatarColor(avatarColor)
    const match = AVATAR_COLORS.find((c) => c.value === accent)
    const accentLight = match?.accentLight ?? '#E8F1FB'
    const root = document.documentElement
    root.style.setProperty('--color-accent', accent)
    root.style.setProperty('--color-accent-hover', accent)
    root.style.setProperty('--color-accent-light', accentLight)
  }, [avatarColor])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header
          className="flex items-center px-6 h-14 shrink-0"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.png" alt="Labocea" className="w-6 h-6 object-contain" />
            <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Labocea PMC
            </h1>
          </div>
        </header>

        {/* Pages avec transition */}
        <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-0">
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

      {/* TabBar mobile */}
      <TabBar />

      {/* Bouton flottant Asservissement — mobile uniquement */}
      {showAsservBtn && (
        <button
          onClick={() => navigate('/outils/asservissement')}
          className="md:hidden fixed z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg"
          style={{
            bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
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
