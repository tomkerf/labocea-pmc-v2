import { Plus, ChevronRight, Trash2, AlertTriangle, GripVertical, Minus, Lock, Unlock } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isSamplingOverdue } from '@/lib/overdue'
import type { Plan } from '@/types'

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
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Points de prélèvement
        </h2>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={onToggleLock}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: plansLocked ? 'var(--color-bg-tertiary)' : 'var(--color-accent-light)',
              color: plansLocked ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
              border: `1px solid ${plansLocked ? 'var(--color-border)' : 'var(--color-accent)'}`,
            }}
            title={plansLocked ? 'Déverrouiller pour réorganiser' : 'Verrouiller la réorganisation'}>
            {plansLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          {!plansLocked && (
            <>
              <button onClick={onAddSeparator}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                title="Ajouter un séparateur de section">
                <Minus size={14} /> Séparateur
              </button>
              <button onClick={onAddPlan}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                <Plus size={14} /> Ajouter
              </button>
            </>
          )}
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center gap-3 py-8"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-accent-light)' }}>
            <Plus size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Aucun point de prélèvement</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Crée le premier point pour commencer à planifier</p>
          </div>
          <button onClick={onAddPlan}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: 'var(--color-accent)', color: 'white' }}>
            <Plus size={14} /> Ajouter un point
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorder}>
          <SortableContext items={plans.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              {buildDisplayItems(plans).map((item, displayIdx) => {
                if (item.kind === 'header') {
                  return (
                    <div key={item.key}
                      className="px-4 py-1.5"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        borderTop: displayIdx === 0 ? 'none' : '1px solid var(--color-border-subtle)',
                        borderBottom: '1px solid var(--color-border-subtle)',
                      }}>
                      <span className="text-xs font-semibold uppercase"
                        style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>
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
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.background = 'var(--color-accent-light)' }}
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

// ── SortableSeparatorRow ─────────────────────────────────────

interface SortableSeparatorRowProps {
  plan: Plan
  isLast: boolean
  isConfirmingDelete: boolean
  locked?: boolean
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onLabelChange: (label: string) => void
}

function SortableSeparatorRow({
  plan, isLast, isConfirmingDelete, locked,
  onDelete, onConfirmDelete, onCancelDelete, onLabelChange,
}: SortableSeparatorRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button"
          {...(!locked ? { ...attributes, ...listeners } : {})}
          className="shrink-0 p-1 rounded touch-none"
          style={{ color: 'var(--color-text-tertiary)', cursor: locked ? 'default' : isDragging ? 'grabbing' : 'grab', opacity: locked ? 0.3 : 1 }}
          tabIndex={-1}
        >
          <GripVertical size={15} strokeWidth={1.8} />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <input
            value={plan.nom}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Section…"
            className="bg-transparent border-none outline-none text-center"
            style={{
              color: 'var(--color-text-tertiary)',
              fontSize: '11px',
              fontWeight: 500,
              minWidth: '40px',
              width: `${Math.max(60, (plan.nom.length || 4) * 7 + 24)}px`,
              letterSpacing: '0.03em',
            }}
          />
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        <button onClick={onDelete} className="shrink-0 p-1 rounded"
          style={{ color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => { if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {isConfirmingDelete && (
        <div className="flex items-center gap-2 mx-3 mb-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={13} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-danger)' }}>
            Supprimer ce séparateur ?
          </span>
          <button onClick={onConfirmDelete}
            className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ background: 'var(--color-danger)', color: 'white' }}>
            Supprimer
          </button>
          <button onClick={onCancelDelete}
            className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

// ── SortablePlanRow ──────────────────────────────────────────

interface SortablePlanRowProps {
  plan: Plan
  clientYear: number | undefined
  clientId: string
  isLast: boolean
  isConfirmingDelete: boolean
  locked?: boolean
  onOpen: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function SortablePlanRow({
  plan, clientYear, isLast, isConfirmingDelete, locked,
  onOpen, onDelete, onConfirmDelete, onCancelDelete,
}: SortablePlanRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })

  const overdueCount = (plan.samplings ?? []).filter((s) => isSamplingOverdue(s, clientYear)).length

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
        background: isDragging ? 'var(--color-accent-light)' : 'transparent',
      }}
      className="flex flex-col px-3 py-3 gap-2"
    >
      <div className="flex items-center gap-2">
        <button type="button"
          {...(!locked ? { ...attributes, ...listeners } : {})}
          className="shrink-0 p-1 rounded touch-none"
          style={{ color: 'var(--color-text-tertiary)', cursor: locked ? 'default' : isDragging ? 'grabbing' : 'grab', opacity: locked ? 0.3 : 1 }}
          title={locked ? 'Réorganisation verrouillée' : 'Glisser pour réorganiser'}
          tabIndex={-1}
        >
          <GripVertical size={15} strokeWidth={1.8} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {plan.nom || 'Point sans nom'}
            </p>
            {overdueCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 flex items-center gap-1"
                style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                <AlertTriangle size={10} />
                {overdueCount} en retard
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {[plan.siteNom, plan.frequence, plan.nature].filter(Boolean).join(' · ')}
          </p>
        </div>

        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
          {(plan.samplings ?? []).length} prélèv.
        </span>
        <button onClick={onOpen}
          className="shrink-0 flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}>
          Ouvrir <ChevronRight size={14} />
        </button>
        <button onClick={onDelete} className="shrink-0 p-1 rounded"
          style={{ color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => { if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {isConfirmingDelete && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={13} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-danger)' }}>
            Supprimer ce point et tous ses prélèvements ?
          </span>
          <button onClick={onConfirmDelete}
            className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ background: 'var(--color-danger)', color: 'white' }}>
            Supprimer
          </button>
          <button onClick={onCancelDelete}
            className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
