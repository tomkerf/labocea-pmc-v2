import { useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, ClipboardList, CheckCircle2, Circle } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectInitiales, selectUid } from '@/stores/authStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { Sampling } from '@/types'

interface BilanItem {
  clientId: string; planId: string; samplingId: string
  clientNom: string; siteNom: string; planNom: string
  status: Sampling['status']; doneDate: string
  plannedMonth: number; plannedDay: number
  tech: string
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

export default function MissionsBilanPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { clients } = useMissionsStore()
  const initiales = useAuthStore(selectInitiales)
  const uid = useAuthStore(selectUid)

  const touteEquipe = searchParams.get('scope') === 'equipe'
  const moisCourant = new Date().getMonth()

  const { fait, nonFait } = useMemo(() => {
    const fait: BilanItem[] = []
    const nonFait: BilanItem[] = []
    clients.forEach(client => {
      if (client.pause) return
      client.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (s.plannedMonth !== moisCourant) return
          const estMonPrelevement = s.assignedTo
            ? s.assignedTo === initiales
            : (s.doneBy ? s.doneBy === uid : client.preleveur === initiales)
          if (!touteEquipe && !estMonPrelevement) return
          const item: BilanItem = {
            clientId: client.id, planId: plan.id, samplingId: s.id,
            clientNom: client.nom, siteNom: plan.siteNom, planNom: plan.nom,
            status: s.status, doneDate: s.doneDate,
            plannedMonth: s.plannedMonth, plannedDay: s.plannedDay,
            tech: s.assignedTo || client.preleveur || '—',
          }
          if (s.status === 'done') fait.push(item)
          else nonFait.push(item)
        })
      })
    })
    fait.sort((a, b) => (a.doneDate < b.doneDate ? 1 : -1))
    nonFait.sort((a, b) => a.plannedDay - b.plannedDay)
    return { fait, nonFait }
  }, [clients, initiales, uid, moisCourant, touteEquipe])

  function renderRow(item: BilanItem, isLast: boolean) {
    const dateStr = item.status === 'done'
      ? (item.doneDate ? `fait le ${new Date(item.doneDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : 'fait')
      : (item.plannedDay ? `prévu le ${item.plannedDay} ${MOIS[item.plannedMonth]}` : `prévu en ${MOIS[item.plannedMonth]}`)
    return (
      <button type="button" key={item.samplingId}
        onClick={() => navigate(`/missions/${item.clientId}/plan/${item.planId}?sampling=${item.samplingId}`)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-[var(--color-bg-tertiary)] ${isLast ? '' : 'border-b border-[var(--color-border-subtle)]'}`}
      >
        {item.status === 'done'
          ? <CheckCircle2 size={16} className="shrink-0 text-[var(--color-success)]" />
          : <Circle size={16} className="shrink-0 text-[var(--color-text-tertiary)]" />
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">{item.clientNom}</p>
          <p className="text-xs truncate text-[var(--color-text-secondary)]">
            {[item.siteNom, item.planNom].filter(Boolean).join(' · ')} · {dateStr}
            {touteEquipe && <span className="text-[var(--color-text-tertiary)]"> · {item.tech}</span>}
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 max-w-4xl mx-auto pb-12 bg-[var(--color-bg-primary)]">
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center gap-1 font-semibold text-xs text-[var(--color-accent)] hover:underline transition-opacity active:opacity-85">
          <ChevronLeft size={14} />
          Tableau de bord
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-2.5">
          <ClipboardList size={22} strokeWidth={1.5} className="text-[var(--color-accent)]" />
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Bilan du mois</h1>
            <p className="text-xs text-[var(--color-text-secondary)] capitalize">{MOIS[moisCourant]}</p>
          </div>
        </div>
        <SegmentedControl
          options={[
            { value: 'moi', label: 'Mes missions' },
            { value: 'equipe', label: 'Équipe' },
          ]}
          value={touteEquipe ? 'equipe' : 'moi'}
          onChange={(v) => setSearchParams(v === 'equipe' ? { scope: 'equipe' } : {})}
        />
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Non fait</h2>
          {nonFait.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.15)]">
              {nonFait.length}
            </span>
          )}
        </div>
        {nonFait.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-xs font-semibold bg-[var(--color-success-light)]/40 border border-[rgba(52,199,89,0.15)] text-[var(--color-success)] flex items-center gap-2 shadow-sm">
            <span className="text-sm font-bold">✓</span> Tout est fait pour ce mois.
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
            {nonFait.map((item, i) => renderRow(item, i === nonFait.length - 1))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Fait</h2>
          {fait.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] border border-[rgba(52,199,89,0.15)]">
              {fait.length}
            </span>
          )}
        </div>
        {fait.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-xs font-semibold bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] shadow-sm">
            Aucun prélèvement réalisé ce mois pour l'instant.
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
            {fait.map((item, i) => renderRow(item, i === fait.length - 1))}
          </div>
        )}
      </section>
    </div>
  )
}
