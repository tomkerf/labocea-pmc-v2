import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container, Activity, SlidersHorizontal, Snowflake, HardDrive,
  Thermometer, Ruler, FlaskConical, Droplets, ArrowDownToLine,
  Gauge, Timer, Package, Cylinder, ChevronDown, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import CircleProgress from './CircleProgress'
import type { Equipement, EtatType } from '@/types'
import { COLORS } from '@/lib/constants'
import { saveEquipement } from '@/services/equipementService'
import { StatusChangeModal } from './StatusChangeModal'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { exportFicheDeViePDF } from '@/components/equipement/ficheDeVieExport'
import type { TimelineEntry } from '@/components/equipement/ficheDeVieExport'


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
  manchon_deversoir: 'Manchon déversoir',
  // Anciens noms V1 (rétrocompatibilité)
  preleveur_auto: 'Préleveur',
  turbidimetre:   'Turbidimètre',
  ph_metre:       'pH-mètre',
  conductimetre:  'Conductimètre',
  autre:          'Autre',
}

const CATEGORIE_ICONS: Record<string, LucideIcon> = {
  preleveur:      Container,
  preleveur_auto: Container,
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
  manchon_deversoir: Cylinder,
  autre:          Package,
}

export const ETAT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  operationnel:    { label: 'Opérationnel',    bg: 'var(--color-success-light)', color: 'var(--color-success-text)' },
  en_maintenance:  { label: 'En maintenance',  bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)' },
  hors_service:    { label: 'Hors service',    bg: 'var(--color-danger-light)',  color: 'var(--color-danger-text)'  },
  prete:           { label: 'Prêté',           bg: COLORS.BG_TERTIARY,           color: COLORS.TEXT_SECONDARY       },
}

function calcMetroTooltip(prochainEtalonnage: string): string {
  const days = Math.round((new Date(prochainEtalonnage).getTime() - Date.now()) / 86400000)
  if (days < 0) return `Étalonnage en retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`
  if (days === 0) return "Étalonnage dû aujourd'hui"
  return `Prochain étalonnage dans ${days} jour${days > 1 ? 's' : ''}`
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
  if (percent >= 60) return COLORS.SUCCESS
  if (percent >= 30) return COLORS.WARNING
  return COLORS.DANGER
}

interface EquipementCardProps {
  equipement: Equipement
  compact?: boolean
}

