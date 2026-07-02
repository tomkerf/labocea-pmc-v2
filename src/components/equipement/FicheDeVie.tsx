import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, FileText, Gauge, Wrench, Package, Plus, StickyNote } from 'lucide-react'
import type { Equipement, Verification, Maintenance, FicheDeVieNote } from '@/types'
import { COLORS } from '@/lib/constants'
import { exportFicheDeViePDF, VERIF_TYPE, MAINT_TYPE } from './ficheDeVieExport'
import type { TimelineEntry } from './ficheDeVieExport'
import { FicheDeVieTimelineRow } from './FicheDeVieTimelineRow'
import { FicheDeVieNoteForm } from './FicheDeVieNoteForm'
import { FicheDeVieVerifForm } from './FicheDeVieVerifForm'

export function FicheDeVie({ equipement, verifications, maintenances, onAddNote, onUpdateNote, onDeleteNote, onAddVerification, initiales, uid, equipementId, equipementNom }: {
  equipement: Equipement
  verifications: Verification[]
  maintenances: Maintenance[]
  onAddNote: (note: FicheDeVieNote) => void
  onUpdateNote: (id: string, note: FicheDeVieNote) => void
  onDeleteNote: (id: string) => void
  onAddVerification: (v: Verification) => Promise<void>
  initiales: string
  uid: string
  equipementId: string
  equipementNom: string
}) {
  const navigate = useNavigate()
  const [showForm,    setShowForm]    = useState(false)
  const [editingNote, setEditingNote] = useState<FicheDeVieNote | null>(null)
  const [showVerif,   setShowVerif]   = useState(false)

  function handleEditNoteClick(n: FicheDeVieNote) {
    setEditingNote(n); setShowForm(true); setShowVerif(false)
  }

  function handleCancelNote() {
    setShowForm(false); setEditingNote(null)
  }

  function handleSaveNote(note: FicheDeVieNote) {
    if (editingNote) {
      onUpdateNote(editingNote.id, note)
    } else {
      onAddNote(note)
    }
    handleCancelNote()
  }

  const anciennete = (() => {
    if (!equipement.dateAcquisition) return null
    // Ancienneté lue à l'instant du render, volontairement — SPA sans SSR, valeur d'affichage
    // eslint-disable-next-line react-hooks/purity
    const ms = Date.now() - new Date(equipement.dateAcquisition).getTime()
    const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
    const years  = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    if (years === 0) return `${months} mois`
    if (months === 0) return `${years} an${years > 1 ? 's' : ''}`
    return `${years} an${years > 1 ? 's' : ''} ${months} mois`
  })()

  const entries: TimelineEntry[] = [
    ...(equipement.dateAcquisition
      ? [{ kind: 'acquisition' as const, date: equipement.dateAcquisition }]
      : []),
    ...verifications.map((v) => ({ kind: 'verification' as const, date: v.date, data: v })),
    ...maintenances.flatMap((m) => (m.dateRealisee || m.datePrevue) ? [{ kind: 'maintenance' as const, date: (m.dateRealisee || m.datePrevue) as string, data: m }] : []),
    ...(equipement.ficheDeVieNotes ?? []).map((n) => ({ kind: 'note' as const, date: n.date, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Fiche de vie
          </h2>
          {anciennete && (
            <span className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}>
              <Clock size={11} />
              {anciennete}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => exportFicheDeViePDF(equipement, entries)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <FileText size={12} /> Exporter PDF
          </button>
          <button type="button"
            onClick={() => { setShowVerif(v => !v); setShowForm(false); setEditingNote(null) }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: showVerif ? 'var(--color-success-light)' : COLORS.BG_TERTIARY, color: showVerif ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <Gauge size={12} /> Vérification
          </button>
          <button type="button"
            onClick={() => {
              if (showForm) { handleCancelNote() }
              else { handleCancelNote(); setShowForm(true); setShowVerif(false) }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: showForm ? 'var(--color-accent-light)' : COLORS.BG_TERTIARY, color: showForm ? COLORS.ACCENT : COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
            <Plus size={12} /> Note
          </button>
        </div>
      </div>

      {/* Formulaire note */}
      {(showForm || editingNote) && (
        <FicheDeVieNoteForm
          key={editingNote?.id ?? 'new'}
          editingNote={editingNote}
          initiales={initiales}
          onSave={handleSaveNote}
          onCancel={handleCancelNote}
        />
      )}

      {/* Formulaire vérification */}
      {showVerif && (
        <FicheDeVieVerifForm
          equipementId={equipementId}
          equipementNom={equipementNom}
          uid={uid}
          initiales={initiales}
          onSave={onAddVerification}
          onCancel={() => setShowVerif(false)}
        />
      )}

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="rounded-xl px-5 py-6 text-sm text-center"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-tertiary)' }}>
          Aucun événement enregistré. Ajoutez une note ou saisissez une vérification métrologique.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1
            const dateLabel = new Date(entry.date + 'T12:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            })

            if (entry.kind === 'acquisition') {
              return (
                <FicheDeVieTimelineRow key="acquisition" isLast={isLast}
                  icon={<Package size={14} />}
                  iconBg={COLORS.BG_TERTIARY} iconColor={COLORS.TEXT_SECONDARY}
                  date={dateLabel} title="Acquisition de l'équipement" badge={null}
                />
              )
            }

            if (entry.kind === 'verification') {
              const v = entry.data
              const isOk = v.resultat === 'conforme'
              const isNok = v.resultat === 'non_conforme'
              return (
                <FicheDeVieTimelineRow key={v.id} isLast={isLast}
                  icon={<Gauge size={14} />}
                  iconBg={isOk ? 'var(--color-success-light)' : isNok ? 'var(--color-danger-light)' : 'var(--color-warning-light)'}
                  iconColor={isOk ? COLORS.SUCCESS : isNok ? COLORS.DANGER : COLORS.WARNING}
                  date={dateLabel}
                  title={VERIF_TYPE[v.type] ?? v.type}
                  subtitle={[v.technicienNom, v.remarques].filter(Boolean).join(' · ')}
                  badge={
                    isOk  ? { label: 'Conforme',     bg: 'var(--color-success-light)', color: COLORS.SUCCESS } :
                    isNok ? { label: 'Non conforme',  bg: 'var(--color-danger-light)',  color: COLORS.DANGER  } :
                            { label: 'À reprendre',   bg: 'var(--color-warning-light)', color: COLORS.WARNING }
                  }
                  onEdit={() => navigate(`/metrologie/${v.id}`)}
                />
              )
            }

            if (entry.kind === 'note') {
              const n = entry.data
              return (
                <FicheDeVieTimelineRow key={n.id} isLast={isLast}
                  icon={<StickyNote size={14} />}
                  iconBg="var(--color-accent-light)" iconColor={COLORS.ACCENT}
                  date={dateLabel}
                  title={n.titre}
                  subtitle={[n.auteur, n.notes].filter(Boolean).join(' · ')}
                  badge={null}
                  onDelete={() => onDeleteNote(n.id)}
                  onEdit={() => handleEditNoteClick(n)}
                />
              )
            }

            const m = entry.data
            const isDone = m.statut === 'realisee'
            let maintDateLabel = dateLabel
            if (m.datePrevue && m.dateRealisee && m.datePrevue !== m.dateRealisee) {
              const start = new Date(m.datePrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              const end   = new Date(m.dateRealisee + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              maintDateLabel = m.type === 'panne' ? `Panne le ${start} — Retour le ${end}` : `Du ${start} au ${end}`
            }

            return (
              <FicheDeVieTimelineRow key={m.id} isLast={isLast}
                icon={<Wrench size={14} />}
                iconBg={isDone ? COLORS.BG_TERTIARY : 'var(--color-warning-light)'}
                iconColor={isDone ? COLORS.TEXT_SECONDARY : COLORS.WARNING}
                date={maintDateLabel}
                title={m.type === 'panne' && m.description ? `Panne : ${m.description}` : MAINT_TYPE[m.type] ?? m.type}
                subtitle={[m.technicienNom, m.type === 'panne' && m.description ? m.travauxRealises : (m.travauxRealises || m.description)].filter(Boolean).join(' · ')}
                badge={
                  isDone
                    ? { label: 'Réalisée',  bg: COLORS.BG_TERTIARY,   color: COLORS.TEXT_SECONDARY }
                    : { label: 'Planifiée', bg: 'var(--color-warning-light)', color: COLORS.WARNING }
                }
                onEdit={() => navigate(`/maintenances/${m.id}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
