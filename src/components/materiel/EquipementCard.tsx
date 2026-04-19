import { useNavigate } from 'react-router-dom'
import {
  Pipette, Activity, SlidersHorizontal, Snowflake, HardDrive,
  Thermometer, Ruler, FlaskConical, Droplets, ArrowDownToLine,
  Gauge, Timer, Package,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import CircleProgress from './CircleProgress'
import type { Equipement } from '@/types'

const CATEGORIE_LABELS: Record<string, string> = {
  // V2 — nouvelles catégories
  preleveur:      'Préleveur',
  debitmetre:     'Débitmètre',
  multiparametre: 'Multiparamètre',
  glaciere:       'Glacière',
  enregistreur:   'Enregistreur',
  thermometre:    'Thermomètre',
  reglet:         'Réglet',
  eprouvette:     'Éprouvette',
  flacon:         'Flacon',
  pompe_pz:       'Pompe PZ',
  sonde_niveau:   'Sonde niveau',
  chronometre:    'Chronomètre',
  // Anciens noms V1 (rétrocompatibilité)
  preleveur_auto: 'Préleveur',
  turbidimetre:   'Turbidimètre',
  ph_metre:       'pH-mètre',
  conductimetre:  'Conductimètre',
  autre:          'Autre',
}

const CATEGORIE_ICONS: Record<string, LucideIcon> = {
  preleveur:      Pipette,
  preleveur_auto: Pipette,
  debitmetre:     Activity,
  multiparametre: SlidersHorizontal,
  turbidimetre:   SlidersHorizontal,
  ph_metre:       SlidersHorizontal,
  conductimetre:  SlidersHorizontal,
  glaciere:       Snowflake,
  enregistreur:   HardDrive,
  thermometre:    Thermometer,
  reglet:         Ruler,
  eprouvette:     FlaskConical,
  flacon:         Droplets,
  pompe_pz:       ArrowDownToLine,
  sonde_niveau:   Gauge,
  chronometre:    Timer,
  autre:          Package,
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
  const msYear = 365 * 24 * 60 * 60 * 1000
  return Math.min(100, Math.round((msDiff / msYear) * 100))
}

function getMetroColor(percent: number): string {
  if (percent >= 60) return 'var(--color-success)'
  if (percent >= 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

interface EquipementCardProps {
  equipement: Equipement
}

export default function EquipementCard({ equipement }: EquipementCardProps) {
  const navigate = useNavigate()
  const etatCfg = ETAT_CONFIG[equipement.etat] ?? ETAT_CONFIG.operationnel
  const metroPercent = calcMetroPercent(equipement.prochainEtalonnage)

  const Icon = CATEGORIE_ICONS[equipement.categorie] ?? Package
  const iconSize = 16

  // Couleur de l'icône selon statut métrologique (ou neutre si pas d'étalonnage)
  const iconColor = metroPercent !== null
    ? getMetroColor(metroPercent)
    : 'var(--color-text-tertiary)'

  const categoryIcon = <Icon size={iconSize} strokeWidth={1.8} color={iconColor} />

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
      {/* Anneau métrologie avec icône au centre */}
      <div className="shrink-0">
        {metroPercent !== null ? (
          <CircleProgress percent={metroPercent} size={44} icon={categoryIcon} />
        ) : (
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-bg-tertiary)', border: '2px solid var(--color-border)' }}>
            <Icon size={iconSize} strokeWidth={1.8} color="var(--color-text-tertiary)" />
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

      {/* Badges */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {metroPercent === 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            À étalonner
          </span>
        )}
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: etatCfg.bg, color: etatCfg.color }}>
          {etatCfg.label}
        </span>
      </div>
    </button>
  )
}
