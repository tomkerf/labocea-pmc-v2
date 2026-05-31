import { useUsersStore } from '@/stores/usersStore'
import type { Equipement, CategorieType, EtatType, LocalisationType, SiteEquipement, MateriauFlacon } from '@/types'

const CATS_AVEC_TECHNICIEN = new Set([
  'reglet', 'thermometre', 'enregistreur', 'eprouvette',
  'sonde_niveau', 'chronometre', 'glaciere', 'multiparametre',
])

const CATEGORIES: { value: CategorieType; label: string }[] = [
  { value: 'preleveur',     label: 'Préleveur'      },
  { value: 'debitmetre',    label: 'Débitmètre'     },
  { value: 'multiparametre',label: 'Multiparamètre' },
  { value: 'glaciere',      label: 'Glacière'       },
  { value: 'enregistreur',  label: 'Enregistreur'   },
  { value: 'thermometre',   label: 'Thermomètre'    },
  { value: 'reglet',        label: 'Réglet'         },
  { value: 'eprouvette',    label: 'Éprouvette'     },
  { value: 'flacon',        label: 'Flacon'         },
  { value: 'pompe_pz',      label: 'Pompe PZ'       },
  { value: 'sonde_niveau',  label: 'Sonde niveau'   },
  { value: 'chronometre',   label: 'Chronomètre'    },
  { value: 'manchon_deversoir', label: 'Manchon déversoir' },
]

const ETATS: { value: EtatType; label: string }[] = [
  { value: 'operationnel',   label: 'Opérationnel'   },
  { value: 'en_maintenance', label: 'En maintenance' },
  { value: 'hors_service',   label: 'Hors service'   },
  { value: 'prete',          label: 'Prêté'          },
]

const LOCALISATIONS: { value: LocalisationType; label: string }[] = [
  { value: 'labo',    label: 'Laboratoire'           },
  { value: 'terrain', label: 'Terrain'               },
  { value: 'externe', label: 'Externe (prêt / SAV)'  },
]

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
    <div className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <label className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)', minWidth: '180px' }}>
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function EquipementForm({ equipement, update }: {
  equipement: Equipement
  update: (field: keyof Equipement, value: unknown) => void
}) {
  const users = useUsersStore(s => s.users)
  const techniciens = users.filter(u => u.role !== 'charge_mission')
  const showTechnicien = CATS_AVEC_TECHNICIEN.has(equipement.categorie)

  return (
    <>
      <Section title="Identification">
        <Field label="Nom de l'équipement">
          <input aria-label="Nom de l'équipement" value={equipement.nom} onChange={(e) => update('nom', e.target.value)} className="field-input" placeholder="Ex : YSI Pro30" />
        </Field>
        <Field label="Marque">
          <input aria-label="Marque" value={equipement.marque} onChange={(e) => update('marque', e.target.value)} className="field-input" placeholder="Ex : YSI" />
        </Field>
        <Field label="Modèle">
          <input aria-label="Modèle" value={equipement.modele} onChange={(e) => update('modele', e.target.value)} className="field-input" placeholder="Ex : Pro30" />
        </Field>
        <Field label="Numéro de série">
          <input aria-label="Numéro de série" value={equipement.numSerie} onChange={(e) => update('numSerie', e.target.value)} className="field-input" placeholder="Ex : A123456" />
        </Field>
        <Field label="Catégorie">
          <select aria-label="Catégorie" value={equipement.categorie} onChange={(e) => update('categorie', e.target.value as CategorieType)} className="field-input">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Date d'acquisition" last>
          <input aria-label="Date d'acquisition" type="date" value={equipement.dateAcquisition} onChange={(e) => update('dateAcquisition', e.target.value)} className="field-input" />
        </Field>
      </Section>

      <Section title="État et localisation">
        <Field label="État">
          <select aria-label="État" value={equipement.etat} onChange={(e) => update('etat', e.target.value as EtatType)} className="field-input">
            {ETATS.map((et) => <option key={et.value} value={et.value}>{et.label}</option>)}
          </select>
        </Field>
        <Field label="Localisation">
          <select aria-label="Localisation" value={equipement.localisation} onChange={(e) => update('localisation', e.target.value as LocalisationType)} className="field-input">
            {LOCALISATIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
        <Field label="Site" last={!showTechnicien}>
          <select aria-label="Site" value={equipement.site ?? ''} onChange={(e) => update('site', e.target.value as SiteEquipement)} className="field-input">
            <option value="">— Non renseigné</option>
            <option value="quimper">Quimper</option>
            <option value="brest">Brest</option>
          </select>
        </Field>
        {showTechnicien && (
          <Field label="Technicien assigné" last>
            <select aria-label="Technicien assigné" value={equipement.technicien ?? ''} onChange={(e) => update('technicien', e.target.value)} className="field-input">
              <option value="">— Non assigné</option>
              {techniciens.map(t => (
                <option key={t.uid} value={t.initiales}>{t.prenom} {t.nom} ({t.initiales})</option>
              ))}
            </select>
          </Field>
        )}
      </Section>

      <Section title="Métrologie">
        <Field label="Prochain étalonnage" last>
          <input aria-label="Prochain étalonnage" type="date" value={equipement.prochainEtalonnage} onChange={(e) => update('prochainEtalonnage', e.target.value)} className="field-input" />
        </Field>
      </Section>

      {equipement.categorie === 'flacon' && (
        <Section title="Caractéristiques flacon">
          <Field label="Volume">
            <input aria-label="Volume" value={equipement.volume ?? ''} onChange={(e) => update('volume', e.target.value)} className="field-input" placeholder="Ex : 20L, 1L, 500 mL" />
          </Field>
          <Field label="Matériau">
            <select aria-label="Matériau" value={equipement.materiau ?? ''} onChange={(e) => update('materiau', e.target.value as MateriauFlacon)} className="field-input">
              <option value="">— Non renseigné</option>
              <option value="plastique">Plastique</option>
              <option value="verre">Verre</option>
            </select>
          </Field>
          <Field label="Poids" last>
            <input aria-label="Poids" value={equipement.poids ?? ''} onChange={(e) => update('poids', e.target.value)} className="field-input" placeholder="Ex : 0.570 kg" />
          </Field>
        </Section>
      )}

      {equipement.categorie === 'manchon_deversoir' && (
        <Section title="Caractéristiques manchon">
          <Field label="Diamètre (mm)" last>
            <select aria-label="Diamètre (mm)" value={equipement.diametre ?? ''} onChange={(e) => update('diametre', e.target.value)} className="field-input">
              <option value="">— Non renseigné</option>
              <option value="150">150</option>
              <option value="200">200</option>
              <option value="250">250</option>
              <option value="300">300</option>
            </select>
          </Field>
        </Section>
      )}

      <Section title="Notes">
        <div className="px-5 py-3">
          <textarea
            value={equipement.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={3}
            placeholder="Remarques, historique, informations complémentaires…"
            aria-label="Notes sur l'équipement"
            className="w-full text-sm resize-none bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>
      </Section>
    </>
  )
}
