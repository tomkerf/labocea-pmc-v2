import { FileText, X } from 'lucide-react'

interface PdfPreviewModalProps {
  srcDoc: string
  onClose: () => void
  onPrint: () => void
}

export function PdfPreviewModal({ srcDoc, onClose, onPrint }: PdfPreviewModalProps) {
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
            Aperçu du rapport PDF
          </p>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={onPrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <FileText size={14} />
              Imprimer / Télécharger
            </button>
            <button type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
        <iframe
          sandbox=""
          srcDoc={srcDoc}
          className="flex-1 w-full"
          style={{ border: 'none', background: 'white' }}
          title="Aperçu PDF"
        />
      </div>
    </div>
  )
}
