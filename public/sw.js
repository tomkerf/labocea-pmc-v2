// ── Labocea PMC — Service Worker ──────────────────────────────
// Stratégie :
//   - Assets statiques (/assets/*, images, fonts) → Cache First
//   - Navigation HTML                              → Network First + fallback /index.html
//   - Firebase / Firestore / Auth                  → ignoré (SDK gère son cache IndexedDB)

const CACHE_VERSION = 'pmc-v2-14'
const CACHE_ASSETS  = `${CACHE_VERSION}-assets`
const CACHE_NAV     = `${CACHE_VERSION}-nav`

// ── Install : précache /index.html + skip waiting ─────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAV)
      .then(c => c.add('/index.html'))
      .then(() => self.skipWaiting())
  )
})

// ── Activate : purge les anciens caches ───────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.flatMap(k => k !== CACHE_ASSETS && k !== CACHE_NAV ? [caches.delete(k)] : [])
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return

  // Ignorer Firebase, Google APIs, extensions Chrome
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.protocol === 'chrome-extension:'
  ) return

  // ── Navigation (HTML) : Network First → fallback cache ──────
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAV).then(c => c.put('/index.html', clone))
          }
          return res
        })
        .catch(() =>
          caches.match('/index.html').then(cached => cached ?? Response.error())
        )
    )
    return
  }

  // ── Assets statiques : Cache First → réseau si absent ───────
  const isAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(png|svg|ico|webp|jpg|jpeg|woff2?|ttf)$/)

  if (isAsset) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_ASSETS).then(c => c.put(request, clone))
          }
          return res
        })
      })
    )
  }
})
