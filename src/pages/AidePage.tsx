// ============================================================
// AidePage — Mode d'emploi à destination des techniciens
// Sections : planifier une intervention, bilans 24h, statuts
// ============================================================

import { CalendarDays, CheckCircle2, Clock, XCircle, AlertTriangle, ChevronRight, Droplets, ClipboardList, FolderPlus, MapPin, FlaskConical } from 'lucide-react'

// ── Composants locaux ────────────────────────────────────────

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-xl p-6"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
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
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
        style={{ background: 'var(--color-accent)', color: 'white' }}
      >
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
    <div className="flex items-start gap-3 py-3"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
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

// ── Page principale ──────────────────────────────────────────

export default function AidePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* En-tête */}
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Mode d'emploi
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Guide à destination des techniciens — planification des interventions.
        </p>
      </div>

      {/* ── 0. Créer une mission ── */}
      <Section icon={FolderPlus} title="Créer une mission client">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Une mission regroupe un client, ses sites de prélèvement et ses plans d'échantillonnage.
          Voici comment en créer une de A à Z.
        </p>

        <div className="flex flex-col gap-4 mb-4">

          {/* Bloc : Nouveau client */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Étape 1 — Créer le client
            </p>
            <div className="flex flex-col gap-3">
              <Step num={1}>
                <span>Va sur la page <strong>Missions</strong> et clique sur <strong>+ Nouveau client</strong> (bouton en haut à droite).</span>
              </Step>
              <Step num={2}>
                <span>
                  Remplis la fiche client : <strong>nom</strong>, <strong>interlocuteur</strong>, <strong>segment</strong> (AEP, Eaux usées, Réseaux de mesure…),
                  <strong> technicien assigné</strong> (initiales), <strong>numéro de devis</strong> et <strong>sites</strong> concernés.
                  Les champs sont sauvegardés automatiquement à chaque modification.
                </span>
              </Step>
            </div>
          </div>

          {/* Séparateur */}
          <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} />

          {/* Bloc : Nouveau plan */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Étape 2 — Créer un plan de prélèvement
            </p>
            <div className="flex flex-col gap-3">
              <Step num={3}>
                <span>
                  Dans la fiche client, clique sur <strong>+ Nouveau plan</strong>. Un plan correspond à un site
                  et une fréquence d'intervention (mensuel, trimestriel, semestriel, annuel…).
                </span>
              </Step>
              <Step num={4}>
                <span>
                  Renseigne les paramètres du plan : <strong>nom du site</strong>, <strong>fréquence</strong>,
                  <strong> nature de l'eau</strong> (AEP, Rivière, Eau usée…), <strong>méthode</strong> (ponctuel, composite, automatique)
                  et <strong>conditions météo</strong> (temps de pluie si applicable).
                </span>
              </Step>
              <Step num={5}>
                <span>
                  Saisis les <strong>coordonnées GPS</strong> du point de prélèvement si disponibles
                  (latitude / longitude). Une case à cocher indique si les coordonnées sont approximatives.
                  Ces informations s'affichent ensuite dans la fiche d'intervention sur le terrain.
                </span>
              </Step>
              <Step num={6}>
                <span>
                  L'application <strong>génère automatiquement le calendrier des prélèvements</strong> pour l'année
                  en cours selon la fréquence choisie. Chaque prélèvement est créé avec le statut{' '}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                    Planifié
                  </span>.
                </span>
              </Step>
            </div>
          </div>

          {/* Séparateur */}
          <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} />

          {/* Bloc : Personnalisation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              Étape 3 — Ajuster les points du calendrier
            </p>
            <div className="flex flex-col gap-3">
              <Step num={7}>
                <span>
                  Dans la fiche plan, tu vois le calendrier annuel avec chaque prélèvement représenté par une <strong>pill</strong>.
                  Clique sur une pill pour ouvrir sa fiche et modifier le jour prévu, le statut ou ajouter un commentaire.
                </span>
              </Step>
              <Step num={8}>
                <span>
                  Pour les plans <strong>trimestriels</strong> ou <strong>bimestriels</strong>, tu peux choisir les mois actifs
                  (ex : janvier, avril, juillet, octobre) et définir un jour différent par mois si nécessaire.
                </span>
              </Step>
              <Step num={9}>
                <span>
                  Tu peux <strong>déplacer un prélèvement</strong> vers un autre jour depuis la vue Planning
                  (glisser-déposer la pill). Le changement est sauvegardé immédiatement.
                </span>
              </Step>
            </div>
          </div>
        </div>

        {/* Astuce GPS */}
        <div className="flex gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: 'var(--color-accent-light)' }}>
          <MapPin size={15} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <strong>Plusieurs sites pour un même client</strong> — crée un plan par site.
            Chaque plan a sa propre fréquence, ses propres coordonnées GPS et son calendrier indépendant.
          </p>
        </div>
      </Section>

      {/* ── 1. Planifier une intervention ── */}
      <Section icon={CalendarDays} title="Planifier une intervention">
        <div className="flex flex-col gap-3 mb-4">
          <Step num={1}>
            <span>Va sur la page <strong>Planning</strong> (icône calendrier dans la navigation).</span>
          </Step>
          <Step num={2}>
            Les interventions planifiées par le chargé de mission apparaissent dans le calendrier.
            En vue <strong>Semaine</strong>, chaque colonne correspond à un jour (lundi → vendredi).
            En vue <strong>Mois</strong>, chaque case affiche le nombre d'interventions du jour.
          </Step>
          <Step num={3}>
            <span>
              Clique sur une intervention pour ouvrir sa fiche. Tu y retrouves le client, le site,
              la nature de l'eau, la méthode, et les informations GPS si disponibles.
            </span>
          </Step>
          <Step num={4}>
            <span>
              Après l'intervention sur le terrain, ouvre la fiche et passe le statut à{' '}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                <CheckCircle2 size={11} /> Réalisé
              </span>
              {' '}en saisissant la date effective du prélèvement.
            </span>
          </Step>
          <Step num={5}>
            <span>
              Si l'intervention n'a pas pu être réalisée, passe le statut à{' '}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                <XCircle size={11} /> Non effectué
              </span>
              {' '}et saisis un <strong>motif</strong> (accès impossible, conditions météo, report client…).
            </span>
          </Step>
        </div>

        {/* Astuce : changer de technicien */}
        <div className="flex gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: 'var(--color-accent-light)' }}>
          <ChevronRight size={15} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <strong>Changer de technicien sur une seule intervention</strong> — dans la fiche intervention du Planning,
            appuie sur les initiales du technicien pour modifier l'assignation.
            Cela ne modifie que ce prélèvement, pas les autres de la même mission.
          </p>
        </div>
      </Section>

      {/* ── 2. Bilans 24h ── */}
      <Section icon={Droplets} title="Bilans 24h — prélèvements J1 et J2">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Un bilan 24h génère deux interventions liées : la pose du préleveur automatique en J1
          et la récupération en J2 (lendemain ou surlendemain).
        </p>

        <div className="flex flex-col gap-3 mb-4">
          <Step num={1}>
            <span>
              Dans le Planning (vue Semaine), les bilans 24h apparaissent dans la{' '}
              <strong>bande en haut du calendrier</strong> sous la forme d'une barre qui s'étire de J1 à J2,
              avec le badge <span className="px-1.5 py-0.5 rounded text-[11px] font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>J1→J2</span>.
            </span>
          </Step>
          <Step num={2}>
            <span>
              <strong>J1 — Pose du préleveur</strong> : clique sur la barre pour ouvrir la fiche J1.
              Saisis l'heure de pose, vérifie les paramètres du préleveur.
              Passe le statut à <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>Réalisé</span> en fin de journée.
            </span>
          </Step>
          <Step num={3}>
            <span>
              <strong>J2 — Récupération</strong> : retrouve le prélèvement J2 dans le jour suivant du Planning.
              Passe-le à <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>Réalisé</span> après récupération du flacon.
            </span>
          </Step>
          <Step num={4}>
            <span>
              Le rapport est lié au prélèvement J1. C'est sur la fiche J1 que tu renseignes
              la date de rapport prévue.
            </span>
          </Step>
        </div>

        <Note>
          Si J2 tombe un week-end non affiché dans le planning, retrouve la fiche depuis la page{' '}
          <span className="font-medium">Missions → Client → Plan</span>.
        </Note>
      </Section>

      {/* ── 3. Statuts & motifs ── */}
      <Section icon={ClipboardList} title="Statuts des prélèvements">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Chaque prélèvement passe par un cycle de statuts. Voici leur signification :
        </p>

        <div className="flex flex-col">
          <StatusBadge
            bg="var(--color-bg-tertiary)"
            color="var(--color-text-secondary)"
            dot="var(--color-neutral)"
            label="Planifié"
            desc="L'intervention est programmée mais pas encore réalisée. Statut par défaut à la création du plan."
          />
          <StatusBadge
            bg="var(--color-success-light)"
            color="var(--color-success)"
            dot="var(--color-success)"
            label="Réalisé"
            desc="Le prélèvement a été effectué. La date de réalisation est enregistrée."
          />
          <StatusBadge
            bg="var(--color-danger-light)"
            color="var(--color-danger)"
            dot="var(--color-danger)"
            label="En retard"
            desc="La date planifiée est dépassée et le prélèvement n'a pas été validé. L'app le détecte automatiquement chaque jour."
          />
          <div className="py-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 mb-2"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-warning)' }} />
              Non effectué
            </span>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Le prélèvement n'a pas pu être réalisé et ne sera pas rattrapé. Un{' '}
              <strong>motif obligatoire</strong> doit être saisi : accès impossible,
              conditions météo défavorables, report à la demande du client, panne matériel…
            </p>
            <div className="mt-2 flex items-start gap-2">
              <Clock size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Différence avec «&nbsp;En retard&nbsp;» : un prélèvement en retard peut encore être réalisé
                (ex : intervention décalée de quelques jours). «&nbsp;Non effectué&nbsp;» est définitif
                et archive l'intervention avec son motif.
              </p>
            </div>
          </div>
        </div>

        <Note>
          Le motif de non-réalisation est tracé dans l'historique du prélèvement et visible
          par le chargé de mission lors de la préparation des rapports clients.
        </Note>
      </Section>

      {/* ── 4. Analyses sous-traitées ── */}
      <Section icon={FlaskConical} title="Analyses sous-traitées — contrainte jours fériés">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Certains plans (ex : RSDE, CORPEP) sont analysés par un laboratoire externe.
          Le transport prend 24h — un prélèvement la veille d'un jour férié ne respecterait pas
          le délai légal d'analyse.
        </p>

        <div className="flex flex-col gap-3 mb-4">
          <Step num={1}>
            <span>
              Dans la fiche plan (<strong>Missions → Client → Plan</strong>), descends jusqu'à la section{' '}
              <strong>Configuration</strong>. La case <strong>Analyses</strong> est en bas, après "Conditions météo".
              Coche-la pour les plans dont les analyses sont sous-traitées.
            </span>
          </Step>
          <Step num={2}>
            <span>
              Une fois cochée, l'app détecte automatiquement quand un prélèvement de ce plan
              tombe <strong>la veille d'un jour férié français</strong> (Pâques, Ascension, 14 juillet, Noël…).
            </span>
          </Step>
          <Step num={3}>
            <span>
              Dans le Planning (vue Semaine ou Mois), ces prélèvements affichent une icône{' '}
              <span className="font-semibold">⚠️</span> sur la pill, avec le tooltip{' '}
              <em>"Analyses sous-traitées — veille de [nom du jour férié]"</em>.
              Dans le panneau latéral <strong>À planifier</strong>, un badge orange{' '}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                ⚠️ Veille de férié
              </span>{' '}
              s'affiche également.
            </span>
          </Step>
        </div>

        {/* Astuce */}
        <div className="flex gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: 'var(--color-accent-light)' }}>
          <ChevronRight size={15} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <strong>L'icône ⚠️ ne bloque pas le prélèvement</strong> — c'est un avertissement visuel.
            Si tu dois quand même prélever ce jour-là (accords spécifiques avec le labo sous-traitant),
            tu peux l'ignorer. Pense à le noter dans le commentaire du prélèvement.
          </p>
        </div>
      </Section>

    </div>
  )
}
