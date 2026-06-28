import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ListTodo, FileText, Gauge, Hammer,
  FlaskConical, Pipette, BookOpen, HelpCircle,
  ShieldAlert, ChevronRight, Inbox, CloudRain,
} from 'lucide-react'
import { useAuthStore, selectAppUser, selectRole } from '@/stores/authStore'
import { useTodosStore } from '@/stores/todosStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEquipementsStore } from '@/stores/equipementsStore'
import UserAvatar from '@/components/ui/UserAvatar'
import BugReportModal from '@/components/ui/BugReportModal'
import { COLORS } from '@/lib/constants'

interface PlusItem {
  to: string
  icon: LucideIcon
  label: string
  badge?: number
  badgeColor?: string
}

interface PlusSection {
  title: string
  items: PlusItem[]
}

export default function PlusPage() {
  const appUser = useAuthStore(selectAppUser)
  const role    = useAuthStore(selectRole)
  const navigate = useNavigate()
  const [bugOpen, setBugOpen] = useState(false)

  const todos        = useTodosStore(s => s.todos)
  const maintenances = useMaintenancesStore(s => s.maintenances)
  const equipements  = useEquipementsStore(s => s.equipements)

  const todosActives    = useMemo(() => todos.filter(t => t.statut !== 'termine').length, [todos])
  const maintenancesActives = useMemo(() => maintenances.filter(m => m.statut !== 'realisee' && m.statut !== 'abandonnee').length, [maintenances])
  const metrologieRetard = useMemo(() => {
    const today = new Date()
    return equipements.filter(e => e.prochainEtalonnage && new Date(e.prochainEtalonnage) < today).length
  }, [equipements])

  const sections = useMemo((): PlusSection[] => {
    const base: PlusSection[] = [
      {
        title: 'Suivi & production',
        items: [
          { to: '/todos',        icon: ListTodo,  label: 'Tâches',       badge: todosActives || undefined,       badgeColor: COLORS.DANGER  },
          { to: '/rapports',     icon: FileText,  label: 'Rapports'                                                                          },
          { to: '/metrologie',   icon: Gauge,     label: 'Métrologie',   badge: metrologieRetard || undefined,   badgeColor: COLORS.DANGER  },
          { to: '/maintenances', icon: Hammer,    label: 'Maintenances', badge: maintenancesActives || undefined, badgeColor: COLORS.TEXT_SECONDARY },
        ]
      },
      {
        title: 'Outils terrain',
        items: [
          { to: '/outils/asservissement',    icon: FlaskConical, label: 'Asservissement'          },
          { to: '/outils/estimation-volume', icon: CloudRain,    label: 'Estimation volume'       },
          { to: '/outils/tuyaux',            icon: Pipette,      label: 'Tuyaux de prélèvement'  },
          { to: '/infos',                 icon: BookOpen,     label: 'Infos terrain'           },
          { to: '/demandes',              icon: Inbox,        label: 'Demandes'                },
        ]
      },
      {
        title: 'Mon espace',
        items: [
          { to: '/compte', icon: HelpCircle, label: 'Mon compte' },
          ...(role === 'admin' ? [{ to: '/admin', icon: ShieldAlert, label: 'Administration' }] : []),
        ]
      },
    ]
    return base
  }, [todosActives, metrologieRetard, maintenancesActives, role])

  return (
    <div className="p-6 pb-28 max-w-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: COLORS.TEXT_PRIMARY, letterSpacing: '-0.8px' }}>Plus</h1>
      </div>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
              style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.8px' }}>
              {section.title}
            </p>
            <div className="rounded-xl overflow-hidden"
              style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              {section.items.map(({ to, icon: Icon, label, badge, badgeColor }, idx) => (
                <NavLink
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--color-accent-light)' : 'transparent',
                    borderTop: idx > 0 ? '1px solid var(--color-border-subtle)' : undefined,
                    textDecoration: 'none',
                  })}
                >
                  <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: COLORS.BG_TERTIARY }}>
                    <Icon size={18} strokeWidth={1.8} style={{ color: COLORS.TEXT_SECONDARY }} />
                  </div>
                  <span className="flex-1 text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
                    {label}
                  </span>
                  {badge !== undefined && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center"
                      style={{ background: (badgeColor ?? COLORS.ACCENT) + '20', color: badgeColor ?? COLORS.ACCENT }}>
                      {badge}
                    </span>
                  )}
                  <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Support */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
            style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.8px' }}>
            Support
          </p>
          <div className="rounded-xl overflow-hidden"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <NavLink
              to="/aide"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors"
              style={{ textDecoration: 'none' }}
            >
              <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: COLORS.BG_TERTIARY }}>
                <HelpCircle size={18} strokeWidth={1.8} style={{ color: COLORS.TEXT_SECONDARY }} />
              </div>
              <span className="flex-1 text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>Mode d'emploi</span>
              <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }} />
            </NavLink>
            <button
              type="button"
              onClick={() => setBugOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors"
              style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'transparent' }}
            >
              <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#FFF0F0' }}>
                <HelpCircle size={18} strokeWidth={1.8} style={{ color: COLORS.DANGER }} />
              </div>
              <span className="flex-1 text-left text-sm font-medium" style={{ color: COLORS.DANGER }}>
                Signaler un problème
              </span>
              <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>
        </div>

        {/* Pied utilisateur */}
        {appUser && (
          <button
            type="button"
            onClick={() => navigate('/compte')}
            className="flex items-center gap-3 p-4 rounded-xl w-full text-left"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}
          >
            <UserAvatar initiales={appUser.initiales} color={appUser.avatarColor} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                {appUser.prenom} {appUser.nom}
              </p>
              <p className="text-xs truncate" style={{ color: COLORS.TEXT_SECONDARY }}>
                {appUser.email}
              </p>
            </div>
            <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        )}
      </div>

      <BugReportModal isOpen={bugOpen} onClose={() => setBugOpen(false)} />
    </div>
  )
}
