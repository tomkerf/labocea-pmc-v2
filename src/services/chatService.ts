import { collection, addDoc, Timestamp, doc, runTransaction } from 'firebase/firestore'
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

export async function sendChatImage(
  imageUrl: string,
  user: { uid: string; prenom: string; nom: string; initiales: string; avatarColor?: string },
  chatId: string = 'general',
  participants?: string[]
): Promise<void> {
  const payload: any = {
    text: '📷 Photo',
    chatId,
    senderUid: user.uid,
    senderName: `${user.prenom} ${user.nom}`,
    senderInitials: user.initiales,
    senderAvatarColor: user.avatarColor || '',
    createdAt: Timestamp.now(),
    isImage: true,
    imageUrl,
  }

  if (participants) {
    payload.participants = participants
  }

  await trackWrite(
    addDoc(collection(db, COLLECTIONS.CHAT_MESSAGES), payload)
  )
}

export async function sendChatPoll(
  question: string,
  options: string[],
  user: { uid: string; prenom: string; nom: string; initiales: string; avatarColor?: string },
  chatId: string = 'general',
  participants?: string[]
): Promise<void> {
  const trimmedQuestion = question.trim()
  if (!trimmedQuestion || options.length < 2) return

  const cleanOptions = options.map(o => o.trim()).filter(Boolean)
  if (cleanOptions.length < 2) return

  const initialVotes: { [key: string]: string[] } = {}
  cleanOptions.forEach((_, idx) => {
    initialVotes[idx.toString()] = []
  })

  const payload: any = {
    text: `📊 Sondage : ${trimmedQuestion}`,
    chatId,
    senderUid: user.uid,
    senderName: `${user.prenom} ${user.nom}`,
    senderInitials: user.initiales,
    senderAvatarColor: user.avatarColor || '',
    createdAt: Timestamp.now(),
    isPoll: true,
    pollQuestion: trimmedQuestion,
    pollOptions: cleanOptions,
    pollVotes: initialVotes,
  }

  if (participants) {
    payload.participants = participants
  }

  await trackWrite(
    addDoc(collection(db, COLLECTIONS.CHAT_MESSAGES), payload)
  )
}

export async function togglePollVote(
  messageId: string,
  optionIndex: number,
  userId: string
): Promise<void> {
  const messageRef = doc(db, COLLECTIONS.CHAT_MESSAGES, messageId)

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(messageRef)
    if (!snap.exists()) return

    const data = snap.data()
    const votes = { ...(data.pollVotes || {}) }
    const key = optionIndex.toString()
    const currentOptionVotes = votes[key] ? [...votes[key]] : []

    const userIndex = currentOptionVotes.indexOf(userId)
    if (userIndex > -1) {
      // Retirer le vote (toggle)
      currentOptionVotes.splice(userIndex, 1)
    } else {
      // Ajouter le vote
      currentOptionVotes.push(userId)
    }

    votes[key] = currentOptionVotes

    transaction.update(messageRef, { pollVotes: votes })
  })
}

