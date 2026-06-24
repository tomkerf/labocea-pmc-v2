import { useMemo } from 'react'
import { X, ExternalLink, CloudRain, CheckCircle2, Circle, AlertTriangle, AlertCircle } from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Client, Plan, Sampling } from '@/types'
import { isSamplingOverdue } from '@/lib/overdue'
import { MOIS_LONG } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'

type SamplingItem = { client: Client, plan: Plan, sampling: Sampling }

interface BilanSectionProps {
  title: string
  list: SamplingItem[]
  icon: React.ReactNode
  color: string
  bgColor: string
  onClose: () => void
}

function BilanSection({ title, list, icon, color, bgColor, onClose }: BilanSectionProps) {
  if (list.length === 0) return null
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color }}>
        {icon}
        {title} <span className="text-xs font-normal opacity-70">({list.length})</span>
      </h3>
      <div className="flex flex-col gap-2">
        {list.map((item) => (
          <div key={item.sampling.id} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors group">
            <div className="flex justify-between items-start gap-2">
              <div>
                <Link to={`/missions/${item.client.id}`} onClick={onClose} className="text-sm font-medium hover:underline text-[var(--color-text-primary)]">
                  {item.client.nom}
                </Link>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {item.plan.nom} • {item.plan.siteNom}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: bgColor, color }}>
                  {item.plan.frequence}
                </span>
                {item.plan.meteo === 'pluie' && (
                  <span title="Temps de pluie requis"><CloudRain size={14} className="text-blue-400" /></span>
                )}
                {item.plan.meteo === 'sec' && (
                  <span title="Temps sec requis" className="text-sm leading-none">☀️</span>
                )}
                <Link to={`/missions/${item.client.id}/plan/${item.plan.id}`} onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors" title="Voir le plan">
                  <ExternalLink size={16} />
                </Link>
              </div>
            </div>
            {item.sampling.comment && (
              <div className="text-xs italic text-[var(--color-text-secondary)] mt-1 border-l-2 border-[var(--color-border-subtle)] pl-2">
                Motif : {item.sampling.comment}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface BilanMoisModalProps {
  onClose: () => void
  month: number
  year: number
  clients: Client[]
}

export default function BilanMoisModal({ onClose, month, year, clients }: BilanMoisModalProps) {
  const { planned, overdue, notDone, done } = useMemo(() => {
    const res = {
      planned: [] as { client: Client, plan: Plan, sampling: Sampling }[],
      overdue: [] as { client: Client, plan: Plan, sampling: Sampling }[],
      notDone: [] as { client: Client, plan: Plan, sampling: Sampling }[],
      done:    [] as { client: Client, plan: Plan, sampling: Sampling }[],
    }

    clients.forEach(client => {
      const planYear = client.annee ? parseInt(client.annee) : year
      if (isNaN(planYear) || planYear !== year) return

      client.plans.forEach(plan => {
        const isAuto = plan.methode === 'Automatique'
        plan.samplings.forEach(s => {
          if (s.plannedMonth === month) {
            if (s.status === 'done') {
              res.done.push({ client, plan, sampling: s })
            } else if (s.status === 'non_effectue') {
              res.notDone.push({ client, plan, sampling: s })
            } else if (isSamplingOverdue(s, year, isAuto)) {
              res.overdue.push({ client, plan, sampling: s })
            } else {
              res.planned.push({ client, plan, sampling: s })
            }
          }
        })
      })
    })

    return res
  }, [clients, month, year])

  const total = planned.length + overdue.length + notDone.length + done.length

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0"
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'var(--glass-scrim)',
          WebkitBackdropFilter: 'var(--glass-scrim)',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <m.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-0 flex flex-col overflow-hidden max-h-[85vh]"
          style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-modal)' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)] shrink-0 bg-[var(--color-bg-secondary)] z-10">
            <div>
              <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                Bilan de {MOIS_LONG[month]} {year}
              </h2>
              <p className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
                {total} prélèvement{total > 1 ? 's' : ''} au total ce mois-ci
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {total === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: COLORS.TEXT_SECONDARY }}>
                Rien de prévu sur ce mois.
              </p>
            ) : (
              <>
                <BilanSection title="En retard" list={overdue} icon={<AlertTriangle size={15} />} color={COLORS.DANGER} bgColor="var(--color-danger-light)" onClose={onClose} />
                <BilanSection title="À faire" list={planned} icon={<Circle size={15} />} color={COLORS.WARNING} bgColor="var(--color-warning-light)" onClose={onClose} />
                <BilanSection title="Non effectué" list={notDone} icon={<AlertCircle size={15} />} color="var(--color-neutral)" bgColor="var(--color-bg-tertiary)" onClose={onClose} />
                <BilanSection title="Fait" list={done} icon={<CheckCircle2 size={15} />} color={COLORS.SUCCESS} bgColor="var(--color-success-light)" onClose={onClose} />
              </>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  )
}
