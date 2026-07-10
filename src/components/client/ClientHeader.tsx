import { ChevronLeft, Trash2, AlertTriangle, FileDown } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import { buildClientReportHtml } from '@/lib/exportClientHtml'
import type { Client, AppUser } from '@/types'
import { COLORS } from '@/lib/constants'


interface Props {
  client: Client
  saving: boolean
  remoteChanged: { byName: string } | null
  confirmDelete: boolean
  users: AppUser[]
  onBack: () => void
  onReload: () => void
  onDismissRemoteChanged: () => void
  onSetConfirmDelete: (v: boolean) => void
  onDelete: () => void
  onPdfPreview: (html: string) => void
}

export function ClientHeader({
  client, saving, remoteChanged, confirmDelete, users,
  onBack, onReload, onDismissRemoteChanged,
  onSetConfirmDelete, onDelete, onPdfPreview,
}: Props) {
  return (
    <>
      <button type="button" onClick={onBack}
        aria-label="Retour aux missions"
        className="flex items-center gap-1 text-sm mb-6"
        style={{ color: COLORS.ACCENT }}>
        <ChevronLeft size={16} /> Missions
      </button>

      {remoteChanged && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={15} />
            Modifié par <strong>{remoteChanged.byName}</strong> pendant votre édition.
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onReload} className="font-semibold underline underline-offset-2">
              Recharger
            </button>
            <button type="button" onClick={onDismissRemoteChanged}
              style={{ color: COLORS.TEXT_SECONDARY }} className="text-xs">
              Ignorer
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
          {client.nom || 'Client sans nom'}
        </h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {saving && <span className="text-xs mr-1" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}

          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button"
              onClick={() => {
                try { onPdfPreview(buildClientReportHtml(client, users)) }
                catch { toast.error('Erreur lors de la génération du rapport.') }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ color: COLORS.ACCENT, background: 'var(--color-accent-light)' }}>
              <FileDown size={13} />
              PDF
            </button>

            <button type="button"
              onClick={async () => {
                try {
                  const { exportClientExcel } = await import('@/lib/exportExcel')
                  exportClientExcel(client)
                } catch (err) {
                  console.error('[Excel export]', err)
                  toast.error('Erreur Excel : ' + (err instanceof Error ? err.message : String(err)))
                }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ color: '#217346', background: '#E8F5EC' }}>
              <FileDown size={13} />
              Excel
            </button>
          </div>

          {!confirmDelete ? (
            <button type="button" onClick={() => onSetConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ml-auto sm:ml-3 sm:pl-3"
              style={{ color: COLORS.DANGER, background: 'var(--color-danger-light)', borderLeft: '1px solid var(--color-border)' }}>
              <Trash2 size={13} /> Supprimer
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg ml-auto sm:ml-3"
              style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
              <AlertTriangle size={13} style={{ color: COLORS.DANGER }} />
              <span className="text-xs font-medium" style={{ color: COLORS.DANGER }}>
                Supprimer définitivement ?
              </span>
              <button type="button" onClick={onDelete}
                className="text-xs font-semibold px-2 py-0.5 rounded"
                style={{ background: COLORS.DANGER, color: 'white' }}>
                Oui
              </button>
              <button type="button" onClick={() => onSetConfirmDelete(false)}
                className="text-xs font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
