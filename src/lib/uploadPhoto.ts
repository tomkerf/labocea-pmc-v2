import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'

/**
 * Assure que le fichier est bien au format standard (convertit le HEIC/HEIF en JPEG
 * à la volée via un import dynamique de heic2any pour ne pas alourdir le bundle initial).
 */
async function processImageFile(file: File): Promise<{ data: File | Blob; ext: string; contentType: string }> {
  const nameLower = file.name.toLowerCase()
  const isHeic = nameLower.endsWith('.heic') || nameLower.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif'

  if (isHeic) {
    try {
      const heic2any = (await import('heic2any')).default
      const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.85
      })
      const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult
      return {
        data: blob,
        ext: 'jpg',
        contentType: 'image/jpeg'
      }
    } catch (err) {
      console.error('[HEIC Conversion Failed]', err)
    }
  }

  // Fallback et nettoyage MIME type vide ou application/octet-stream pour passer les règles Storage
  let contentType = file.type
  if (!contentType || contentType === 'application/octet-stream') {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (ext === 'png') contentType = 'image/png'
    else if (ext === 'webp') contentType = 'image/webp'
    else if (ext === 'gif') contentType = 'image/gif'
    else contentType = 'image/jpeg'
  }

  return {
    data: file,
    ext: file.name.split('.').pop()?.toLowerCase() ?? 'jpg',
    contentType
  }
}

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
  const { data, ext, contentType } = await processImageFile(file)
  const path = `samplings/${clientId}/${planId}/${samplingId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, data, { contentType })
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
  const { data, ext, contentType } = await processImageFile(file)
  const path = `visites/${visiteId}/${pointId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, data, { contentType })
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
  const { data, ext, contentType } = await processImageFile(file)
  const path = `plans/${clientId}/${planId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, data, { contentType })
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

