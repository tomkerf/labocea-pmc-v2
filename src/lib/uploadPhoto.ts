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

/**
 * Upload une photo de visite préliminaire dans Firebase Storage.
 * Chemin : visites/{visiteId}/{pointId}/{timestamp}.{ext}
 */
export async function uploadVisitePhoto(
  file: File,
  visiteId: string,
  pointId: string,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `visites/${visiteId}/${pointId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}

/**
 * Supprime une photo de visite depuis son URL.
 */
export async function deleteVisitePhoto(url: string): Promise<void> {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/)
    if (!match) return
    const path = decodeURIComponent(match[1])
    await deleteObject(ref(storage, path))
  } catch {
    // Fichier déjà supprimé — ignorer silencieusement
  }
}

/**
 * Upload une photo de plan dans Firebase Storage.
 * Chemin : plans/{clientId}/{planId}/{timestamp}.{ext}
 */
export async function uploadPlanPhoto(
  file: File,
  clientId: string,
  planId: string,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `plans/${clientId}/${planId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}

/**
 * Supprime une photo de plan depuis son URL.
 */
export async function deletePlanPhoto(url: string): Promise<void> {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/)
    if (!match) return
    const path = decodeURIComponent(match[1])
    await deleteObject(ref(storage, path))
  } catch {
    // Ignorer silencieusement
  }
}

