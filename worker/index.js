// Cloudflare Worker — Labocea PMC V2
// Sert le SPA React et redirige toutes les routes vers index.html

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Servir les assets statiques tels quels
    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404) return assetResponse

    // SPA fallback : toutes les routes → index.html
    const indexRequest = new Request(new URL('/index.html', url.origin), request)
    return env.ASSETS.fetch(indexRequest)
  },
}
