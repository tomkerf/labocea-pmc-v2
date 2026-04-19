import { useNavigate } from 'react-router-dom'
import CircleProgress from './CircleProgress'
import type { Equipement } from '@/types'

const CATEGORIE_LABELS: Record<string, string> = {
  preleveur:     'Préleveur',
  debitmetre:    'Débitmètre',
  multiparametre:'Multiparamètre',
  glaciere:      'Glacière',
  enregistreur:  'Enregistreur',
  thermometre:   'Thermomètre',
  reglet:        'Réglet',
  eprouvette:    'Éprouvette',
  flacon:        'Flacon',
  pompe_pz:      'Pompe PZ',
  sonde_niveau:  'Sonde niveau',
  chronometre:   'Chronomètre',
}

const ETAT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  operationnel:    { label: 'Opérationnel',    bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  en_maintenance:  { label: 'En maintenance',  bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
  hors_service:    { label: 'Hors service',    bg: 'var(--color-danger-light)',  color: 'var(--color-danger)'  },
  prete:           { label: 'Prêté',           bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
}

/** Calcule le % restant avant la prochaine échéance métrologique (sur 12 mois). */
function calcMetroPercent(prochainEtalonnage: string): number | null {
  if (!prochainEtalonnage) return null
  const now = Date.now()
  const next = new Date(prochainEtalonnage).getTime()
  const msDiff = next - now
  if (msDiff <= 0) return 0
  // on affiche 100% si l'échéance est dans plus de 12 mois
  const msYear = 365 * 24 * 60 * 60 * 1000
  return Math.min(100, Math.round((msDiff / msYear) * 100))
}

interface EquipementCardProps {
  equipement: Equipement
}

export default function EquipementCard({ equipement }: EquipementCardProps) {
  const navigate = useNavigate()
  const etatCfg = ETAT_CONFIG[equipement.etat] ?? ETAT_CONFIG.operationnel
  const metroPercent = calcMetroPercent(equipement.prochainEtalonnage)

  return (
    <button
      onClick={() => navigate(`/materiel/${equipement.id}`)}
      className="w-full text-left rounded-xl px-5 py-4 flex items-center gap-4 transition-colors"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
    >
      {/* Anneau métrologie */}
      <div className="shrink-0">
        {metroPercent !== null ? (
          <CircleProgress percent={metroPercent} size={44} />
        ) : (
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-bg-tertiary)' }}>
            <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>—</span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {equipement.nom || 'Sans nom'}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {[equipement.marque, equipement.modele].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          {CATEGORIE_LABELS[equipement.categorie] ?? equipement.categorie}
          {equipement.numSerie ? ` · ${equipement.numSerie}` : ''}
        </p>
      </div>

      {/* Badge état */}
      <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
        style={{ background: etatCfg.bg, color: etatCfg.color }}>
        {etatCfg.label}
      </span>
    </button>
  )
}
