// Cloudflare Worker — Labocea PMC V2
// Sert le SPA React et expose un proxy sécurisé pour l'envoi des notifications push FCM.

// Cache pour les clés publiques Google JWK (validation token Firebase)
let googleJwksCache = null
let googleJwksExpiry = 0

async function getGoogleJwks() {
  const now = Date.now()
  if (googleJwksCache && now < googleJwksExpiry) {
    return googleJwksCache
  }
  const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
  if (!res.ok) throw new Error('Impossible de charger les clés Google JWK')
  const data = await res.json()
  googleJwksCache = data.keys
  googleJwksExpiry = now + 6 * 3600 * 1000 // Cache 6 heures
  return googleJwksCache
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  return atob(base64)
}

function textToBuffer(text) {
  return new Uint8Array([...text].map(c => c.charCodeAt(0)))
}

// Vérifie la signature cryptographique RS256 d'un Firebase ID Token
async function verifyAuthToken(idToken, projectId) {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('Token JWT invalide')

  const [headerB64, payloadB64, signatureB64] = parts
  const header = JSON.parse(base64urlDecode(headerB64))
  const payload = JSON.parse(base64urlDecode(payloadB64))

  // 1. Validation des claims obligatoires
  const now = Math.floor(Date.now() / 1000)
  if (payload.aud !== projectId) throw new Error('Audience invalide')
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Émetteur invalide')
  if (!payload.sub) throw new Error('Subject manquant')
  if (payload.exp < now) throw new Error('Token expiré')
  if (payload.iat > now + 60) throw new Error('Token iat invalide')

  // 2. Récupération de la clé JWK de signature
  const jwks = await getGoogleJwks()
  const jwk = jwks.find(k => k.kid === header.kid)
  if (!jwk) throw new Error('Clé de signature JWK introuvable')

  // 3. Import de la clé publique
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )

  // 4. Vérification de la signature
  const dataBuffer = textToBuffer(headerB64 + '.' + payloadB64)
  const signatureBuffer = new Uint8Array([...base64urlDecode(signatureB64)].map(c => c.charCodeAt(0)))

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signatureBuffer,
    dataBuffer
  )

  if (!isValid) throw new Error('Signature invalide')
  return payload
}

// Obtention d'un jeton d'accès Google OAuth2 (scopes multiples) via Service Account
async function getGoogleAccessToken(serviceAccount, scope) {
  const sa = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const tokenInput = `${headerB64}.${claimsB64}`

  // Parse de la clé privée PKCS#8
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r|\s/g, '')
  const keyBuffer = new Uint8Array([...atob(pem)].map(c => c.charCodeAt(0)))

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Signature du jeton d'assertion
  const dataBuffer = textToBuffer(tokenInput)
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    dataBuffer
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwtAssertion = `${tokenInput}.${signatureB64}`

  // Échange de l'assertion contre le token OAuth2
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtAssertion}`
  })

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text()
    throw new Error(`Google OAuth2 failed: ${errorText}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // ── Endpoint API d'envoi de notifications push ────────────────
    if (url.pathname === '/api/send-notification' && request.method === 'POST') {
      try {
        // 1. Validation de l'authentification de l'appelant
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ error: 'Authorization requise' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const idToken = authHeader.substring(7)
        // Récupération de l'ID projet Firebase (depuis Service Account)
        const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
        const projectId = sa.project_id

        await verifyAuthToken(idToken, projectId)

        // 2. Lecture du payload
        const { recipientUid, title, body, path } = await request.json()
        if (!recipientUid || typeof recipientUid !== 'string' || !title || !body) {
          return new Response(JSON.stringify({ error: 'Arguments recipientUid/title/body requis' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // 3. Récupérer les tokens FCM depuis Firestore (source de vérité — le client ne les fournit pas)
        if (!/^[A-Za-z0-9]{1,128}$/.test(recipientUid)) {
          return new Response(JSON.stringify({ error: 'recipientUid invalide' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const firestoreToken = await getGoogleAccessToken(
          env.FIREBASE_SERVICE_ACCOUNT,
          'https://www.googleapis.com/auth/datastore'
        )
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(recipientUid)}`
        const userRes = await fetch(firestoreUrl, {
          headers: { 'Authorization': `Bearer ${firestoreToken}` }
        })
        if (!userRes.ok) {
          return new Response(JSON.stringify({ error: 'Destinataire introuvable' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        const userDoc = await userRes.json()
        const pushTokensField = userDoc.fields?.pushTokens?.arrayValue?.values ?? []
        const tokens = pushTokensField.map(v => v.stringValue).filter(Boolean)

        if (tokens.length === 0) {
          return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no_tokens' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // 4. Récupération du jeton d'accès Google FCM
        const accessToken = await getGoogleAccessToken(
          env.FIREBASE_SERVICE_ACCOUNT,
          'https://www.googleapis.com/auth/firebase.messaging'
        )

        // 5. Envoi de la notification push à tous les jetons du destinataire
        const sendPromises = tokens.map(async (token) => {
          const fcmPayload = {
            message: {
              token,
              notification: { title, body },
              data: { url: path || '/' }
            }
          }

          return fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fcmPayload)
          })
        })

        const results = await Promise.all(sendPromises)
        const statuses = await Promise.all(results.map(r => r.status))

        return new Response(JSON.stringify({ success: true, sent: tokens.length, statuses }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (err) {
        console.error('[API Send Notification] Erreur :', err)
        return new Response(JSON.stringify({ error: 'Erreur interne' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Servir les assets statiques tels quels
    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404) return assetResponse

    // SPA fallback : toutes les routes → index.html
    const indexRequest = new Request(new URL('/index.html', url.origin), request)
    return env.ASSETS.fetch(indexRequest)
  },
}
