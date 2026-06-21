import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `pmc-v2@${import.meta.env.VITE_APP_VERSION ?? 'unknown'}`,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
}

export function setSentryUser(uid: string, role: string) {
  Sentry.setUser({ id: uid, role })
}

export function clearSentryUser() {
  Sentry.setUser(null)
}
