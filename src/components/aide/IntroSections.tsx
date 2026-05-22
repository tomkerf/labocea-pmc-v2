import { LogIn, User, ClipboardList, Clock } from 'lucide-react'
import { Section, Step, Divider, Tip, StatusBadge, Note } from './AideComponents'

export function ParOuCommencerSection() {
  return (
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
              Si c'est ta première connexion, pense à changer ton mot de passe depuis <strong>Mon compte → Changer le mot de passe</strong>.
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
  )
}

export function StatutsSection() {
  return (
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
  )
}
