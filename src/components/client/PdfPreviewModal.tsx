import { FileDown, X } from 'lucide-react'
import { buildClientReportHtml } from '@/lib/exportClientHtml'
import type { Client, AppUser } from '@/types'

interface Props {
  html: string
  client: Client
  users: AppUser[]
  onClose: () => void
}

export function PdfPreviewModal({ html, client, users, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col m-4 md:m-8 rounded-2xl overflow-hidden flex-1"
        style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)', maxHeight: 'calc(100dvh - 32px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Aperçu du rapport
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const printHtml = buildClientReportHtml(client, users, true)
                const w = window.open('', '_blank')
                if (w) { w.document.write(printHtml); w.document.close() }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <FileDown size={14} />
              Imprimer / Télécharger
            </button>
            <button
              onClick={onClose}
              aria-label="Fermer l'aperçu"
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
        <iframe
          srcDoc={html}
          className="flex-1 w-full"
          style={{ border: 'none' }}
          title="Aperçu rapport"
        />
      </div>
    </div>
  )
}
