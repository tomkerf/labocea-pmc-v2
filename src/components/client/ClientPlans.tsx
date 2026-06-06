import { Plus, Minus, Lock, Unlock } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Plan } from '@/types'
import { COLORS } from '@/lib/constants'
import SortableSeparatorRow from '@/components/client/SortableSeparatorRow'
import SortablePlanRow from '@/components/client/SortablePlanRow'


interface Props {
  plans: Plan[]
  clientId: string
  clientYear: number | undefined
  plansLocked: boolean
  confirmDeletePlanId: string | null
  onToggleLock: () => void
  onAddPlan: () => void
  onAddSeparator: () => void
  onReorder: (event: DragEndEvent) => void
  onOpen: (planId: string) => void
  onRequestDelete: (planId: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onSeparatorLabel: (planId: string, label: string) => void
}

export function ClientPlans({
  plans, clientId, clientYear, plansLocked, confirmDeletePlanId,
  onToggleLock, onAddPlan, onAddSeparator, onReorder,
  onOpen, onRequestDelete, onConfirmDelete, onCancelDelete, onSeparatorLabel,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
  )

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
          Points de prélèvement
        </h2>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={onToggleLock}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: plansLocked ? COLORS.BG_TERTIARY : 'var(--color-accent-light)',
              color: plansLocked ? 'var(--color-text-tertiary)' : COLORS.ACCENT,
              border: `1px solid ${plansLocked ? COLORS.BORDER : COLORS.ACCENT}`,
            }}
            aria-label={plansLocked ? 'Déverrouiller pour réorganiser' : 'Verrouiller la réorganisation'}
            title={plansLocked ? 'Déverrouiller pour réorganiser' : 'Verrouiller la réorganisation'}>
            {plansLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          {!plansLocked && (
            <>
              <button type="button" onClick={onAddSeparator}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}
                title="Ajouter un séparateur de section">
                <Minus size={14} /> Séparateur
              </button>
              <button type="button" onClick={onAddPlan}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                <Plus size={14} /> Ajouter
              </button>
            </>
          )}
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center gap-3 py-8"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div className="size-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-accent-light)' }}>
            <Plus size={20} style={{ color: COLORS.ACCENT }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>Aucun point de prélèvement</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Crée le premier point pour commencer à planifier</p>
          </div>
          <button type="button" onClick={onAddPlan}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: COLORS.ACCENT, color: 'white' }}>
            <Plus size={14} /> Ajouter un point
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorder}>
          <SortableContext items={plans.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="rounded-xl overflow-hidden"
              style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              {buildDisplayItems(plans).map((item, displayIdx) => {
                if (item.kind === 'header') {
                  return (
                    <div key={item.key}
                      className="px-4 py-1.5"
                      style={{
                        background: COLORS.BG_TERTIARY,
                        borderTop: displayIdx === 0 ? 'none' : '1px solid var(--color-border-subtle)',
                        borderBottom: '1px solid var(--color-border-subtle)',
                      }}>
                      <span className="text-xs font-semibold uppercase"
                        style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.05em' }}>
                        {item.site}
                      </span>
                    </div>
                  )
                }
                const { plan, origIdx } = item
                const isLast = origIdx === plans.length - 1
                return plan.separator
                  ? <SortableSeparatorRow
                      key={plan.id}
                      plan={plan}
                      isLast={isLast}
                      locked={plansLocked}
                      onDelete={() => onRequestDelete(plan.id)}
                      onConfirmDelete={onConfirmDelete}
                      onCancelDelete={onCancelDelete}
                      isConfirmingDelete={confirmDeletePlanId === plan.id}
                      onLabelChange={(label) => onSeparatorLabel(plan.id, label)}
                    />
                  : <SortablePlanRow
                      key={plan.id}
                      plan={plan}
                      clientYear={clientYear}
                      clientId={clientId}
                      isLast={isLast}
                      locked={plansLocked}
                      isConfirmingDelete={confirmDeletePlanId === plan.id}
                      onOpen={() => onOpen(plan.id)}
                      onDelete={() => onRequestDelete(plan.id)}
                      onConfirmDelete={onConfirmDelete}
                      onCancelDelete={onCancelDelete}
                    />
              })}
              {/* Carte dashed — toujours visible pour ajouter un point */}
              <button type="button"
                onClick={onAddPlan}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
                style={{
                  borderTop: '1px solid var(--color-border-subtle)',
                  borderStyle: 'dashed',
                  color: 'var(--color-text-tertiary)',
                  background: 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = COLORS.ACCENT; e.currentTarget.style.background = 'var(--color-accent-light)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Plus size={14} /> Ajouter un point
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ── Helper ───────────────────────────────────────────────────

type DisplayHeader = { kind: 'header'; site: string; key: string }
type DisplayPlan   = { kind: 'plan';   plan: Plan; origIdx: number }
type DisplayItem   = DisplayHeader | DisplayPlan

function buildDisplayItems(plans: Plan[]): DisplayItem[] {
  const result: DisplayItem[] = []
  let lastSite = ''
  let headerCount = 0
  plans.forEach((plan, origIdx) => {
    if (!plan.separator && plan.siteNom && plan.siteNom !== lastSite) {
      result.push({ kind: 'header', site: plan.siteNom, key: `hdr-${plan.siteNom}-${headerCount++}` })
      lastSite = plan.siteNom
    }
    result.push({ kind: 'plan', plan, origIdx })
  })
  return result
}

