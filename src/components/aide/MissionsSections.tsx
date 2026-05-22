import { FolderPlus, MapPin, Camera } from 'lucide-react'
import { Section, Step, Divider, Tip } from './AideComponents'

export function MissionClientSection() {
  return (
    <Section icon={FolderPlus} title="Créer une mission client">
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Une mission regroupe un client, ses sites de prélèvement et ses plans d'échantillonnage.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Étape 1 — Créer le client
          </p>
          <div className="flex flex-col gap-3">
            <Step num={1}>
              Va sur <strong>Missions</strong> et clique sur <strong>+ Nouveau client</strong>.
            </Step>
            <Step num={2}>
              Remplis la fiche : <strong>nom</strong>, <strong>interlocuteur</strong>, <strong>segment</strong> (AEP, Eaux usées, Réseaux de mesure…),
              <strong> technicien assigné</strong>, <strong>numéro de devis</strong> et <strong>sites</strong>.
              Tout est sauvegardé automatiquement.
            </Step>
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Étape 2 — Créer un plan de prélèvement
          </p>
          <div className="flex flex-col gap-3">
            <Step num={3}>
              Dans la fiche client, clique sur <strong>+ Nouveau plan</strong>.
              Un plan = un site + une fréquence d'intervention.
            </Step>
            <Step num={4}>
              Renseigne : <strong>nom du site</strong>, <strong>fréquence</strong> (mensuel, trimestriel, semestriel, annuel…),
              <strong> nature de l'eau</strong>, <strong>méthode</strong> (ponctuel, composite, automatique)
              et <strong>conditions météo</strong> si applicable.
            </Step>
            <Step num={5}>
              Saisis les <strong>coordonnées GPS</strong> du point de prélèvement si disponibles.
              Elles s'affichent dans la fiche d'intervention sur le terrain.
            </Step>
            <Step num={6}>
              L'app <strong>génère automatiquement le calendrier annuel</strong> selon la fréquence choisie.
              Chaque prélèvement est créé avec le statut Planifié.
            </Step>
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Étape 3 — Ajuster le calendrier
          </p>
          <div className="flex flex-col gap-3">
            <Step num={7}>
              Dans la fiche plan, clique sur une pill pour modifier le jour prévu, le statut ou ajouter un commentaire.
            </Step>
            <Step num={8}>
              Pour les plans <strong>trimestriels</strong> ou <strong>bimestriels</strong>, tu peux choisir les mois actifs
              et définir un jour différent par mois si nécessaire.
            </Step>
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Étape 4 — Suivi des rapports
          </p>
          <div className="flex flex-col gap-3">
            <Step num={9}>
              Sur la fiche d'un prélèvement, coche <strong>Rapport prévu</strong> pour indiquer qu'un rapport
              doit être envoyé au client. Saisis la date prévue d'envoi.
            </Step>
            <Step num={10}>
              Une fois le rapport envoyé, renseigne la <strong>date d'envoi effective</strong>.
              Le badge passe de orange (prévu) à vert (envoyé) dans le planning.
            </Step>
            <Step num={11}>
              Le <strong>Dashboard</strong> affiche un bloc "Rapports à envoyer" avec tous les rapports
              prévus mais non encore envoyés, triés par date.
            </Step>
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Archiver ou supprimer un client
          </p>
          <div className="flex flex-col gap-3">
            <Step num={12}>
              Dans la fiche client, le bouton <strong>Supprimer</strong> est accessible en bas de page.
              Une confirmation en deux étapes est demandée avant toute suppression définitive.
            </Step>
            <Step num={13}>
              La suppression est <strong>irréversible</strong> et efface tous les plans et prélèvements associés.
              Si la mission est terminée mais que tu veux garder l'historique, modifie plutôt le statut
              du client ou laisse-le inactif dans la liste.
            </Step>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Tip icon={MapPin}>
          <span>
            <strong>Plusieurs sites pour un même client</strong> — crée un plan par site.
            Chaque plan a sa propre fréquence, ses coordonnées GPS et son calendrier indépendant.
          </span>
        </Tip>
        <Tip icon={Camera}>
          <span>
            <strong>Photos terrain</strong> — dans la fiche d'un prélèvement (Missions → Client → Plan),
            tu peux joindre des photos prises sur le terrain directement depuis le téléphone.
            Elles sont stockées et consultables depuis n'importe quel appareil.
          </span>
        </Tip>
      </div>
    </Section>
  )
}
