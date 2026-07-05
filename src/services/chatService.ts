import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import { COLLECTIONS } from '@/lib/constants'

export async function sendChatMessage(
  text: string,
  user: { uid: string; prenom: string; nom: string; initiales: string; avatarColor?: string }
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  
  await trackWrite(
    addDoc(collection(db, COLLECTIONS.CHAT_MESSAGES), {
      text: trimmed,
      senderUid: user.uid,
      senderName: `${user.prenom} ${user.nom}`,
      senderInitials: user.initiales,
      senderAvatarColor: user.avatarColor || '',
      createdAt: Timestamp.now(),
    })
  )
}
