import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { Bug } from 'lucide-react'
import { db } from '@/lib/firebase'
import type { BugReport } from '@/types'

async function markTraite(id: string) {
  await updateDoc(doc(db, 'bugs', id), { status: 'traite' })
}

export function AdminBugsSection() {
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [showTraites, setShowTraites] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setBugs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as BugReport))
    })
  }, [])

  const ouverts = bugs.filter(b => b.status !== 'traite')
  const traites = bugs.filter(b => b.status === 'traite')
  const visible = showTraites ? bugs : ouverts

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Problèmes signalés ({ouverts.length})
      </h2>
      <div className="flex flex-col rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
        {ouverts.length === 0 && !showTraites && (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun signalement en attente.
          </p>
        )}
        {visible.map((bug, i) => (
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
              <div className="flex items-center gap-2">
                {bug.status === 'traite' ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                    Traité
                  </span>
                ) : (
                  <button type="button" onClick={() => markTraite(bug.id)}
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                    Marquer traité
                  </button>
                )}
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {bug.createdAt?.toDate
                    ? bug.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {bug.description}
            </p>
          </div>
        ))}
        {traites.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: visible.length > 0 || ouverts.length === 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
            <button type="button" onClick={() => setShowTraites(v => !v)}
              className="text-xs" style={{ color: 'var(--color-accent)' }}>
              {showTraites ? 'Masquer les traités' : `Voir les ${traites.length} traité${traites.length > 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
