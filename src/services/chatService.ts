import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import { COLLECTIONS } from '@/lib/constants'

/** Génère un identifiant déterministe unique pour une conversation privée entre deux utilisateurs */
export function getDmChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_')
}

export async function sendChatMessage(
  text: string,
  user: { uid: string; prenom: string; nom: string; initiales: string; avatarColor?: string },
  chatId: string = 'general',
  participants?: string[]
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  
  const payload: any = {
    text: trimmed,
    chatId,
    senderUid: user.uid,
    senderName: `${user.prenom} ${user.nom}`,
    senderInitials: user.initiales,
    senderAvatarColor: user.avatarColor || '',
    createdAt: Timestamp.now(),
  }

  if (participants) {
    payload.participants = participants
  }

  await trackWrite(
    addDoc(collection(db, COLLECTIONS.CHAT_MESSAGES), payload)
  )
}
