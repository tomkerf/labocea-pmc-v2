import { m } from 'framer-motion'
import { COLORS } from '@/lib/constants'
import { getGreeting, formatDate } from '@/lib/dashboardUtils'

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  }
} as const

interface DashboardHeaderProps {
  prenom: string | null;
  isGeneraliste: boolean;
  activeTab: 'technicien' | 'manager';
  setActiveTab: (tab: 'technicien' | 'manager') => void;
}

export function DashboardHeader({ prenom, isGeneraliste, activeTab, setActiveTab }: DashboardHeaderProps) {
  return (
    <>
      <m.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: COLORS.TEXT_PRIMARY, letterSpacing: '-0.5px' }}>
          {getGreeting()} {prenom || 'Thomas'} 👋
        </h1>
        <p className="text-base capitalize" style={{ color: COLORS.TEXT_SECONDARY }}>
          {formatDate()}
        </p>
      </m.div>

      {/* Switcher de rôle (uniquement pour les chargés de mission / admins) */}
      {isGeneraliste && (
        <m.div variants={itemVariants} className="mb-6 flex">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: COLORS.BG_TERTIARY }}>
            <button
              type="button"
              onClick={() => setActiveTab('technicien')}
              className="relative px-4 py-2 text-sm font-semibold rounded-lg z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2"
              style={{
                color: activeTab === 'technicien' ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
              }}
            >
              {activeTab === 'technicien' && (
                <m.div
                  layoutId="active-role-tab"
                  className="absolute inset-0 rounded-lg -z-10"
                  style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-card)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Mon activité terrain
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manager')}
              className="relative px-4 py-2 text-sm font-semibold rounded-lg z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2"
              style={{
                color: activeTab === 'manager' ? COLORS.ACCENT : COLORS.TEXT_SECONDARY,
              }}
            >
              {activeTab === 'manager' && (
                <m.div
                  layoutId="active-role-tab"
                  className="absolute inset-0 rounded-lg -z-10"
                  style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-card)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Suivi équipe (CM)
            </button>
          </div>
        </m.div>
      )}
    </>
  )
}
