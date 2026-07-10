const CHUNK_LOAD_ERRORS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module', // Firefox
  'Unable to preload CSS', // Vite CSS chunk
  'Load failed', // Safari
]

export const isChunkError = (msg: string) => CHUNK_LOAD_ERRORS.some(s => msg.includes(s))

// Évite une boucle de reload infinie si le SW continue de servir un chunk périmé
const CHUNK_RELOAD_FLAG = 'chunk-reload-attempted'

export function reloadOnceForChunkError() {
  if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return false
  sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1')
  window.location.reload()
  return true
}

// Le module s'exécute à chaque chargement complet de l'app : si on reste stable
// quelques secondes après un reload, on efface le flag pour ne pas désactiver
// le mécanisme suite à un simple incident réseau ponctuel.
window.setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_FLAG), 8000)
