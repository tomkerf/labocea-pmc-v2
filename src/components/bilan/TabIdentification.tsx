import { Card, SectionTitle, FieldLabel, TextInput, NumInput } from './BilanUI'

export function TabIdentification({ fields, set }: {
  fields: Record<string, string>
  set: (k: string, v: string) => void
}) {
  const f = (k: string) => fields[k] ?? ''
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Informations générales</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><FieldLabel>Client</FieldLabel><TextInput value={f('client')} onChange={v => set('client', v)} placeholder="Nom du client" /></div>
          <div><FieldLabel>Site</FieldLabel><TextInput value={f('site')} onChange={v => set('site', v)} placeholder="Nom du site" /></div>
          <div><FieldLabel>N° Convention</FieldLabel><TextInput value={f('convention')} onChange={v => set('convention', v)} placeholder="REF-XXXX" /></div>
          <div><FieldLabel>Opérateur Labocea</FieldLabel><TextInput value={f('operateur')} onChange={v => set('operateur', v)} placeholder="Prénom NOM" /></div>
          <div><FieldLabel>Date vérification</FieldLabel><TextInput value={f('dateVerif')} onChange={v => set('dateVerif', v)} placeholder="JJ/MM/AAAA" /></div>
          <div><FieldLabel>Heure début</FieldLabel><TextInput value={f('heureDebut')} onChange={v => set('heureDebut', v)} placeholder="HH:MM" /></div>
        </div>
      </Card>
      <Card>
        <SectionTitle>Échantillonneur & éprouvette</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Nature échantillon</FieldLabel>
            <select value={f('nature')} onChange={e => set('nature', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}>
              <option value="">Sélectionner…</option>
              <option>Effluent brut</option>
              <option>Effluent prétraité</option>
              <option>Effluent traité</option>
              <option>Eau pluviale</option>
            </select>
          </div>
          <div><FieldLabel>Point d'échantillonnage</FieldLabel><TextInput value={f('pointEch')} onChange={v => set('pointEch', v)} placeholder="Ex: Entrée STEP" /></div>
          <div><FieldLabel>Marque / Modèle préleveur</FieldLabel><TextInput value={f('preleveur')} onChange={v => set('preleveur', v)} placeholder="Ex: ISCO 6712" /></div>
          <div><FieldLabel>N° série</FieldLabel><TextInput value={f('seriePrel')} onChange={v => set('seriePrel', v)} placeholder="SN-XXXXXX" /></div>
          <div><FieldLabel>N° éprouvette réf.</FieldLabel><TextInput value={f('eprouvette')} onChange={v => set('eprouvette', v)} placeholder="EP-XXX" /></div>
          <div><FieldLabel>Vol. unitaire programmé (mL)</FieldLabel><NumInput value={f('volumeProgr')} onChange={v => set('volumeProgr', v)} placeholder="Ex: 70" /></div>
        </div>
      </Card>
    </div>
  )
}
