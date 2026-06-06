import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Preleveur } from '@/stores/preleveursStore'
import { useUsersStore } from '@/stores/usersStore'
import { getTechColor } from '@/lib/planningUtils'
import UserAvatar from '@/components/ui/UserAvatar'
import { COLORS, COLLECTIONS } from '@/lib/constants'
import { toast } from '@/stores/toastStore'
import { MapPin, Plus, Trash2 } from 'lucide-react'

const SITES = ['Quimper', 'Brest']

async function savePreleveurs(list: Preleveur[]) {
  await setDoc(doc(db, COLLECTIONS.PRELEVEURS, 'data'), { list })
}

export function AdminPreleveurs() {
  const { users } = useUsersStore()
  const [saving, setSaving] = useState(false)
  const [localList, setLocalList] = useState<Preleveur[]>([])

  // Sync from Firestore on mount
  useEffect(() => {
    const unsub = onSnapshot(doc(db, COLLECTIONS.PRELEVEURS, 'data'), snap => {
      const list = (snap.data()?.list ?? []) as Preleveur[]
      setLocalList(list.toSorted((a, b) => a.code.localeCompare(b.code)))
    })
    return () => unsub()
  }, [])

  const preleveurCodes = new Set(localList.map(p => p.code))

  // Users not yet in the preleveurs list
  const unlistedUsers = users.filter(u => !preleveurCodes.has(u.initiales))

  async function addUser(initiales: string, nom: string, prenom: string) {
    const newEntry: Preleveur = {
      id: initiales.toLowerCase(),
      code: initiales,
      nom: `${prenom} ${nom}`,
      site: '',
    }
    const newList = [...localList, newEntry].toSorted((a, b) => a.code.localeCompare(b.code))
    setSaving(true)
    try {
      await savePreleveurs(newList)
      toast.success(`${initiales} ajouté`)
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function setSite(code: string, site: string) {
    const newList = localList.map(p => p.code === code ? { ...p, site } : p)
    setSaving(true)
    try {
      await savePreleveurs(newList)
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function remove(code: string) {
    const newList = localList.filter(p => p.code !== code)
    setSaving(true)
    try {
      await savePreleveurs(newList)
      toast.success(`${code} retiré`)
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3"
        style={{ color: COLORS.TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Préleveurs — Planning ({localList.length})
      </h2>

      {/* Liste actuelle */}
      <div className="flex flex-col rounded-xl overflow-hidden mb-4"
        style={{ border: '1px solid var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}>
        {localList.length === 0 && (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun préleveur configuré.
          </p>
        )}
        {localList.map((p, i) => {
          const tc = getTechColor(p.code)
          return (
            <div key={p.code}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
              <UserAvatar initiales={p.code} color={tc.color} size={32} fontSize={11} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
                  {p.nom}
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                    {p.code}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                <div className="flex gap-1">
                  {SITES.map(site => (
                    <button
                      key={site}
                      type="button"
                      disabled={saving}
                      onClick={() => setSite(p.code, p.site === site ? '' : site)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: p.site === site ? COLORS.ACCENT : COLORS.BG_TERTIARY,
                        color: p.site === site ? 'white' : COLORS.TEXT_SECONDARY,
                        border: `1px solid ${p.site === site ? 'transparent' : 'var(--color-border-subtle)'}`,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      {site}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => remove(p.code)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--color-danger)', background: 'transparent', cursor: saving ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                title={`Retirer ${p.code}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Utilisateurs à ajouter */}
      {unlistedUsers.length > 0 && (
        <>
          <p className="text-xs mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>
            Comptes non inclus dans le planning :
          </p>
          <div className="flex flex-col rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}>
            {unlistedUsers.map((u, i) => (
              <div key={u.uid}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <UserAvatar initiales={u.initiales} color={u.avatarColor} size={32} fontSize={11} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
                    {u.prenom} {u.nom}
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                      {u.initiales}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => addUser(u.initiales, u.nom, u.prenom)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: 'var(--color-accent-light)',
                    color: COLORS.ACCENT,
                    border: '1px solid transparent',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Plus size={12} />
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
