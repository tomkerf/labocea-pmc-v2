import { COLORS } from '@/lib/constants'
import type { Plan, Client } from '@/types'

interface PointMesureInfosProps {
  plan: Plan;
  client: Client;
  saving: boolean;
}

export function PointMesureInfos({ plan, client, saving }: PointMesureInfosProps) {
  return (
    <div className="mx-4 mb-6 rounded-2xl px-5 py-4"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        {plan.cofrac && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
            COFRAC
          </span>
        )}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          {plan.nature}
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
      <p className="text-sm font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
        {plan.siteNom}{plan.nom ? ` · ${plan.nom}` : ''}
      </p>

      <div className="mt-3 pt-3 flex flex-col gap-2 text-xs"
        style={{ borderTop: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_SECONDARY }}>
        <div className="flex justify-between">
          <span>Fréquence :</span>
          <span className="font-medium text-right">{plan.frequence}</span>
        </div>
        <div className="flex justify-between">
          <span>Méthode de prélèvement :</span>
          <span className="font-medium text-right">{plan.methode}</span>
        </div>
        <div className="flex justify-between">
          <span>Préleveur référent :</span>
          <span className="font-medium text-right">{client.preleveur || '—'}</span>
        </div>
      </div>
    </div>
  )
}
