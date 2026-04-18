import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import TabBar from './TabBar'

const pageTitles: Record<string, string> = {
  '/':             'Missions',
  '/materiel':     'Matériel',
  '/metrologie':   'Métrologie',
  '/maintenances': 'Maintenances',
  '/compte':       'Mon compte',
}

export default function AppLayout() {
  const location = useLocation()

  // Titre basé sur la route courante (premier segment)
  const rootPath = '/' + (location.pathname.split('/')[1] ?? '')
  const title = pageTitles[rootPath] ?? 'Labocea PMC'

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
          <h1 className="text-base font-semibold md:hidden" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h1>
        </header>

        {/* Pages avec transition */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
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
    </div>
  )
}
