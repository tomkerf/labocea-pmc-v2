import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'

/**
 * Upload une photo de prélèvement dans Firebase Storage.
 * Chemin : samplings/{clientId}/{planId}/{samplingId}/{timestamp}.{ext}
 * Retourne l'URL de téléchargement publique (signée).
 */
export async function uploadSamplingPhoto(
  file: File,
  clientId: string,
  planId: string,
  samplingId: string,
): Promise<string> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `samplings/${clientId}/${planId}/${samplingId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}

/**
 * Supprime une photo depuis son URL de téléchargement.
 * L'URL Firebase Storage encode le chemin après "/o/" en URIComponent.
 */
export async function deleteSamplingPhoto(url: string): Promise<void> {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/)
    if (!match) return
    const path = decodeURIComponent(match[1])
    await deleteObject(ref(storage, path))
  } catch {
    // Si le fichier n'existe plus (déjà supprimé), on ignore silencieusement
  }
}
