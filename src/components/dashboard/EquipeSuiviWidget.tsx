import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSamplingIncomplet, isSamplingOverdue } from '@/lib/overdue'
import type { Client, Sampling, NatureEauType } from '@/types'

interface IncompletItem {
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  doneDate: string
  champManquant: string
}

function getChampManquant(s: Sampling, nature: NatureEauType): string {
  if (!s.doneDate) return 'Date manquante'
  if (!s.doneBy) return 'Technicien manquant'
  if (['Rivière', 'Souterraine', 'AEP'].includes(nature) && !s.nappe) return 'Nappe manquante'
  return ''
}

interface Props {
  clients: Client[]
}

export function EquipeSuiviWidget({ clients }: Props) {
  const navigate = useNavigate()

  const { kpis, incomplets } = useMemo(() => {
    let realises = 0
    let enRetard = 0
    let rapportsDus = 0
    const incompletsList: IncompletItem[] = []

    for (const client of clients) {
      const year = parseInt(client.annee ?? String(new Date().getFullYear()))
      for (const plan of client.plans) {
        for (const s of plan.samplings) {
          if (s.status === 'done') {
            realises++
            if (isSamplingIncomplet(s, plan.nature)) {
              incompletsList.push({
                clientId: client.id,
                planId: plan.id,
                clientNom: client.nom,
                siteNom: plan.siteNom,
                doneDate: s.doneDate,
                champManquant: getChampManquant(s, plan.nature),
              })
            }
          }
          if (isSamplingOverdue(s, year)) enRetard++
          if (s.rapportPrevu && !s.rapportDate) rapportsDus++
        }
      }
    }

    incompletsList.sort((a, b) => b.doneDate.localeCompare(a.doneDate))

    return {
      kpis: { realises, incomplets: incompletsList.length, enRetard, rapportsDus },
      incomplets: incompletsList,
    }
  }, [clients])

  if (incomplets.length === 0) return null

  return (
    <div className="mb-6">
      <span className="text-xs font-semibold uppercase block mb-3"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        Suivi équipe
      </span>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Réalisés',    value: kpis.realises,   color: 'var(--color-success)' },
          { label: 'Incomplets',  value: kpis.incomplets, color: 'var(--color-warning)' },
          { label: 'En retard',   value: kpis.enRetard,   color: 'var(--color-danger)'  },
          { label: 'Rapports dus',value: kpis.rapportsDus,color: 'var(--color-accent)'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-3"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Liste incomplets */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Prélèvements incomplets
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {incomplets.length} à compléter
          </span>
        </div>
        {incomplets.map((item, i) => (
          <div key={`${item.clientId}-${item.planId}-${item.doneDate}`}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
            style={{ borderBottom: i < incomplets.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
            onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}`)}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                {item.clientNom}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {item.siteNom}{item.doneDate ? ` · réalisé le ${new Date(item.doneDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              {item.champManquant}
            </span>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
