import { Bell, BellOff, LoaderCircle } from 'lucide-react'
import usePushNotifications from '@/hooks/usePushNotifications'
import { COLORS } from '@/lib/constants'

export function PushNotificationsSection() {
  const { isSupported, permission, isPushEnabled, loading, enableNotifications, disableNotifications } = usePushNotifications()

  if (!isSupported) {
    return (
      <div className="rounded-xl mb-4 px-5 py-4 flex items-center gap-3 text-sm"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_SECONDARY }}>
        <BellOff size={18} style={{ color: 'var(--color-text-tertiary)' }} />
        <div>
          <p className="font-semibold">Notifications indisponibles</p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Ton navigateur ou ton appareil ne supporte pas les notifications push.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl mb-4 px-5 py-4 flex flex-col gap-3"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={18} style={{ color: isPushEnabled ? COLORS.ACCENT : COLORS.TEXT_SECONDARY }} />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Notifications Push</h3>
            <p className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>Recevoir les changements de planning</p>
          </div>
        </div>
        <button type="button"
          onClick={isPushEnabled ? disableNotifications : enableNotifications}
          disabled={loading}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          style={{ backgroundColor: isPushEnabled ? COLORS.ACCENT : COLORS.BORDER, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          <span
            className="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            style={{ transform: isPushEnabled ? 'translateX(20px)' : 'translateX(0px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading && <LoaderCircle size={10} className="animate-spin" style={{ color: COLORS.ACCENT }} />}
          </span>
        </button>
      </div>
      {permission === 'denied' && (
        <p className="text-xs" style={{ color: COLORS.DANGER }}>
          Les notifications sont bloquées par ton navigateur. Active-les dans les paramètres du site.
        </p>
      )}
    </div>
  )
}
