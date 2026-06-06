import { MapPin, Clock } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { Client, Plan, Sampling } from '@/types'

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

interface Props {
  client: Client;
  plan: Plan;
  sampling: Sampling;
  statusConfig: { label: string; bg: string; color: string };
  saving: boolean;
  hasGps: boolean;
}

export function MissionDetailInfoCard({ client, plan, sampling, statusConfig, saving, hasGps }: Props) {
  return (
    <div className="mx-4 mb-4 rounded-2xl px-5 py-4"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        {sampling.plannedTime && (
          <span className="flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full"
            style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
            <Clock size={13} />
            {sampling.plannedTime}
          </span>
        )}
        <span className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ background: statusConfig.bg, color: statusConfig.color }}>
          {statusConfig.label}
        </span>
        {saving && (
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
            Sauvegarde…
          </span>
        )}
      </div>

      <h1 className="text-lg font-bold mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>
        {client.nom}
      </h1>
      <p className="text-sm mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
        {plan.siteNom}{plan.nom ? ` · ${plan.nom}` : ''}
      </p>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        <span>{sampling.dateUndefined ? 'Date à définir' : `${MOIS[sampling.plannedMonth]}${sampling.plannedDay ? ` — j${sampling.plannedDay}` : ''}`}</span>
        <span>·</span>
        <span>{plan.frequence}</span>
        <span>·</span>
        <span>{plan.nature}</span>
      </div>

      {hasGps && (
        <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          <MapPin size={11} />
          <span>{plan.lat}, {plan.lng}{plan.gpsApprox ? ' (approx.)' : ''}</span>
        </div>
      )}
    </div>
  )
}
