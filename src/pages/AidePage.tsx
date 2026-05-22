import { ParOuCommencerSection, StatutsSection } from '@/components/aide/IntroSections'
import { PlanningSection, Bilan24hSection } from '@/components/aide/PlanningSections'
import { MissionClientSection } from '@/components/aide/MissionsSections'
import { MaterielSection, MetrologieSection } from '@/components/aide/MaterielSections'
import { DashboardSection, SignalerProblemeSection } from '@/components/aide/DashboardSections'

export default function AidePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* En-tête */}
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Mode d'emploi
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          L'app couvre six modules : <strong>Missions</strong> (clients et plans de prélèvement),
          <strong> Planning</strong> (calendrier de l'équipe), <strong>Matériel</strong> (parc équipements),
          <strong> Métrologie</strong> (vérifications instruments), <strong>Maintenances</strong> (interventions)
          et <strong>Dashboard</strong> (vue synthétique du jour). Tout est sauvegardé automatiquement.
        </p>
      </div>

      {/* Sections du mode d'emploi */}
      <ParOuCommencerSection />
      <StatutsSection />
      <PlanningSection />
      <MissionClientSection />
      <Bilan24hSection />
      <MaterielSection />
      <MetrologieSection />
      <DashboardSection />
      <SignalerProblemeSection />

    </div>
  )
}
