import {
  CalendarDays, CheckCircle2, Clock, XCircle, AlertTriangle,
  ChevronRight, Droplets, ClipboardList, FolderPlus, MapPin,
  FlaskConical, Wrench, Camera, Filter, MousePointer2, Bug,
  LogIn, User, LayoutDashboard,
} from 'lucide-react'

// ── Composants locaux ────────────────────────────────────────

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl p-6"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-accent-light)' }}>
          <Icon size={18} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
        style={{ background: 'var(--color-accent)', color: 'white' }}>
        {num}
      </span>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
        {children}
      </p>
    </div>
  )
}

function StatusBadge({ bg, color, dot, label, desc }: {
  bg: string; color: string; dot: string; label: string; desc: string
}) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
        style={{ background: bg, color }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
        {label}
      </span>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 mt-4 px-3 py-2.5 rounded-lg"
      style={{ background: 'var(--color-warning-light)', border: '1px solid var(--color-warning)20' }}>
      <AlertTriangle size={15} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
      <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{children}</p>
    </div>
  )
}

function Tip({ icon: Icon = ChevronRight, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'var(--color-accent-light)' }}>
      <Icon size={15} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
      <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{children}</p>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} />
}

// ── Page principale ──────────────────────────────────────────

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

      {/* ── Par où commencer ── */}
      <Section icon={LogIn} title="Par où commencer">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Bienvenue sur Labocea PMC. Voici les trois étapes pour démarrer efficacement.
        </p>

        <div className="flex flex-col gap-4">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Première connexion
            </p>
            <div className="flex flex-col gap-3">
              <Step num={1}>
                Ouvre l'app et connecte-toi avec l'<strong>email et le mot de passe</strong> fournis par l'administrateur.
                Si c'est ta première connexion, pense à changer ton mot de passe depuis <strong>Mon compte</strong>.
              </Step>
              <Step num={2}>
                Tu arrives directement sur le <strong>tableau de bord</strong> — il affiche tes interventions du jour,
                les alertes actives et l'état du parc matériel.
              </Step>
            </div>
          </div>

          <Divider />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Configurer son profil
            </p>
            <div className="flex flex-col gap-3">
              <Step num={3}>
                Va dans <strong>Mon compte</strong> (icône en bas de la barre de navigation).
                Vérifie que tes <strong>initiales</strong> sont correctes — elles apparaissent sur tous tes prélèvements
                et dans le planning de l'équipe.
              </Step>
              <Step num={4}>
                Si tes initiales sont incorrectes, modifie-les et sauvegarde. Ce changement s'applique immédiatement
                à toutes tes futures interventions.
              </Step>
            </div>
          </div>

          <Divider />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Les 6 modules de l'app
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Dashboard', desc: "Vue synthétique du jour — interventions, alertes, état du matériel." },
                { label: 'Missions', desc: "Clients, plans de prélèvement et calendrier annuel par site." },
                { label: 'Planning', desc: "Calendrier commun de l'équipe — vue Jour, Semaine ou Mois." },
                { label: 'Matériel', desc: "Inventaire du parc terrain et suivi de l'état des équipements." },
                { label: 'Métrologie', desc: "Vérifications et étalonnages des instruments de mesure." },
                { label: 'Maintenances', desc: "Interventions préventives et correctives sur les équipements." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-3 py-2" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <span className="text-sm font-semibold w-28 shrink-0" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Routine quotidienne
            </p>
            <div className="flex flex-col gap-3">
              <Step num={5}>
                <strong>Le matin</strong> — ouvre le <strong>Dashboard</strong> pour voir les interventions du jour
                et les alertes en cours.
              </Step>
              <Step num={6}>
                <strong>Sur le terrain</strong> — ouvre le <strong>Planning</strong>, clique sur ton intervention,
                passe-la à <strong>Réalisé</strong> et saisis la date effective.
              </Step>
              <Step num={7}>
                <strong>Si quelque chose ne va pas</strong> — utilise <strong>Signaler un problème</strong>
                en bas de la navigation. L'administrateur est notifié immédiatement.
              </Step>
            </div>
          </div>

        </div>

        <Tip icon={User}>
          <span>
            <strong>Tout est sauvegardé automatiquement.</strong> Pas besoin de cliquer sur "Enregistrer" après chaque modification.
            Un indicateur discret en haut de page confirme la sauvegarde.
          </span>
        </Tip>
      </Section>

      {/* ── Statuts ── */}
      <Section icon={ClipboardList} title="Statuts des prélèvements">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Chaque prélèvement a un statut. Il évolue au fil de l'intervention.
        </p>

        <div className="flex flex-col">
          <StatusBadge
            bg="var(--color-bg-tertiary)" color="var(--color-text-secondary)" dot="var(--color-neutral)"
            label="Planifié"
            desc="Statut par défaut. L'intervention est programmée, pas encore réalisée."
          />
          <StatusBadge
            bg="var(--color-success-light)" color="var(--color-success)" dot="var(--color-success)"
            label="Réalisé"
            desc="Prélèvement effectué. La date de réalisation est enregistrée."
          />
          <StatusBadge
            bg="var(--color-danger-light)" color="var(--color-danger)" dot="var(--color-danger)"
            label="En retard"
            desc="La date planifiée est dépassée sans validation. L'app le détecte automatiquement chaque jour. Peut encore être réalisé."
          />
          <div className="py-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 mb-2"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-warning)' }} />
              Non effectué
            </span>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Intervention abandonnée définitivement. Un <strong>motif obligatoire</strong> doit être saisi :
              accès impossible, conditions météo, report client, panne matériel…
            </p>
            <div className="mt-2 flex items-start gap-2">
              <Clock size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                «&nbsp;En retard&nbsp;» peut encore être rattrapé. «&nbsp;Non effectué&nbsp;» est définitif et archive l'intervention avec son motif.
              </p>
            </div>
          </div>
        </div>

        <Note>
          Le motif de non-réalisation est visible par le chargé de mission lors de la préparation des rapports clients.
        </Note>
      </Section>

      {/* ── Planning ── */}
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

      {/* ── Créer une mission ── */}
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

      {/* ── Bilans 24h ── */}
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

      {/* ── Matériel ── */}
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

      {/* ── Métrologie & Maintenances ── */}
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

      {/* ── Dashboard ── */}
      <Section icon={LayoutDashboard} title="Le tableau de bord">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
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
                taux de conformité métrologique, alertes actives, et équipements à calibrer cette semaine.
              </Step>
              <Step num={2}>
                <strong>Planning du jour</strong> — liste chronologique des interventions prévues aujourd'hui,
                avec leur statut et un lien direct vers la fiche de chaque mission.
              </Step>
              <Step num={3}>
                <strong>État du matériel</strong> — graphique en donut avec le nombre d'équipements
                par état (opérationnel, à calibrer, en maintenance, hors service).
              </Step>
              <Step num={4}>
                <strong>Alertes</strong> — équipements dont l'étalonnage arrive à échéance dans les 7 jours
                et maintenances en attente. Chaque alerte est un lien cliquable vers la fiche concernée.
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

    </div>
  )
}
