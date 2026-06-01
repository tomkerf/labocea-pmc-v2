import { CheckCircle2, X } from 'lucide-react'

export interface TourneeFinItem {
  samplingId: string
  clientNom: string
  siteNom: string
  status: 'done' | 'non_effectue'
  motif: string
}

interface Props {
  items: TourneeFinItem[]
  onRetour: () => void
}

export function TourneeFinEcran({ items, onRetour }: Props) {
  const done = items.filter(i => i.status === 'done').length
  const nonFait = items.filter(i => i.status === 'non_effectue').length

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="size-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'var(--color-success-light)' }}>
        <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Tournée terminée !
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        {items.length} prélèvement{items.length > 1 ? 's' : ''} · {done} réalisé{done > 1 ? 's' : ''}{nonFait > 0 ? `, ${nonFait} non effectué${nonFait > 1 ? 's' : ''}` : ''}
      </p>

      <div className="w-full max-w-sm rounded-xl overflow-hidden mb-8"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
        {items.map((item, i) => (
          <div key={item.samplingId}
            className="flex items-start gap-3 px-4 py-3"
            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
            {item.status === 'done'
              ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
              : <X size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
            }
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.clientNom} — {item.siteNom}
              </p>
              {item.motif && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.motif}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button type="button"
        onClick={onRetour}
        className="px-6 py-3 rounded-lg text-sm font-medium"
        style={{ background: 'var(--color-accent)', color: 'white' }}>
        Retour au dashboard
      </button>
    </div>
  )
}
