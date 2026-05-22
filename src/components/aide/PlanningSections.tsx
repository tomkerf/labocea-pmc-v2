import { CalendarDays, CheckCircle2, XCircle, MousePointer2, AlertTriangle, Droplets } from 'lucide-react'
import { Section, Step, Divider, Tip, Note } from './AideComponents'

export function PlanningSection() {
  return (
    <Section icon={CalendarDays} title="Le Planning au quotidien">
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Le Planning regroupe tous les prélèvements, maintenances et événements de l'équipe sur un calendrier commun.
      </p>

      <div className="flex flex-col gap-4">
        {/* Naviguer */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Naviguer
          </p>
          <div className="flex flex-col gap-3">
            <Step num={1}>
              Trois vues disponibles en haut à droite : <strong>Jour</strong>, <strong>Semaine</strong> (lun→ven) et <strong>Mois</strong>.
              Utilise les flèches ← → pour avancer ou reculer.
            </Step>
            <Step num={2}>
              Le <strong>mini-calendrier</strong> latéral (icône calendrier en haut) permet de sauter directement à une date.
              Il affiche trois mois consécutifs. La semaine ou le mois en cours est surligné en bleu.
            </Step>
          </div>
        </div>

        <Divider />

        {/* Valider une intervention */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Valider une intervention
          </p>
          <div className="flex flex-col gap-3">
            <Step num={3}>
              Clique sur une intervention dans le calendrier pour ouvrir sa fiche.
              Tu y retrouves le client, le site, la nature de l'eau, la méthode, et les coordonnées GPS si renseignées.
            </Step>
            <Step num={4}>
              <span>
                Après le prélèvement sur le terrain, passe le statut à{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                  <CheckCircle2 size={11} /> Réalisé
                </span>
                {' '}et saisis la date effective.
              </span>
            </Step>
            <Step num={5}>
              <span>
                Si l'intervention n'a pas pu être réalisée, passe à{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  <XCircle size={11} /> Non effectué
                </span>
                {' '}et saisis un motif.
              </span>
            </Step>
          </div>
        </div>

        <Divider />

        {/* Créer un événement */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Créer un événement personnel
          </p>
          <div className="flex flex-col gap-3">
            <Step num={6}>
              <span>
                En vue <strong>Semaine</strong> ou <strong>Mois</strong>, <strong>glisse sur une ou plusieurs cellules vides</strong> pour créer un événement.
                Une modale s'ouvre : tu peux saisir un titre, choisir le type
                (Congé/RTT, Rappel, Réunion, Rapport, Autre) et assigner un technicien.
              </span>
            </Step>
            <Step num={7}>
              Les <strong>congés/RTT</strong> apparaissent en overlay grisé sur les colonnes concernées, visibles par toute l'équipe.
              Les autres types (rappel, réunion, rapport) s'affichent comme des pills dans le jour.
            </Step>
          </div>
        </div>

        <Divider />

        {/* Filtres */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Filtres
          </p>
          <div className="flex flex-col gap-3">
            <Step num={8}>
              <span>
                En haut du Planning, deux filtres sont disponibles :{' '}
                <strong>par technicien</strong> (affiche uniquement ses interventions) et{' '}
                <strong>retards uniquement</strong> (masque tout sauf les prélèvements en retard).
                Utile pour faire le point en début de semaine.
              </span>
            </Step>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Tip icon={MousePointer2}>
          <span>
            <strong>Changer de technicien sur une seule intervention</strong> — dans la fiche intervention,
            appuie sur les initiales du technicien pour modifier l'assignation.
            Cela ne modifie que ce prélèvement, pas les autres de la même mission.
          </span>
        </Tip>
        <Tip icon={AlertTriangle}>
          <span>
            <strong>Analyses sous-traitées</strong> — si un plan a la case "Analyses" cochée,
            une icône ⚠️ s'affiche sur les prélèvements tombant la veille d'un jour férié.
            C'est un avertissement visuel uniquement, il ne bloque pas la saisie.
          </span>
        </Tip>
      </div>
    </Section>
  )
}

export function Bilan24hSection() {
  return (
    <Section icon={Droplets} title="Bilans 24h — prélèvements J1 et J2">
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Un bilan 24h génère deux interventions liées : la <strong>pose</strong> du préleveur automatique en J1
        et la <strong>récupération</strong> en J2.
      </p>

      <div className="flex flex-col gap-3 mb-4">
        <Step num={1}>
          <span>
            En vue <strong>Semaine</strong>, les bilans 24h apparaissent dans la <strong>bande en haut du calendrier</strong>,
            sous la forme d'une barre de J1 à J2 avec le badge{' '}
            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>J1→J2</span>.
          </span>
        </Step>
        <Step num={2}>
          <span>
            <strong>J1 — Pose :</strong> clique sur la barre pour ouvrir la fiche. Passe le statut à{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>Réalisé</span>{' '}
            en fin de journée.
          </span>
        </Step>
        <Step num={3}>
          <span>
            <strong>J2 — Récupération :</strong> retrouve le prélèvement J2 dans le jour suivant.
            Passe-le à{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>Réalisé</span>{' '}
            après récupération du flacon.
          </span>
        </Step>
        <Step num={4}>
          Le rapport est lié au prélèvement J1. C'est sur la fiche J1 que tu renseignes la date de rapport prévue.
        </Step>
      </div>

      <Note>
        Si J2 tombe un week-end (non affiché dans le planning lun→ven), retrouve la fiche depuis{' '}
        <span className="font-medium">Missions → Client → Plan</span>.
      </Note>
    </Section>
  )
}
