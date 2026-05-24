import { Cloud, CloudOff, CloudUpload } from 'lucide-react'
import { useSyncStore, getSyncStatus } from '@/stores/syncStore'

interface SyncBadgeProps {
  className?: string
}

export default function SyncBadge({ className = '' }: SyncBadgeProps) {
  const pendingWrites = useSyncStore((s) => s.pendingWrites)
  const isOnline      = useSyncStore((s) => s.isOnline)
  const status        = getSyncStatus({ isOnline, pendingWrites })

  const tooltips = {
    synced:  'Données synchronisées',
    syncing: 'Synchronisation en cours...',
    offline: 'Hors connexion — modifications sauvegardées localement',
  }

  return (
    <span
      title={tooltips[status]}
      aria-label={tooltips[status]}
      className={`flex items-center justify-center ${className}`}
    >
      {status === 'synced' && (
        <span className="relative flex items-center">
          <Cloud size={16} strokeWidth={1.5} style={{ color: 'var(--color-success)' }} />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-success)' }}
          >
            <svg width="5" height="5" viewBox="0 0 5 5" fill="none">
              <path d="M1 2.5L2 3.5L4 1.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </span>
      )}
      {status === 'syncing' && (
        <CloudUpload
          size={16}
          strokeWidth={1.5}
          className="animate-pulse"
          style={{ color: 'var(--color-text-tertiary)' }}
        />
      )}
      {status === 'offline' && (
        <CloudOff
          size={16}
          strokeWidth={1.5}
          style={{ color: 'var(--color-text-tertiary)' }}
        />
      )}
    </span>
  )
}
