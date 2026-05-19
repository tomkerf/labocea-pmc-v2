import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Bug } from 'lucide-react'
import { db } from '@/lib/firebase'
import type { BugReport } from '@/types'

export function AdminBugsSection() {
  const [bugs, setBugs] = useState<BugReport[]>([])

  useEffect(() => {
    const q = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setBugs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as BugReport))
    })
  }, [])

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Problèmes signalés ({bugs.length})
      </h2>
      <div className="flex flex-col rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
        {bugs.length === 0 && (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun signalement.
          </p>
        )}
        {bugs.map((bug, i) => (
          <div key={bug.id} className="px-5 py-4 flex flex-col gap-1"
            style={{ borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bug size={13} strokeWidth={1.8} style={{ color: 'var(--color-text-tertiary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {bug.userInitiales || bug.userNom}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  · {bug.page}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {bug.createdAt?.toDate
                  ? bug.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {bug.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
