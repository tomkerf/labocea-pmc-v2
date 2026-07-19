import { CalendarDays, CheckCircle2, XCircle, MousePointer2, AlertTriangle, Droplets, Camera } from 'lucide-react'
import { Section, Step, Divider, Tip, Note } from './AideComponents'
import { COLORS } from '@/lib/constants'


export function PlanningSection() {
  return (
    <Section icon={CalendarDays} title="Le Planning au quotidien">
      <p className="text-sm mb-4" style={{ color: COLORS.TEXT_SECONDARY }}>
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
              Trois vues en haut à droite : <strong>Jour</strong>, <strong>Semaine</strong> (lundi→dimanche) et <strong>Mois</strong>.
              Le bouton <strong>Carte</strong> (à gauche des vues) bascule vers la vue géographique des points de prélèvement.
              Utilise les flèches ← → pour avancer ou reculer.
              <br />
              <span className="text-xs mt-1 block" style={{ color: 'var(--color-text-tertiary)' }}>
                La matrice annuelle n'est plus dans le Planning : elle se trouve dans <strong>Missions → Vue annuelle</strong>.
              </span>
            </Step>
            <Step num={2}>
              Le <strong>mini-calendrier</strong> (icône calendrier en haut) permet de sauter directement à une date.
              La semaine ou le mois en cours est surligné en bleu.
            </Step>
          </div>
        </div>

        <Divider />

        {/* Valider une intervention */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Agir sur une intervention
          </p>
          <div className="flex flex-col gap-3">
            <Step num={3}>
              Clique sur une intervention dans le calendrier : une <strong>modale d'actions rapides</strong> s'ouvre.
              Elle affiche le client, le site, le statut, le technicien assigné, l'horaire et le badge temps de pluie.
            </Step>
            <Step num={4}>
              <span>
                Depuis cette modale tu peux <strong>déplacer à une autre date</strong> (avec motif, tracé dans l'historique),{' '}
                <strong>changer le technicien</strong>, <strong>assigner du matériel</strong> (bilans 24h uniquement)
                et <strong>retirer du calendrier</strong>.
              </span>
            </Step>
            <Step num={5}>
              <span>
                <strong>La validation ne se fait pas depuis cette modale.</strong> Le bouton bleu{' '}
                <strong>« Ouvrir la mission (valider/annuler) »</strong> t'emmène sur la fiche du prélèvement,
                où tu choisis le statut, la date réalisée et l'auteur. Voir la section{' '}
                <strong>Valider un prélèvement</strong> ci-dessous.
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
                Une modale s'ouvre : titre, type (Rappel, Réunion, Rapport, Congé/RTT, Autre), dates de début et de fin,
                heure et notes. L'événement est créé à ton nom — il n'y a pas d'assignation à un autre technicien.
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
                Sous la barre de navigation : le filtre <strong>agence</strong> (Brest / Quimper — visible seulement
                si l'équipe compte plusieurs sites) et le filtre <strong>technicien</strong> (clique sur un avatar
                pour n'afficher que ses interventions, reclique pour l'enlever). Les deux sont mémorisés d'une session à l'autre.
              </span>
            </Step>
            <Step num={9}>
              <span>
                Le toggle <strong>🌧 temps de pluie</strong> se trouve dans la barre du haut, à côté du bouton Carte.
                Le menu <strong>⋯</strong> donne accès à la feuille de route PDF, à l'export Excel et au bilan du mois.
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

export function ValidationSection() {
  return (
    <Section icon={CheckCircle2} title="Valider un prélèvement">
      <p className="text-sm mb-4" style={{ color: COLORS.TEXT_SECONDARY }}>
        C'est le geste central de l'app. Deux chemins possibles : le <strong>Mode Tournée</strong> sur le terrain
        (rapide, pensé pour le téléphone) ou la <strong>fiche du prélèvement</strong> (complète, pour corriger ou compléter).
      </p>

      <div className="flex flex-col gap-4">
        {/* Mode Tournée */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Chemin 1 — Mode Tournée du jour (recommandé sur le terrain)
          </p>
          <div className="flex flex-col gap-3">
            <Step num={1}>
              Depuis le <strong>Dashboard</strong>, sous le planning du jour, appuie sur le bouton bleu{' '}
              <strong>🚙 Mode Tournée du Jour</strong>. Tu obtiens la liste de tes prélèvements du jour, un par carte.
            </Step>
            <Step num={2}>
              <span>
                Chaque carte propose trois actions :{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-success-light)', color: 'var(--color-success-text)' }}>
                  <CheckCircle2 size={11} /> Réalisé
                </span>{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }}>
                  <XCircle size={11} /> Non effectué
                </span>{' '}
                et <strong>Décaler</strong> (icône calendrier). Plus deux raccourcis : l'œil ouvre la{' '}
                <strong>fiche du point</strong> (consignes, historique, photos) et l'épingle lance l'itinéraire GPS.
              </span>
            </Step>
            <Step num={3}>
              <span>
                Une <strong>modale de saisie rapide</strong> s'ouvre selon l'action :
              </span>
              <div className="mt-2 flex flex-col gap-1.5 text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                <div><strong style={{ color: COLORS.SUCCESS }}>Réalisé</strong> — date réalisée (aujourd'hui par défaut),
                  case « Rapport d'intervention prévu », nappe haute/basse si eau souterraine, commentaire libre.</div>
                <div><strong style={{ color: COLORS.WARNING }}>Non effectué</strong> — <strong>motif obligatoire</strong>,
                  la validation est bloquée sans lui.</div>
                <div><strong>Décaler</strong> — nouvelle date obligatoire. Le prélèvement repasse en <strong>Planifié</strong>
                  à cette date, il n'est pas perdu.</div>
              </div>
            </Step>
            <Step num={4}>
              Appuie sur <strong>Valider</strong>. L'enregistrement part immédiatement ; si le réseau manque,
              il repart automatiquement dès que tu retrouves du signal.
            </Step>
            <Step num={5}>
              Quand toutes les cartes sont traitées, un <strong>écran de fin</strong> récapitule ta tournée.
            </Step>
          </div>
        </div>

        <Divider />

        {/* Fiche prélèvement */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Chemin 2 — La fiche mission (depuis le Planning)
          </p>
          <div className="flex flex-col gap-3">
            <Step num={6}>
              Depuis le <strong>Planning</strong>, clique sur l'intervention puis sur le bouton bleu{' '}
              <strong>« Ouvrir la mission (valider/annuler) »</strong>.
            </Step>
            <Step num={7}>
              <span>
                Trois boutons en bas d'écran : <strong>Terminer la mission</strong> — un seul appui, le prélèvement
                passe en <strong>Réalisé</strong> à la date du jour et à ton nom, sans autre saisie —{' '}
                <strong>Décaler</strong> et <strong>Non effectué</strong> (mêmes modales que la tournée).
              </span>
            </Step>
            <Step num={8}>
              Une fois réalisé, la fiche affiche un bandeau vert <strong>Mission réalisée</strong> et les boutons
              d'action disparaissent. Pour corriger après coup, passe par le chemin 3.
            </Step>
          </div>
        </div>

        <Divider />

        {/* Fiche plan */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Chemin 3 — La fiche du plan (saisie complète et corrections)
          </p>
          <div className="flex flex-col gap-3">
            <Step num={9}>
              Va dans <strong>Missions → Client → Plan</strong> et clique sur la ligne du prélèvement pour la déplier.
              C'est le seul endroit où l'on peut <strong>revenir sur un prélèvement déjà validé</strong>.
            </Step>
            <Step num={10}>
              Le menu <strong>Statut</strong> propose les quatre statuts : Planifié, Réalisé, En retard, Non effectué.
              Renseigne ensuite la <strong>date réalisée</strong> et <strong>Effectué par</strong>.
            </Step>
            <Step num={11}>
              En <strong>Non effectué</strong> ou <strong>En retard</strong>, un champ <strong>Motif</strong> apparaît.
              C'est lui que le chargé de mission lira au moment de préparer le rapport client.
            </Step>
            <Step num={12}>
              Cette fiche permet aussi ce que les deux autres chemins ne permettent pas : <strong>checklist</strong>,{' '}
              <strong>photos terrain</strong> et suivi du <strong>rapport</strong> (prévu / date prévue / date d'envoi).
            </Step>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Tip icon={Camera}>
          <span>
            <strong>Photo en un geste</strong> — sur le planning du jour du Dashboard, l'icône appareil photo
            sur une ligne de prélèvement ouvre directement la caméra et rattache la photo au prélèvement.
          </span>
        </Tip>
        <Note>
          <strong>« Retirer du calendrier » n'est pas « Non effectué ».</strong> Retirer sort le prélèvement
          du calendrier en lui laissant une date à redéfinir (le motif y est optionnel) : il reste à replanifier.
          « Non effectué » clôt l'intervention avec son motif obligatoire.
        </Note>
      </div>
    </Section>
  )
}

export function Bilan24hSection() {
  return (
    <Section icon={Droplets} title="Bilans 24h — prélèvements J1 et J2">
      <p className="text-sm mb-4" style={{ color: COLORS.TEXT_SECONDARY }}>
        Un bilan 24h génère deux interventions liées : la <strong>pose</strong> du préleveur automatique en J1
        et la <strong>récupération</strong> en J2.
      </p>

      <div className="flex flex-col gap-3 mb-4">
        <Step num={1}>
          <span>
            En vue <strong>Semaine</strong>, les bilans 24h apparaissent dans la <strong>bande en haut du calendrier</strong>,
            sous la forme d'une barre de J1 à J2 avec le badge{' '}
            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>J1→J2</span>.
          </span>
        </Step>
        <Step num={2}>
          <span>
            <strong>J1 — Pose :</strong> clique sur la barre pour ouvrir la fiche. Passe le statut à{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-success-light)', color: COLORS.SUCCESS }}>Réalisé</span>{' '}
            en fin de journée.
          </span>
        </Step>
        <Step num={3}>
          <span>
            <strong>J2 — Récupération :</strong> retrouve le prélèvement J2 dans le jour suivant.
            Passe-le à{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-success-light)', color: COLORS.SUCCESS }}>Réalisé</span>{' '}
            après récupération du flacon.
          </span>
        </Step>
        <Step num={4}>
          Le rapport est lié au prélèvement J1. C'est sur la fiche J1 que tu renseignes la date de rapport prévue.
        </Step>
      </div>

      <Note>
        En mode Tournée, un bilan 24h en J1 ne propose pas le bouton <strong>Réalisé</strong> :
        seulement <strong>Décaler la mission</strong> ou <strong>Non effectué</strong>.
        La validation du J1 se fait depuis la fiche du prélèvement. Attention : décaler le J1 ne décale pas
        automatiquement le J2 — pense à le repositionner aussi.
      </Note>
    </Section>
  )
}
