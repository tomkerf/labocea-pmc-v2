import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore, selectAppUser, selectUid } from '@/stores/authStore'
import { logout } from '@/hooks/useAuth'
import { updateUserProfile } from '@/services/userService'
import type { AppUser } from '@/types'
import { COLORS } from '@/lib/constants'
import { CompteProfileSection } from '@/components/compte/CompteProfileSection'
import { CompteCalendarSection } from '@/components/compte/CompteCalendarSection'
import { PushNotificationsSection } from '@/components/compte/PushNotificationsSection'
import { ChangePasswordSection } from '@/components/compte/ChangePasswordSection'

const DEBOUNCE = 600

export default function ComptePage() {
  const appUser    = useAuthStore(selectAppUser)
  const setAppUser = useAuthStore(s => s.setAppUser)
  const uid        = useAuthStore(selectUid)
  const navigate   = useNavigate()
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Génère le calendarToken si absent
  const calendarToken = appUser?.calendarToken
  useState(() => {
    if (uid && appUser && !appUser.calendarToken) {
      const token = crypto.randomUUID()
      const updated = { ...appUser, calendarToken: token }
      setAppUser(updated)
      updateUserProfile(uid, { calendarToken: token })
    }
  })

  const feedUrl = uid && calendarToken
    ? `${window.location.origin}/api/calendar/${uid}/${calendarToken}.ics`
    : ''

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function triggerSave(updated: AppUser) {
    setAppUser(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!updated.uid) return
      setSaving(true)
      try {
        await updateUserProfile(updated.uid, {
          prenom:      updated.prenom,
          nom:         updated.nom,
          initiales:   updated.initiales,
          avatarColor: updated.avatarColor ?? null,
        })
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE)
  }

  function update(field: keyof AppUser, value: string) {
    if (!appUser) return
    triggerSave({ ...appUser, [field]: value })
  }

  function copyFeedUrl() {
    if (!feedUrl) return
    navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Mon compte</h1>
        {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
      </div>

      <CompteProfileSection appUser={appUser} onUpdate={update} />
      <PushNotificationsSection />
      <ChangePasswordSection email={appUser?.email ?? ''} />
      <CompteCalendarSection feedUrl={feedUrl} copied={copied} onCopy={copyFeedUrl} />

      <button type="button" onClick={handleLogout}
        className="flex items-center gap-2 w-full px-5 py-4 rounded-xl text-sm font-medium"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.DANGER, boxShadow: 'var(--shadow-card)' }}>
        <LogOut size={16} />
        Se déconnecter
      </button>
    </div>
  )
}
