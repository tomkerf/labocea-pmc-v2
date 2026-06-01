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
          <input aria-label="Nom du client" value={client.nom} onChange={(e) => update('nom', e.target.value)}
            className="field-input" placeholder="Nom du client"
            style={!client.nom.trim() ? { borderColor: 'var(--color-danger)' } : undefined} />
          {!client.nom.trim() && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Le nom est obligatoire.</p>
          )}
        </Field>
        <Field label="Segment">
          <select aria-label="Segment" value={client.segment} onChange={(e) => update('segment', e.target.value as SegmentType)}
            className="field-input">
            {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Type de demande">
          <select aria-label="Type de demande" value={client.nouvelleDemande} onChange={(e) => update('nouvelleDemande', e.target.value as NouvelleDemandeType)}
            className="field-input">
            {NOUVELLES_DEMANDES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Préleveur (initiales)">
          <input aria-label="Préleveur (initiales)" value={client.preleveur} onChange={(e) => update('preleveur', e.target.value)}
            className="field-input" placeholder="ex: THK" />
        </Field>
        <Field label="Année">
          <input aria-label="Année" value={client.annee} onChange={(e) => update('annee', e.target.value)}
            className="field-input" placeholder="2026" />
        </Field>
        <Field label="Sites (séparés par virgule)" last>
          <input aria-label="Sites (séparés par virgule)" value={sitesInput} onChange={(e) => onSitesChange(e.target.value)}
            className="field-input" placeholder="Quimper, Kerambris, Aven" />
        </Field>
      </Section>

      <Section title="Contact">
        <Field label="Interlocuteur">
          <input aria-label="Interlocuteur" value={client.interlocuteur} onChange={(e) => update('interlocuteur', e.target.value)}
            className="field-input" placeholder="Prénom Nom" />
        </Field>
        <Field label="Fonction">
          <input aria-label="Fonction" value={client.fonction} onChange={(e) => update('fonction', e.target.value)}
            className="field-input" placeholder="Directeur technique" />
        </Field>
        <Field label="Téléphone">
          <input aria-label="Téléphone" value={client.telephone} onChange={(e) => update('telephone', e.target.value)}
            className="field-input" placeholder="02 98 …" />
        </Field>
        <Field label="Mobile">
          <input aria-label="Mobile" value={client.mobile} onChange={(e) => update('mobile', e.target.value)}
            className="field-input" placeholder="06 …" />
        </Field>
        <Field label="Email">
          <input aria-label="Email" type="email" value={client.email} onChange={(e) => update('email', e.target.value)}
            className="field-input" placeholder="contact@…" />
        </Field>
        <Field label="Contact prévenance" last>
          <input aria-label="Contact prévenance" value={client.contactPrevenance || ''} onChange={(e) => update('contactPrevenance', e.target.value)}
            className="field-input" placeholder="Nom, téléphone…" />
        </Field>
      </Section>

      <Section title="Facturation & Situation">
        <Field label="N° Bon de commande (BC)">
          <input aria-label="N° Bon de commande" value={client.numBC || ''} onChange={(e) => update('numBC', e.target.value)}
            className="field-input" placeholder="ex: BC-12345" />
        </Field>
        <Field label="Mode de facturation">
          <input aria-label="Mode de facturation" value={client.modeFacturation || ''} onChange={(e) => update('modeFacturation', e.target.value)}
            className="field-input" placeholder="ex: Facturation mensuelle" />
        </Field>
        <Field label="Situation administrative" last>
          <input aria-label="Situation administrative" value={client.situationActuelle || ''} onChange={(e) => update('situationActuelle', e.target.value)}
            className="field-input" placeholder="ex: Convention signée" />
        </Field>
      </Section>

      <Section title="Détail analytique (Facturation / Prestations)">
        <Field label="MPR1">
          <input aria-label="MPR1" value={client.detailPrestations?.mpr1 || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, mpr1: e.target.value })}
            className="field-input" placeholder="ex: 1500" />
        </Field>
        <Field label="MPR1 T">
          <input aria-label="MPR1 T" value={client.detailPrestations?.mpr1T || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, mpr1T: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="MPR2">
          <input aria-label="MPR2" value={client.detailPrestations?.mpr2 || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, mpr2: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="MPR3">
          <input aria-label="MPR3" value={client.detailPrestations?.mpr3 || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, mpr3: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="MPR5">
          <input aria-label="MPR5" value={client.detailPrestations?.mpr5 || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, mpr5: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="MPR6 Q">
          <input aria-label="MPR6 Q" value={client.detailPrestations?.mpr6Q || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, mpr6Q: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="MPR6 T">
          <input aria-label="MPR6 T" value={client.detailPrestations?.mpr6T || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, mpr6T: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="Collecte">
          <input aria-label="Collecte" value={client.detailPrestations?.collecte || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, collecte: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="Boues/SDT">
          <input aria-label="Boues/SDT" value={client.detailPrestations?.boues || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, boues: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="Coquillages">
          <input aria-label="Coquillages" value={client.detailPrestations?.coquillages || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, coquillages: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="Débit">
          <input aria-label="Débit" value={client.detailPrestations?.debit || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, debit: e.target.value })}
            className="field-input" />
        </Field>
        <Field label="Autres" last>
          <input aria-label="Autres" value={client.detailPrestations?.autres || ''} onChange={(e) => update('detailPrestations', { ...client.detailPrestations, autres: e.target.value })}
            className="field-input" />
        </Field>
      </Section>

      <Section title="Contrat">
        <Field label="N° Devis">
          <input aria-label="N° Devis" value={client.numDevis} onChange={(e) => update('numDevis', e.target.value)}
            className="field-input" />
        </Field>
        <Field label="N° Convention">
          <input aria-label="N° Convention" value={client.numConvention} onChange={(e) => update('numConvention', e.target.value)}
            className="field-input" />
        </Field>
        <Field label="Durée contrat">
          <input aria-label="Durée contrat" value={client.dureeContrat} onChange={(e) => update('dureeContrat', e.target.value)}
            className="field-input" placeholder="12 mois" />
        </Field>
        <Field label="Montant total (€)">
          <input aria-label="Montant total (€)" type="number" value={client.montantTotal || ''} onChange={(e) => update('montantTotal', Number(e.target.value))}
            className="field-input" />
        </Field>
        <Field label="Part PMC (€)">
          <input aria-label="Part PMC (€)" type="number" value={client.partPMC || ''} onChange={(e) => update('partPMC', Number(e.target.value))}
            className="field-input" />
        </Field>
        <Field label="Part sous-traitance (€)" last>
          <input aria-label="Part sous-traitance (€)" type="number" value={client.partSousTraitance || ''} onChange={(e) => update('partSousTraitance', Number(e.target.value))}
            className="field-input" />
        </Field>
      </Section>

      <Section title="Description de la mission">
        <Field label="Mission" last>
          <textarea aria-label="Description de la mission" value={client.mission} onChange={(e) => update('mission', e.target.value)}
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