export default function EquipementCard({ equipement, compact = false }: EquipementCardProps) {
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  const initiales = useAuthStore(selectInitiales)
  const { add: addToast } = useToastStore()
  const [pendingEtat, setPendingEtat] = useState<string | null>(null)
  const etatCfg = ETAT_CONFIG[equipement.etat] ?? ETAT_CONFIG.operationnel
  const metroPercent = calcMetroPercent(equipement.prochainEtalonnage)

  const verifications = useMetrologieStore((s) => s.verifications).filter((v) => v.equipementId === equipement.id)
  const maintenances  = useMaintenancesStore((s) => s.maintenances).filter((m) => m.equipementId === equipement.id)

  const entries: TimelineEntry[] = [
    ...(equipement.dateAcquisition
      ? [{ kind: 'acquisition' as const, date: equipement.dateAcquisition }]
      : []),
    ...verifications.map((v) => ({ kind: 'verification' as const, date: v.date, data: v })),
    ...maintenances.flatMap((m) => (m.dateRealisee || m.datePrevue) ? [{ kind: 'maintenance' as const, date: (m.dateRealisee || m.datePrevue) as string, data: m }] : []),
    ...(equipement.ficheDeVieNotes ?? []).map((n) => ({ kind: 'note' as const, date: n.date, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  async function handleConfirmStateChange(reason: string) {
    if (!uid || !pendingEtat) return
    
    const newLabel = ETAT_CONFIG[pendingEtat]?.label || pendingEtat
    const note = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      titre: `Statut : ${newLabel}`,
      notes: reason.trim() || `L'état de l'équipement a été modifié vers ${newLabel}.`,
      auteur: initiales || 'Système'
    }
    
    try {
      await saveEquipement({
        ...equipement,
        etat: pendingEtat as EtatType,
        ficheDeVieNotes: [...(equipement.ficheDeVieNotes || []), note]
      }, uid)
      setPendingEtat(null)
    } catch {
      addToast('error', 'Erreur lors du changement de statut')
    }
  }

  const Icon = CATEGORIE_ICONS[equipement.categorie] ?? Package
  const iconSize = 16

  // Couleur de l'icône selon statut métrologique (ou neutre si pas d'étalonnage)
  const iconColor = metroPercent !== null
    ? getMetroColor(metroPercent)
    : 'var(--color-text-tertiary)'

  return (
    <div
      className={`w-full text-left rounded-xl px-5 flex items-center gap-4 transition-colors relative group ${compact ? 'py-2' : 'py-4'}`}
      style={{
        background: COLORS.BG_SECONDARY,
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
      onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.BG_SECONDARY)}
    >
      {/* Ghost button for the whole card click to navigate */}
      <button
        type="button"
        onClick={() => navigate(`/materiel/${equipement.id}`)}
        className="absolute inset-0 w-full h-full cursor-pointer rounded-xl bg-transparent border-none outline-none"
        aria-label={`Détails de ${equipement.nom}`}
      />

      {/* Main content with pointer-events-none */}
      <div className="flex-1 flex items-center gap-4 min-w-0 pointer-events-none">
        {/* Anneau métrologie avec icône au centre */}
        <div className="relative group shrink-0 pointer-events-auto">
          {metroPercent !== null && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap px-2 py-1 rounded text-xs z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100"
              style={{ background: COLORS.TEXT_PRIMARY, color: 'white' }}>
              {calcMetroTooltip(equipement.prochainEtalonnage)}
            </div>
          )}
          {metroPercent !== null ? (
            <CircleProgress percent={metroPercent} size={compact ? 28 : 44} icon={<Icon size={compact ? 10 : iconSize} strokeWidth={1.8} color={iconColor} />} />
          ) : (
            <div className={`${compact ? 'size-7' : 'size-11'} rounded-full flex items-center justify-center`}
              style={{ background: COLORS.BG_TERTIARY, border: '2px solid var(--color-border)' }}>
              <Icon size={compact ? 10 : iconSize} strokeWidth={1.8} color="var(--color-text-tertiary)" />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          {/* Ligne principale : marque + modèle + catégorie (ou code si pas de marque/modèle) */}
          <p className="text-sm font-semibold truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
            {[equipement.marque, equipement.modele, CATEGORIE_LABELS[equipement.categorie] ?? equipement.categorie].filter(Boolean).join(' · ') || equipement.nom || 'Sans nom'}
          </p>
          {/* Ligne secondaire : code équipement */}
          {!compact && equipement.nom && (
            <p className="text-xs truncate mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
              {equipement.nom}
            </p>
          )}
          {!compact && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {[
                equipement.numSerie,
                equipement.volume,
                equipement.poids,
                equipement.materiau ? equipement.materiau.charAt(0).toUpperCase() + equipement.materiau.slice(1) : '',
                equipement.diametre ? `Ø ${equipement.diametre} mm` : '',
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Badges & Actions */}
      <div className="flex items-center gap-3 shrink-0 relative z-10 pointer-events-auto">
        {/* Bouton Exporter Fiche de Vie PDF */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            exportFicheDeViePDF(equipement, entries)
          }}
          className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-700"
          title="Exporter la fiche de vie (PDF)"
        >
          <FileText size={16} />
        </button>

        <div className="flex flex-col items-end gap-1">
          {metroPercent === 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'var(--color-danger-light)', color: COLORS.DANGER }}>
              À étalonner
            </span>
          )}
          <div className="relative group" onClick={(e) => e.stopPropagation()} title="Modifier l'état">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 transition-opacity group-hover:opacity-80"
              style={{ background: etatCfg.bg, color: etatCfg.color }}>
              {etatCfg.label}
              <ChevronDown size={12} strokeWidth={2.5} />
            </span>
            <select
              value={equipement.etat}
              onChange={(e) => {
                if (e.target.value !== equipement.etat) setPendingEtat(e.target.value)
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-label="Modifier l'état"
            >
              <option value="operationnel">Opérationnel</option>
              <option value="en_maintenance">En maintenance</option>
              <option value="hors_service">Hors service</option>
              <option value="prete">Prêté</option>
            </select>
          </div>
        </div>
      </div>
      
      <div onClick={(e) => e.stopPropagation()}>
        <StatusChangeModal
          key={pendingEtat ?? 'closed'}
          isOpen={pendingEtat !== null}
          onClose={() => setPendingEtat(null)}
          onConfirm={handleConfirmStateChange}
          newLabel={pendingEtat ? (ETAT_CONFIG[pendingEtat]?.label || pendingEtat) : ''}
        />
      </div>
    </div>
  )
}
