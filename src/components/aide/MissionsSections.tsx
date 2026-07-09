import { FolderPlus, MapPin, Camera, Users, FileText } from 'lucide-react'
import { Section, Step, Divider, Tip, Note } from './AideComponents'
import { COLORS } from '@/lib/constants'


export function MissionClientSection() {
  return (
    <Section icon={FolderPlus} title="Créer une mission client">
      <p className="text-sm mb-4" style={{ color: COLORS.TEXT_SECONDARY }}>
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
              La fiche est organisée en 5 sections. Remplis dans l'ordre :
            </Step>
          </div>

          <div className="mt-3 ml-8 flex flex-col rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}>
            {[
              { label: 'Informations générales', desc: 'Nom, segment, type de demande, choix obligatoire du préleveur (technicien), année, sites.' },
              { label: 'Description de la mission', desc: 'Intitulé libre de la mission — visible dans les exports.' },
              { label: 'Contact', desc: 'Interlocuteur client, fonction, tél/email, contact prévenance, et le commercial interne Labocea (Céline, CRO, JBE…).' },
              { label: 'Contrat', desc: 'N° devis, convention, BC, durée, montants PMC/sous-traitance, mode facturation, situation administrative.' },
              { label: 'Détail analytique', desc: 'Répartition par type de prestation : MPR1, MPR2, MPR3, MPR5, MPR6 Q/T, Collecte, Boues, Débit…' },
            ].map(({ label, desc }, i, arr) => (
              <div key={label} className="flex gap-3 px-4 py-3"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <span className="text-xs font-semibold w-44 shrink-0 pt-0.5" style={{ color: COLORS.TEXT_PRIMARY }}>{label}</span>
                <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Sous-traitance des analyses
          </p>
          <div className="flex flex-col gap-3">
            <Step num={3}>
              Dans la section <strong>Contrat</strong>, coche <strong>Analyses sous-traitées</strong> si les analyses
              sont confiées à un laboratoire extérieur (Inovalys, Eurofins…). Un champ apparaît pour saisir le nom du sous-traitant.
            </Step>
            <Step num={4}>
              À ne pas confondre avec la <strong>Part sous-traitance (€)</strong> qui est un montant financier.
              La case "Analyses sous-traitées" concerne l'organisation terrain.
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
            <Step num={5}>
              Dans la fiche client, clique sur <strong>+ Nouveau plan</strong>.
              Un plan = un point de prélèvement + une fréquence.
            </Step>
            <Step num={6}>
              Renseigne : <strong>nom du site</strong>, <strong>fréquence</strong> (mensuel, trimestriel, semestriel, annuel…),
              <strong> nature de l'eau</strong>, <strong>méthode</strong> (ponctuel, composite, automatique),
              <strong> conditions météo</strong> et <strong>contraintes particulières</strong> si applicable.
            </Step>
            <Step num={7}>
              Coche <strong>COFRAC</strong> si le point est accrédité. Cette information apparaît dans les exports et sur la matrice annuelle.
            </Step>
            <Step num={8}>
              Saisis les <strong>coordonnées GPS</strong> du point si disponibles — elles s'affichent en fiche terrain.
            </Step>
            <Step num={9}>
              L'app <strong>génère automatiquement le calendrier annuel</strong> selon la fréquence. Chaque prélèvement est créé avec le statut Planifié.
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
            <Step num={10}>
              Dans la fiche plan, clique sur une pill pour modifier le jour prévu, le statut ou ajouter un commentaire.
            </Step>
            <Step num={11}>
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
            <Step num={12}>
              Sur la fiche d'un prélèvement, coche <strong>Rapport prévu</strong> et saisis la date prévue d'envoi.
            </Step>
            <Step num={13}>
              Une fois envoyé, renseigne la <strong>date d'envoi effective</strong>.
              Le badge passe de orange à vert dans le planning.
            </Step>
            <Step num={14}>
              Le <strong>Dashboard</strong> liste tous les rapports prévus non encore envoyés, triés par date.
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
            <Step num={15}>
              Le bouton <strong>Supprimer</strong> est en bas de la fiche client.
              Une confirmation en deux étapes est demandée. La suppression efface tous les plans et prélèvements associés — <strong>irréversible</strong>.
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
            <strong>Photos terrain</strong> — dans la fiche d'un prélèvement, tu peux joindre des photos
            prises depuis le téléphone. Elles sont consultables depuis n'importe quel appareil.
          </span>
        </Tip>
        <Tip icon={FileText}>
          <span>
            <strong>Matrice annuelle</strong> — depuis le Planning en vue Année, filtre par agence (Brest / Quimper)
            pour voir le planning de ton secteur en un coup d'œil.
          </span>
        </Tip>
      </div>
    </Section>
  )
}

export function VisitePreliminaireSection() {
  return (
    <Section icon={Users} title="Visites préliminaires">
      <p className="text-sm mb-4" style={{ color: COLORS.TEXT_SECONDARY }}>
        Consigne tes repérages sur le terrain avant de définir un plan de prélèvement.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Step num={1}>
            Rends-toi sur la fiche d'un <strong>Client</strong> (Missions) ou d'une <strong>Demande</strong>.
          </Step>
          <Step num={2}>
            Descends jusqu'à <strong>Visites préliminaires</strong> et clique sur <strong>Nouvelle</strong>.
          </Step>
          <Step num={3}>
            Renseigne tes notes générales et ajoute autant de <strong>points de prélèvement</strong> que nécessaire.
          </Step>
          <Step num={4}>
            Pour chaque point : type d'eau, méthode, faisabilité, consignes de sécurité, et <strong>photos</strong>.
          </Step>
          <Step num={5}>
            Une fois enregistrée, la visite peut être <strong>exportée en PDF</strong> via le bouton Exporter.
          </Step>
        </div>
      </div>

      <Note>
        Les visites préliminaires sont visibles uniquement par les chargés de mission et les admins.
      </Note>
    </Section>
  )
}
