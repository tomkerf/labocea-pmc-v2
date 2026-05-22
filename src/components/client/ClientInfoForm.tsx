import type { Client, SegmentType, NouvelleDemandeType } from '@/types'

const SEGMENTS: SegmentType[] = ['SRA', 'Réseau de mesure', 'RSDE']
const NOUVELLES_DEMANDES: NouvelleDemandeType[] = ['Annuelle', 'Avenant', 'Ponctuelle']

interface Props {
  client: Client
  sitesInput: string
  update: (field: keyof Client, value: unknown) => void
  onSitesChange: (raw: string) => void
}

export function ClientInfoForm({ client, sitesInput, update, onSitesChange }: Props) {
  return (
    <>
      <Section title="Informations générales">
        <Field label="Nom du client">
          <input value={client.nom} onChange={(e) => update('nom', e.target.value)}
            className="field-input" placeholder="Nom du client"
            style={!client.nom.trim() ? { borderColor: 'var(--color-danger)' } : undefined} />
          {!client.nom.trim() && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Le nom est obligatoire.</p>
          )}
        </Field>
        <Field label="Segment">
          <select value={client.segment} onChange={(e) => update('segment', e.target.value as SegmentType)}
            className="field-input">
            {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Type de demande">
          <select value={client.nouvelleDemande} onChange={(e) => update('nouvelleDemande', e.target.value as NouvelleDemandeType)}
            className="field-input">
            {NOUVELLES_DEMANDES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Préleveur (initiales)">
          <input value={client.preleveur} onChange={(e) => update('preleveur', e.target.value)}
            className="field-input" placeholder="ex: THK" />
        </Field>
        <Field label="Année">
          <input value={client.annee} onChange={(e) => update('annee', e.target.value)}
            className="field-input" placeholder="2026" />
        </Field>
        <Field label="Sites (séparés par virgule)" last>
          <input value={sitesInput} onChange={(e) => onSitesChange(e.target.value)}
            className="field-input" placeholder="Quimper, Kerambris, Aven" />
        </Field>
      </Section>

      <Section title="Contact">
        <Field label="Interlocuteur">
          <input value={client.interlocuteur} onChange={(e) => update('interlocuteur', e.target.value)}
            className="field-input" placeholder="Prénom Nom" />
        </Field>
        <Field label="Fonction">
          <input value={client.fonction} onChange={(e) => update('fonction', e.target.value)}
            className="field-input" placeholder="Directeur technique" />
        </Field>
        <Field label="Téléphone">
          <input value={client.telephone} onChange={(e) => update('telephone', e.target.value)}
            className="field-input" placeholder="02 98 …" />
        </Field>
        <Field label="Mobile">
          <input value={client.mobile} onChange={(e) => update('mobile', e.target.value)}
            className="field-input" placeholder="06 …" />
        </Field>
        <Field label="Email" last>
          <input type="email" value={client.email} onChange={(e) => update('email', e.target.value)}
            className="field-input" placeholder="contact@…" />
        </Field>
      </Section>

      <Section title="Contrat">
        <Field label="N° Devis">
          <input value={client.numDevis} onChange={(e) => update('numDevis', e.target.value)}
            className="field-input" />
        </Field>
        <Field label="N° Convention">
          <input value={client.numConvention} onChange={(e) => update('numConvention', e.target.value)}
            className="field-input" />
        </Field>
        <Field label="Durée contrat">
          <input value={client.dureeContrat} onChange={(e) => update('dureeContrat', e.target.value)}
            className="field-input" placeholder="12 mois" />
        </Field>
        <Field label="Montant total (€)">
          <input type="number" value={client.montantTotal || ''} onChange={(e) => update('montantTotal', Number(e.target.value))}
            className="field-input" />
        </Field>
        <Field label="Part PMC (€)">
          <input type="number" value={client.partPMC || ''} onChange={(e) => update('partPMC', Number(e.target.value))}
            className="field-input" />
        </Field>
        <Field label="Part sous-traitance (€)" last>
          <input type="number" value={client.partSousTraitance || ''} onChange={(e) => update('partSousTraitance', Number(e.target.value))}
            className="field-input" />
        </Field>
      </Section>

      <Section title="Description de la mission">
        <Field label="Mission" last>
          <textarea value={client.mission} onChange={(e) => update('mission', e.target.value)}
            rows={3} className="field-input resize-none" placeholder="Description libre de la mission…" />
        </Field>
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold uppercase mb-2"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        {title}
      </h2>
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <label className="text-sm shrink-0 pt-0.5" style={{ color: 'var(--color-text-secondary)', minWidth: '160px' }}>
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
