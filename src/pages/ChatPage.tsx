import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { Send, ArrowLeft, AtSign } from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/firebase'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'
import { sendChatMessage } from '@/services/chatService'
import type { ChatMessage, AppUser } from '@/types'
import { COLLECTIONS, COLORS } from '@/lib/constants'
import UserAvatar from '@/components/ui/UserAvatar'
import { useNavigate } from 'react-router-dom'

// Formateur de date convivial
function formatMessageTime(timestamp: any): string {
  if (!timestamp) return ''
  const date = timestamp.toDate()
  const now = new Date()
  
  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear()
                  
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  
  if (isToday) {
    return `Aujourd'hui à ${timeStr}`
  }
  
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.getDate() === yesterday.getDate() &&
                      date.getMonth() === yesterday.getMonth() &&
                      date.getFullYear() === yesterday.getFullYear()
                      
  if (isYesterday) {
    return `Hier à ${timeStr}`
  }
  
  const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
  return `${dayStr.charAt(0).toUpperCase() + dayStr.slice(1)} à ${timeStr}`
}

export default function ChatPage() {
  const appUser = useAuthStore(selectAppUser)
  const users = useUsersStore((s) => s.users)
  const markAsRead = useChatNotificationStore((s) => s.markAsRead)
  
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Suggestion de mention (@)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // S'abonner aux messages Firestore
  useEffect(() => {
    setLoading(true)
    const q = query(
      collection(db, COLLECTIONS.CHAT_MESSAGES),
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loadedMessages: ChatMessage[] = []
        snap.forEach((doc) => {
          loadedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage)
        })
        setMessages(loadedMessages.reverse())
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Erreur écouteur chat:', err)
        setError('Impossible de charger la messagerie.')
        setLoading(false)
      }
    )

    return () => unsub()
  }, [])

  // Marquer comme lu à l'ouverture et dès que des messages arrivent
  useEffect(() => {
    markAsRead()
  }, [messages, markAsRead])

  // Faire défiler automatiquement vers le bas lors de l'arrivée de messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Gérer la saisie de texte et détecter le déclencheur @
  const handleInputChange = (text: string) => {
    setInputText(text)
    
    // Détecter si on est en train de taper une mention
    const words = text.split(' ')
    const lastWord = words[words.length - 1]
    
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1))
    } else {
      setMentionQuery(null)
    }
  }

  // Sélectionner un utilisateur à mentionner
  const handleSelectMention = (user: AppUser) => {
    const words = inputText.split(' ')
    // Remplacer le dernier mot commençant par @
    words[words.length - 1] = `@${user.initiales} `
    setInputText(words.join(' '))
    setMentionQuery(null)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !appUser) return

    const textToSend = inputText
    setInputText('') // Vider l'input immédiatement
    setMentionQuery(null)

    try {
      await sendChatMessage(textToSend, {
        uid: appUser.uid,
        prenom: appUser.prenom,
        nom: appUser.nom,
        initiales: appUser.initiales,
        avatarColor: appUser.avatarColor,
      })
    } catch (err) {
      console.error("Erreur lors de l'envoi du message :", err)
      setError("Erreur lors de l'envoi. Veuillez réessayer.")
    }
  }

  // Rendu du contenu du message avec mise en surbrillance des mentions
  const renderMessageContent = (text: string, isMeMessage: boolean) => {
    if (!text.includes('@')) return text

    const words = text.split(/(\s+)/) // Découper par mots en gardant les espaces
    return words.map((word, idx) => {
      if (word.startsWith('@')) {
        // Enlever la ponctuation en fin de mot (ex: "@THK," ou "@THK.")
        const cleanWord = word.slice(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        const lowerCleanWord = cleanWord.toLowerCase()

        // Chercher l'utilisateur mentionné par ses initiales ou son prénom
        const matchedUser = users.find(
          u => u.initiales.toLowerCase() === lowerCleanWord || u.prenom.toLowerCase() === lowerCleanWord
        )

        if (matchedUser) {
          const isMeMention = matchedUser.uid === appUser?.uid
          
          let badgeClass = ''
          if (isMeMessage) {
            // Dans nos propres messages (bulle bleue)
            badgeClass = isMeMention 
              ? 'bg-[var(--color-danger)] text-white border border-white/20' 
              : 'bg-white/20 text-white'
          } else {
            // Dans les messages des autres (bulle blanche/grise)
            badgeClass = isMeMention 
              ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[var(--color-danger)]/20' 
              : 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
          }

          return (
            <span
              key={idx}
              className={`font-semibold px-1.5 py-0.5 rounded text-[13px] inline-block ${badgeClass}`}
            >
              @{matchedUser.prenom}
            </span>
          )
        }
      }
      return word
    })
  }

  // Filtrer les suggestions de membres de l'équipe
  const suggestions = mentionQuery !== null
    ? users.filter(u => 
        u.prenom.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.nom.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.initiales.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : []

  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen bg-[var(--color-bg-primary)] overflow-hidden">
      {/* En-tête / Navigation */}
      <div 
        className="px-4 py-3 flex items-center gap-3 shrink-0" 
        style={{ 
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'var(--glass-panel)',
          WebkitBackdropFilter: 'var(--glass-panel)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <button type="button" onClick={() => navigate(-1)} className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors" aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Messagerie d'équipe</h1>
          <p className="text-[11px] text-[var(--color-text-secondary)]">Discussions générales de l'équipe terrain</p>
        </div>
      </div>

      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center py-20 my-auto">
            <div className="size-6 rounded-full border-2 animate-spin"
              style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-[var(--color-danger)] font-medium my-auto">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-secondary)] text-sm my-auto">
            Aucun message. Commencez la discussion !
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isMe = msg.senderUid === appUser?.uid
                const showSenderName = index === 0 || messages[index - 1].senderUid !== msg.senderUid

                // Détecter si ce message contient une mention de l'utilisateur actuel
                const containsMyMention = appUser && 
                  (msg.text.toLowerCase().includes(`@${appUser.initiales.toLowerCase()}`) || 
                   msg.text.toLowerCase().includes(`@${appUser.prenom.toLowerCase()}`))

                return (
                  <m.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex items-start gap-2.5 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    {/* Avatar de l'expéditeur */}
                    {!isMe && (
                      <div className="shrink-0 pt-0.5">
                        <UserAvatar 
                          initiales={msg.senderInitials} 
                          color={msg.senderAvatarColor} 
                          size={32} 
                        />
                      </div>
                    )}

                    {/* Contenu du message */}
                    <div className="flex flex-col">
                      {showSenderName && !isMe && (
                        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">
                          {msg.senderName}
                        </span>
                      )}
                      <div
                        className="px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words shadow-[var(--shadow-card)] transition-all"
                        style={{
                          backgroundColor: isMe 
                            ? 'var(--color-accent)' 
                            : containsMyMention 
                              ? 'var(--color-warning-light)' 
                              : 'var(--color-bg-secondary)',
                          color: isMe ? 'white' : 'var(--color-text-primary)',
                          border: isMe 
                            ? 'none' 
                            : containsMyMention 
                              ? '1px solid var(--color-warning)' 
                              : '1px solid var(--color-border-subtle)',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}
                      >
                        {renderMessageContent(msg.text, isMe)}
                      </div>
                      <span 
                        className={`text-[9px] text-[var(--color-text-tertiary)] mt-1 ml-1 ${isMe ? 'self-end mr-1' : 'self-start'}`}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  </m.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre de suggestions @mentions */}
      {suggestions.length > 0 && (
        <m.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 p-2 rounded-xl flex flex-wrap gap-1.5 shrink-0 shadow-[var(--shadow-card)]"
          style={{ 
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)' 
          }}
        >
          <span className="text-[11px] font-medium text-[var(--color-text-secondary)] w-full mb-1 px-1 flex items-center gap-1">
            <AtSign size={12} /> Mentionner un membre :
          </span>
          {suggestions.map(u => (
            <button
              key={u.uid}
              type="button"
              onClick={() => handleSelectMention(u)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] text-[12px] font-medium transition-colors"
            >
              <UserAvatar initiales={u.initiales} color={u.avatarColor} size={18} fontSize={6} />
              <span>{u.prenom} {u.nom}</span>
              <span className="text-[10px] text-[var(--color-text-secondary)] opacity-60 bg-[var(--color-border)]/20 px-1 rounded">{u.initiales}</span>
            </button>
          ))}
        </m.div>
      )}

      {/* Barre de saisie en bas */}
      <form 
        onSubmit={handleSend} 
        className="px-4 py-3 shrink-0 flex items-center gap-2 border-t border-[var(--color-border-subtle)] pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
        style={{ 
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] px-4 py-2.5 rounded-full text-[14px] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-secondary)] transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="size-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:scale-100 active:scale-95"
          style={{ 
            backgroundColor: 'var(--color-accent)',
            boxShadow: 'var(--shadow-card)',
          }}
          aria-label="Envoyer"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
