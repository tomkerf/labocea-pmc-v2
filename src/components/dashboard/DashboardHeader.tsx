import { m } from 'framer-motion'
import { Link } from 'react-router-dom'
import { getGreeting, formatDate } from '@/lib/dashboardUtils'
import UserAvatar from '@/components/ui/UserAvatar'

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
  avatarColor?: string;
  initiales?: string;
}

export function DashboardHeader({ prenom, isGeneraliste, activeTab, setActiveTab, avatarColor, initiales }: DashboardHeaderProps) {
  return (
    <>
      <m.div variants={itemVariants} className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
            {formatDate()}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {getGreeting()}, {prenom || 'Thomas'} 👋
          </h1>
        </div>
        {initiales && (
          <Link
            to="/compte"
            className="shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            aria-label="Mon compte"
          >
            <UserAvatar initiales={initiales} color={avatarColor} size={44} />
          </Link>
        )}
      </m.div>

      {/* Switcher de rôle (uniquement pour les chargés de mission / admins) */}
      {isGeneraliste && (
        <m.div variants={itemVariants} className="mb-6 flex">
          <div className="flex gap-0.5 p-0.5 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveTab('technicien')}
              className={`relative px-4 py-2 text-sm font-semibold rounded-lg z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 ${
                activeTab === 'technicien' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {activeTab === 'technicien' && (
                <m.div
                  layoutId="active-role-tab"
                  className="absolute inset-0 rounded-lg -z-10 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Mon activité
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manager')}
              className={`relative px-4 py-2 text-sm font-semibold rounded-lg z-10 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 ${
                activeTab === 'manager' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {activeTab === 'manager' && (
                <m.div
                  layoutId="active-role-tab"
                  className="absolute inset-0 rounded-lg -z-10 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Suivi équipe
            </button>
          </div>
        </m.div>
      )}
    </>
  )
}
