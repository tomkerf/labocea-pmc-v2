import { LayoutDashboard, ChevronRight, Bug } from 'lucide-react'
import { Section, Step, Tip } from './AideComponents'
import { COLORS } from '@/lib/constants'


export function DashboardSection() {
  return (
    <Section icon={LayoutDashboard} title="Le tableau de bord">
      <p className="text-sm mb-4" style={{ color: COLORS.TEXT_SECONDARY }}>
        Le tableau de bord est la première page que tu vois en ouvrant l'app.
        Il synthétise l'essentiel de la journée en un seul écran.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Ce que tu y trouves
          </p>
          <div className="flex flex-col gap-3">
            <Step num={1}>
              <strong>4 indicateurs clés</strong> en haut : missions réalisées ce mois,
              rapports à rédiger, conformité métrologique (%), et équipements à calibrer dans les 30 jours.
            </Step>
            <Step num={2}>
              <strong>Planning du jour</strong> — interventions prévues aujourd'hui (et demain en basculant),
              avec statut et lien vers la fiche mission. Un badge météo s'affiche si des prélèvements pluie sont au programme.
              L'icône <strong>appareil photo</strong> sur une ligne rattache directement une photo au prélèvement.
            </Step>
            <Step num={3}>
              <strong>🚙 Mode Tournée du Jour</strong> — le gros bouton bleu sous le planning du jour.
              C'est le chemin le plus rapide pour valider tes prélèvements sur le terrain.
            </Step>
            <Step num={4}>
              <strong>Rapports à rédiger</strong> — liste des rapports prévus non encore envoyés, triés par date.
              Clique sur "Marqué envoyé" pour valider directement depuis le dashboard.
            </Step>
            <Step num={5}>
              Puis, en dessous : <strong>Actualités</strong>, <strong>Tâches</strong>,{' '}
              <strong>Prélèvements en retard</strong>, <strong>Temps de pluie</strong>,{' '}
              <strong>Maintenances</strong> et <strong>Métrologie</strong>.
            </Step>
            <Step num={6}>
              Si tu es <strong>chargé de mission</strong> ou <strong>admin</strong>, un onglet en haut bascule
              entre la vue <strong>Technicien</strong> (ci-dessus) et la vue <strong>Manager</strong> (suivi de l'équipe).
            </Step>
          </div>
        </div>
      </div>

      <Tip icon={ChevronRight}>
        <span>
          <strong>Prélèvements en retard</strong> — un bloc dédié s'affiche si des prélèvements
          sont passés sans être validés. Clique sur chacun pour accéder directement à la fiche
          et régulariser le statut.
        </span>
      </Tip>
    </Section>
  )
}

export function SignalerProblemeSection() {
  return (
    <Section icon={Bug} title="Signaler un problème">
      <div className="flex flex-col gap-3">
        <Step num={1}>
          En bas de la barre de navigation à gauche, clique sur <strong>Signaler un problème</strong>.
        </Step>
        <Step num={2}>
          Décris ce qui ne fonctionne pas. La page où tu te trouves est jointe automatiquement.
        </Step>
        <Step num={3}>
          Clique sur <strong>Envoyer</strong>. Le signalement est transmis immédiatement à l'administrateur,
          visible dans la page <strong>Admin → Problèmes signalés</strong>.
        </Step>
      </div>
    </Section>
  )
}
