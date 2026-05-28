import { PlanField } from '@/components/plan/SamplingForm'
import type { Plan, FrequenceType, NatureEauType, MethodeType } from '@/types'

const FREQUENCES: FrequenceType[] = ['Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Personnalisé']
const NATURES: NatureEauType[] = ['Eau usée', 'Rivière', 'Souterraine', 'Eau pluviale', 'Eau saline', 'Boues', 'Autre']
const METHODES: MethodeType[] = ['Ponctuel', 'Composite', 'Automatique']

interface PlanConfigSectionProps {
  plan: Plan
  onUpdate: (field: keyof Plan, value: unknown) => void
}

export function PlanConfigSection({ plan, onUpdate }: PlanConfigSectionProps) {
  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        Configuration
      </h2>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <PlanField label="Nom du point">
          <input value={plan.nom} onChange={(e) => onUpdate('nom', e.target.value)} className="field-input"
            style={!plan.nom.trim() ? { borderColor: 'var(--color-danger)' } : undefined} />
          {!plan.nom.trim() && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Le nom du point est obligatoire.</p>
          )}
        </PlanField>
        <PlanField label="Site">
          <input value={plan.siteNom} onChange={(e) => onUpdate('siteNom', e.target.value)} className="field-input" placeholder="Nom du site" />
        </PlanField>
        <PlanField label="Fréquence">
          <select value={plan.frequence} onChange={(e) => onUpdate('frequence', e.target.value as FrequenceType)} className="field-input">
            {FREQUENCES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </PlanField>
        <PlanField label="Nature de l'eau">
          <select value={plan.nature} onChange={(e) => onUpdate('nature', e.target.value as NatureEauType)} className="field-input">
            {NATURES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </PlanField>
        <PlanField label="Méthode">
          <select value={plan.methode} onChange={(e) => onUpdate('methode', e.target.value as MethodeType)} className="field-input">
            {METHODES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </PlanField>
        <PlanField label="Latitude">
          <input
            value={plan.lat}
            onChange={(e) => onUpdate('lat', e.target.value)}
            className="field-input"
            placeholder="ex : 48.1234"
            inputMode="decimal"
          />
        </PlanField>
        <PlanField label="Longitude">
          <input
            value={plan.lng}
            onChange={(e) => onUpdate('lng', e.target.value)}
            className="field-input"
            placeholder="ex : -3.5678"
            inputMode="decimal"
          />
        </PlanField>
        <PlanField label="GPS approximatif">
          <label className="flex items-center gap-2 mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={plan.gpsApprox}
              onChange={(e) => onUpdate('gpsApprox', e.target.checked)}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {plan.gpsApprox ? 'Oui — position approchée' : 'Non — position précise'}
            </span>
          </label>
        </PlanField>
        <PlanField label="Conditions météo">
          <label className="flex items-center gap-2 mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={plan.meteo === 'pluie'}
              onChange={(e) => onUpdate('meteo', e.target.checked ? 'pluie' : '')}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {plan.meteo === 'pluie' ? '🌧 Temps de pluie requis' : 'Pas de contrainte météo'}
            </span>
          </label>
        </PlanField>
        <PlanField label="Analyses">
          <label className="flex items-center gap-2 mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={!!plan.analysesSousTraitees}
              onChange={(e) => onUpdate('analysesSousTraitees', e.target.checked)}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {plan.analysesSousTraitees
                ? '⚠️ Analyses sous-traitées — ne pas prélever la veille d\'un jour férié'
                : 'Analyses en interne (labo Labocea)'}
            </span>
          </label>
        </PlanField>
        <PlanField label="Accréditation COFRAC">
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={!!plan.cofrac}
              onChange={(e) => onUpdate('cofrac', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            <span className="ml-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {plan.cofrac ? 'Point accrédité COFRAC' : 'Non accrédité'}
            </span>
          </label>
        </PlanField>
        <PlanField label="Contraintes terrain" last>
          <textarea
            aria-label="Contraintes terrain"
            value={plan.contraintesParticulieres ?? ''}
            onChange={(e) => onUpdate('contraintesParticulieres', e.target.value)}
            rows={2}
            className="field-input resize-none w-full"
            placeholder="Codes barrières, équipements spécifiques…"
          />
        </PlanField>
      </div>
    </div>
  )
}
