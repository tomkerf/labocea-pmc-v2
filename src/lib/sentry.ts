import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  // Dev local (Vite HMR + Firestore reconnects transitoires) génère du bruit sans valeur — voir session 151
  if (import.meta.env.DEV) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `pmc-v2@${import.meta.env.VITE_APP_VERSION ?? 'unknown'}`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    ignoreErrors: [
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
    ],
  })
}

/**
 * Signale une erreur **interceptée**. Sentry ne capture automatiquement que les
 * erreurs non gérées : un `catch` qui se contente d'afficher un toast la fait
 * disparaître définitivement. C'est ce qui a rendu invisible pendant 10 jours
 * l'échec de planification d'un créneau (cf DEV_LOG 2026-08-06) — le message
 * utilisateur restait vague et l'erreur d'origine était perdue.
 *
 * `console.error` couvre le diagnostic local (Sentry est désactivé en dev).
 */
export function reportError(context: string, err: unknown) {
  console.error(`[${context}]`, err)
  Sentry.captureException(err, { tags: { context } })
}

export function setSentryUser(uid: string, role: string) {
  Sentry.setUser({ id: uid, role })
}

export function clearSentryUser() {
  Sentry.setUser(null)
}
