// ============================================================
// AidePage — Mode d'emploi à destination des techniciens
// Sections : planifier une intervention, bilans 24h, statuts
// ============================================================

import { CalendarDays, CheckCircle2, Clock, XCircle, AlertTriangle, ChevronRight, Droplets, ClipboardList } from 'lucide-react'

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

    </div>
  )
}
