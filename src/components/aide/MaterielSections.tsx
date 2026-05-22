import { Wrench, FlaskConical, Filter } from 'lucide-react'
import { Section, Step, Divider, Tip } from './AideComponents'

export function MaterielSection() {
  return (
    <Section icon={Wrench} title="Matériel — parc équipements">
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        La page <strong>Matériel</strong> liste tous les équipements terrain (multiparamètres, turbidimètres, préleveurs automatiques, débitmètres…).
      </p>

      <div className="flex flex-col gap-3 mb-4">
        <Step num={1}>
          Chaque équipement affiche son état (<strong>Opérationnel</strong>, <strong>En maintenance</strong>,
          <strong> Hors service</strong>, <strong>Prêté</strong>) et un <strong>anneau de progression</strong>
          indiquant le temps restant avant le prochain étalonnage.
          <br />
          <span className="text-xs mt-1 block" style={{ color: 'var(--color-text-tertiary)' }}>
            Vert = étalonnage récent · Orange = à surveiller · Rouge = urgent
          </span>
        </Step>
        <Step num={2}>
          Clique sur un équipement pour accéder à sa fiche complète : informations techniques,
          historique des vérifications métrologiques et des maintenances associées.
        </Step>
        <Step num={3}>
          Filtre par <strong>catégorie</strong> ou <strong>état</strong> pour trouver rapidement un équipement disponible.
        </Step>
        <Step num={4}>
          Pour modifier un équipement, clique sur sa fiche et édite directement les champs.
          La <strong>localisation</strong> (Labo, Terrain, Prêté à un tiers) se met à jour en temps réel
          pour toute l'équipe — utile pour savoir où se trouve un appareil avant de partir en mission.
        </Step>
        <Step num={5}>
          Pour <strong>supprimer un équipement</strong>, ouvre sa fiche et utilise le bouton Supprimer en bas de page.
          Une confirmation est demandée. L'historique des vérifications et maintenances associées est également supprimé.
        </Step>
      </div>

      <Tip>
        <span>
          <strong>Ajouter un équipement</strong> — bouton <strong>+ Ajouter</strong> en haut de la liste.
          Renseigne la marque, le modèle, le numéro de série et la date du prochain étalonnage.
        </span>
      </Tip>
    </Section>
  )
}

export function MetrologieSection() {
  return (
    <Section icon={FlaskConical} title="Métrologie et Maintenances">
      <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
        Deux modules distincts pour le suivi des instruments et des interventions techniques.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Métrologie
          </p>
          <div className="flex flex-col gap-3">
            <Step num={1}>
              La page <strong>Métrologie</strong> liste tous les équipements métrologique avec leur statut :
              <strong> À jour</strong>, <strong>À prévoir dans 30 jours</strong> ou <strong>En retard</strong>.
              Le calcul est automatique à partir de la date du prochain contrôle saisie sur chaque équipement.
            </Step>
            <Step num={2}>
              Pour saisir une vérification : clique sur <strong>+ Nouvelle vérification</strong>,
              sélectionne l'équipement, le type (étalonnage interne, vérification externe, contrôle terrain),
              le résultat (conforme / non conforme) et la date du prochain contrôle.
            </Step>
            <Step num={3}>
              La date du prochain contrôle est automatiquement mise à jour sur la fiche équipement après chaque saisie.
            </Step>
            <Step num={4}>
              Tu peux joindre un <strong>certificat PDF</strong> à chaque vérification (étalonnage externe COFRAC, etc.).
              Il est consultable depuis la fiche de vérification à tout moment.
            </Step>
            <Step num={5}>
              Utilise les <strong>filtres</strong> en haut du tableau pour afficher uniquement les équipements
              <strong> En retard</strong>, <strong>À prévoir</strong> ou <strong>À jour</strong>.
              Pratique pour préparer la semaine de vérifications.
            </Step>
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Maintenances
          </p>
          <div className="flex flex-col gap-3">
            <Step num={4}>
              La page <strong>Maintenances</strong> liste les interventions planifiées et correctives sur les équipements.
              Filtre par équipement, type (préventive / corrective) ou statut.
            </Step>
            <Step num={5}>
              Pour créer une maintenance : clique sur <strong>+ Nouvelle intervention</strong>.
              Renseigne l'équipement, le type, la date prévue, la description et le technicien responsable.
            </Step>
            <Step num={6}>
              Quand une maintenance est en cours, l'état de l'équipement passe automatiquement à{' '}
              <strong>En maintenance</strong>. Il repasse à <strong>Opérationnel</strong> à la clôture.
            </Step>
          </div>
        </div>
      </div>

      <Tip icon={Filter}>
        <span>
          <strong>Dashboard</strong> — la page d'accueil affiche en temps réel les équipements
          dont l'étalonnage est dû dans les 7 jours et les maintenances en attente, avec un lien direct vers chaque fiche.
        </span>
      </Tip>
    </Section>
  )
}
