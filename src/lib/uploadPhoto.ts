import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { toast } from '@/stores/toastStore'

// Aligné sur les règles Storage (storage.rules) : size < 10 Mo et contentType image/*.
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 Mo
// Au-delà, on ne tente même pas de compresser (fichier probablement corrompu ou hors format photo).
const ABSOLUTE_MAX_BYTES = 40 * 1024 * 1024 // 40 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']

/**
 * Erreur de validation levée AVANT tout upload (mauvais type ou fichier trop volumineux
 * même après tentative de compression). Les appelants peuvent afficher `error.message`
 * tel quel dans un toast : il est clair pour l'utilisateur.
 */
export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageValidationError'
  }
}

function validateImageFile(file: File): void {
  if (file.size > ABSOLUTE_MAX_BYTES) {
    throw new ImageValidationError(`Fichier trop volumineux (max 40 Mo, reçu ${(file.size / 1024 / 1024).toFixed(1)} Mo)`)
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isAllowedExt = ALLOWED_EXTS.includes(ext)
  const isAllowedType = !file.type || ALLOWED_TYPES.includes(file.type)
  if (!isAllowedExt && !isAllowedType) {
    throw new ImageValidationError(`Format non supporté : ${file.type || ext || 'inconnu'}. Formats acceptés : JPEG, PNG, WEBP, GIF, HEIC.`)
  }
}

/**
 * Réduit une image (redimensionnement + baisse de qualité JPEG progressive) jusqu'à
 * passer sous `targetBytes`, ou abandonne après quelques tentatives.
 */
async function compressImage(blob: Blob, targetBytes: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  let width = bitmap.width
  let height = bitmap.height
  let quality = 0.85
  let output: Blob = blob

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) break
    ctx.drawImage(bitmap, 0, 0, width, height)
    const attemptBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!attemptBlob) break
    output = attemptBlob
    if (output.size <= targetBytes) break
    if (quality > 0.5) quality -= 0.15
    else { width = Math.round(width * 0.8); height = Math.round(height * 0.8) }
  }

  bitmap.close()
  return output
}

/**
 * Assure que le fichier est bien au format standard (convertit le HEIC/HEIF en JPEG
 * à la volée via un import dynamique de heic-to pour ne pas alourdir le bundle initial),
 * puis compresse automatiquement si le résultat dépasse la limite d'upload (10 Mo).
 */
async function processImageFile(file: File): Promise<{ data: File | Blob; ext: string; contentType: string }> {
  const nameLower = file.name.toLowerCase()
  const isHeic = nameLower.endsWith('.heic') || nameLower.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif'

  let result: { data: File | Blob; ext: string; contentType: string }

  if (isHeic) {
    try {
      const { heicTo } = await import('heic-to')
      const conversionResult = await heicTo({
        blob: file,
        type: 'image/jpeg',
        quality: 0.85
      })
      const blob = Array.isArray(conversionResult) ? conversionResult[0] : (conversionResult as Blob)
      result = { data: blob, ext: 'jpg', contentType: 'image/jpeg' }
    } catch (err) {
      console.error('[HEIC Conversion Failed]', err)
      result = { data: file, ext: file.name.split('.').pop()?.toLowerCase() ?? 'jpg', contentType: file.type || 'image/jpeg' }
    }
  } else {
    // Fallback et nettoyage MIME type vide ou application/octet-stream pour passer les règles Storage
    let contentType = file.type
    if (!contentType || contentType === 'application/octet-stream') {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      if (ext === 'png') contentType = 'image/png'
      else if (ext === 'webp') contentType = 'image/webp'
      else if (ext === 'gif') contentType = 'image/gif'
      else contentType = 'image/jpeg'
    }
    result = { data: file, ext: file.name.split('.').pop()?.toLowerCase() ?? 'jpg', contentType }
  }

  if (result.data.size > MAX_SIZE_BYTES) {
    const sizeBefore = result.data.size
    try {
      const compressed = await compressImage(result.data, MAX_SIZE_BYTES)
      result = { data: compressed, ext: 'jpg', contentType: 'image/jpeg' }
      if (compressed.size < sizeBefore) {
        toast.info(`Photo réduite automatiquement pour l'envoi (${(sizeBefore / 1024 / 1024).toFixed(1)} → ${(compressed.size / 1024 / 1024).toFixed(1)} Mo)`)
      }
    } catch (err) {
      console.error('[Image Compression Failed]', err)
    }
  }

  if (result.data.size > MAX_SIZE_BYTES) {
    throw new ImageValidationError(`Impossible de réduire suffisamment cette photo (${(result.data.size / 1024 / 1024).toFixed(1)} Mo, max 10 Mo). Réessaie avec une photo plus petite.`)
  }

  return result
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
  validateImageFile(file)
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
  validateImageFile(file)
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
  validateImageFile(file)
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

/**
 * Upload une photo dans le chat.
 * Chemin : chats/{chatId}/{timestamp}.{ext}
 */
export async function uploadChatPhoto(
  file: File,
  chatId: string
): Promise<string> {
  validateImageFile(file)
  const { data, ext, contentType } = await processImageFile(file)
  const path = `chats/${chatId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, data, { contentType })
  return getDownloadURL(storageRef)
}

/**
 * Supprime une photo de chat depuis son URL.
 */
export async function deleteChatPhoto(url: string): Promise<void> {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/)
    if (!match) return
    const path = decodeURIComponent(match[1])
    await deleteObject(ref(storage, path))
  } catch {
    // Ignorer silencieusement
  }
}

