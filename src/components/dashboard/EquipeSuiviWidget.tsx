import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { isSamplingIncomplet, isSamplingOverdue } from '@/lib/overdue'
import type { Client, Sampling, NatureEauType } from '@/types'

interface IncompletItem {
  samplingId: string
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
  if (nature === 'Souterraine') {
    const isPeriodeNappe = [0, 1, 2, 8, 9, 10].includes(s.plannedMonth)
    if (isPeriodeNappe && !s.nappe) return 'Nappe manquante'
  }
  return ''
}

interface Props {
  clients: Client[]
}

export function EquipeSuiviWidget({ clients }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

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
                samplingId: s.id,
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
          { label: 'Réalisés',    sub: "Faits sur l'année",          value: kpis.realises,   color: 'var(--color-success)' },
          { label: 'Incomplets',  sub: 'Date, tech ou nappe requis', value: kpis.incomplets, color: 'var(--color-warning)' },
          { label: 'En retard',   sub: 'Échéances dépassées',        value: kpis.enRetard,   color: 'var(--color-danger)'  },
          { label: 'Rapports dus',sub: 'Prévus non rédigés',        value: kpis.rapportsDus,color: 'var(--color-accent)'  },
        ].map(({ label, sub, value, color }) => (
          <div key={label} className="rounded-xl p-3 flex flex-col justify-between"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
            </div>
            <div className="text-[10px] mt-1.5 leading-tight" style={{ color: 'var(--color-text-secondary)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Liste incomplets */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between px-4 py-3 w-full text-left cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors"
          style={{ borderBottom: open ? '1px solid var(--color-border-subtle)' : 'none' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Prélèvements incomplets
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              {incomplets.length}
            </span>
          </div>
          <ChevronDown size={14} strokeWidth={2.5} style={{
            color: 'var(--color-text-secondary)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }} />
        </button>
        {open && incomplets.map((item, i) => (
          <div key={item.samplingId}
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
