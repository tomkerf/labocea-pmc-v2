import { useState } from 'react'
import { useAuthStore, selectRole } from '@/stores/authStore'
import type { UserRole } from '@/types'
import { ParOuCommencerSection, StatutsSection } from '@/components/aide/IntroSections'
import { PlanningSection, Bilan24hSection } from '@/components/aide/PlanningSections'
import { MissionClientSection, VisitePreliminaireSection } from '@/components/aide/MissionsSections'
import { MaterielSection, MetrologieSection } from '@/components/aide/MaterielSections'
import { DashboardSection, SignalerProblemeSection } from '@/components/aide/DashboardSections'

type RoleFilter = UserRole | 'tous'

const ROLES: { value: RoleFilter; label: string; desc: string }[] = [
  { value: 'tous',           label: 'Tout afficher',      desc: 'Toutes les sections' },
  { value: 'technicien',     label: 'Technicien terrain', desc: 'Planning, terrain, matériel' },
  { value: 'charge_mission', label: 'Chargé de mission',  desc: 'Missions, clients, rapports' },
  { value: 'admin',          label: 'Admin',              desc: 'Gestion complète' },
]

// Sections visibles par rôle
const VISIBLE: Record<RoleFilter, string[]> = {
  tous:           ['debut', 'statuts', 'planning', 'bilan24h', 'missions', 'visite', 'materiel', 'metrologie', 'dashboard', 'signaler'],
  technicien:     ['debut', 'statuts', 'planning', 'bilan24h', 'materiel', 'metrologie', 'dashboard', 'signaler'],
  charge_mission: ['debut', 'statuts', 'planning', 'bilan24h', 'missions', 'visite', 'materiel', 'metrologie', 'dashboard', 'signaler'],
  admin:          ['debut', 'statuts', 'planning', 'bilan24h', 'missions', 'visite', 'materiel', 'metrologie', 'dashboard', 'signaler'],
}

export default function AidePage() {
  const userRole = useAuthStore(selectRole)
  const defaultFilter: RoleFilter = userRole ?? 'tous'
  const [filter, setFilter] = useState<RoleFilter>(defaultFilter)

  const visible = VISIBLE[filter]
  const show = (key: string) => visible.includes(key)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* En-tête */}
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Mode d'emploi
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Guide d'utilisation de Labocea PMC. Filtre par profil pour n'afficher que ce qui te concerne.
        </p>
      </div>

      {/* Sélecteur de profil */}
      <div className="rounded-xl p-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Mon profil
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(({ value, label, desc }) => {
            const active = filter === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className="flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all"
                style={{
                  background: active ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  border: `1px solid ${active ? 'transparent' : 'var(--color-border)'}`,
                  color: active ? 'white' : 'var(--color-text-primary)',
                  minWidth: 120,
                }}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs mt-0.5" style={{ color: active ? 'rgba(255,255,255,0.75)' : 'var(--color-text-tertiary)' }}>
                  {desc}
                </span>
              </button>
            )
          })}
        </div>
        {filter !== 'tous' && filter !== defaultFilter && (
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Ton profil réel est <strong>{defaultFilter}</strong> —{' '}
            <button type="button" onClick={() => setFilter(defaultFilter)}
              className="underline" style={{ color: 'var(--color-accent)' }}>
              revenir à mon profil
            </button>
          </p>
        )}
      </div>

      {/* Sections filtrées */}
      {show('debut')     && <ParOuCommencerSection />}
      {show('statuts')   && <StatutsSection />}
      {show('planning')  && <PlanningSection />}
      {show('missions')  && <MissionClientSection />}
      {show('visite')    && <VisitePreliminaireSection />}
      {show('bilan24h')  && <Bilan24hSection />}
      {show('materiel')  && <MaterielSection />}
      {show('metrologie')&& <MetrologieSection />}
      {show('dashboard') && <DashboardSection />}
      {show('signaler')  && <SignalerProblemeSection />}

    </div>
  )
}
