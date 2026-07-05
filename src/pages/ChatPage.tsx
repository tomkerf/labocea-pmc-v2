import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { Send, ArrowLeft, AtSign, Users, Search, BarChart2, Plus, Trash2, X, Camera, Loader2 } from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/firebase'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'
import { sendChatMessage, getDmChatId, sendChatPoll, togglePollVote, sendChatImage } from '@/services/chatService'
import { uploadChatPhoto } from '@/lib/uploadPhoto'
import type { ChatMessage, AppUser } from '@/types'
import { COLLECTIONS } from '@/lib/constants'
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

interface PollViewProps {
  message: ChatMessage
  isMe: boolean
  currentUserId: string
  users: any[]
  appUserInitials: string
  onVote: (optionIndex: number) => void
}

function PollView({ message, isMe, currentUserId, users, appUserInitials, onVote }: PollViewProps) {
  const votes = message.pollVotes || {}
  const totalVotes = Object.values(votes).reduce((acc, curr) => acc + (curr?.length || 0), 0)

  const getVoterInitials = (uid: string) => {
    if (uid === currentUserId) return appUserInitials
    const match = users.find(u => u.uid === uid)
    return match ? match.initiales : '??'
  }

  return (
    <div className="w-full max-w-[280px] sm:w-[320px] select-none">
      {/* Titre/Question */}
      <div className="font-semibold text-sm mb-3 flex items-center gap-2">
        <span className="text-base">📊</span>
        <span>{message.pollQuestion}</span>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {message.pollOptions?.map((option, idx) => {
          const optionKey = idx.toString()
          const optionVoters = votes[optionKey] || []
          const hasVoted = optionVoters.includes(currentUserId)
          const percent = totalVotes > 0 ? Math.round((optionVoters.length / totalVotes) * 100) : 0

          return (
            <div key={idx} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onVote(idx)}
                className={`relative w-full overflow-hidden rounded-xl border text-left px-3.5 py-2.5 transition-all active:scale-[0.98] flex items-center justify-between group ${
                  isMe
                    ? hasVoted
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/20 hover:bg-white/5 text-white/95'
                    : hasVoted
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                }`}
              >
                {/* Barre de progression */}
                <div
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-300 z-0 ${
                    isMe ? 'bg-white/15' : 'bg-[var(--color-accent)]/10'
                  }`}
                  style={{ width: `${percent}%` }}
                />

                {/* Contenu textuel */}
                <span className="z-10 font-medium text-xs break-words pr-2 max-w-[70%]">
                  {option}
                </span>

                {/* Score */}
                <span className="z-10 text-[10px] font-semibold opacity-80 shrink-0">
                  {optionVoters.length} {optionVoters.length > 1 ? 'votes' : 'vote'} ({percent}%)
                </span>
              </button>

              {/* Votants */}
              {optionVoters.length > 0 && (
                <div className={`flex flex-wrap gap-1 px-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {optionVoters.map((uid) => (
                    <span
                      key={uid}
                      title={users.find(u => u.uid === uid)?.prenom || ''}
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isMe
                          ? 'bg-white/25 text-white border border-white/10'
                          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-var(--color-border-subtle)'
                      }`}
                    >
                      {getVoterInitials(uid)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total votes */}
      <div className={`text-[9px] mt-2.5 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
        Total : {totalVotes} {totalVotes > 1 ? 'réponses' : 'réponse'}
      </div>
    </div>
  )
}


export default function ChatPage() {
  const appUser = useAuthStore(selectAppUser)
  const users = useUsersStore((s) => s.users)
  const { markAsRead, unreadCounts } = useChatNotificationStore()
  
  const navigate = useNavigate()
  
  // Salon sélectionné ('general' par défaut, ou '' si rien sur mobile pour afficher la liste)
  const [selectedChatId, setSelectedChatId] = useState<string>('general')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Recherche de contact dans la liste
  const [searchQuery, setSearchQuery] = useState('')
  
  // Suggestion de mention (@)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  // Sondages
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  // Photos/Images
  const [uploadingImage, setUploadingImage] = useState(false)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Identifier le contact s'il s'agit d'un DM
  const selectedContact = selectedChatId !== 'general' && selectedChatId && appUser
    ? users.find(u => getDmChatId(appUser.uid, u.uid) === selectedChatId)
    : null

  // S'abonner aux messages Firestore de la discussion sélectionnée
  useEffect(() => {
    if (!appUser || !selectedChatId) {
      setMessages([])
      return
    }
    
    setLoading(true)
    setMessages([])
    
    const isGeneral = selectedChatId === 'general'
    const q = isGeneral
      ? query(
          collection(db, COLLECTIONS.CHAT_MESSAGES),
          where('chatId', '==', 'general'),
          orderBy('createdAt', 'desc'),
          limit(100)
        )
      : query(
          collection(db, COLLECTIONS.CHAT_MESSAGES),
          where('participants', 'array-contains', appUser.uid),
          orderBy('createdAt', 'desc'),
          limit(200)
        )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loadedMessages: ChatMessage[] = []
        snap.forEach((doc) => {
          const data = doc.data() as ChatMessage
          if (isGeneral || data.chatId === selectedChatId) {
            loadedMessages.push({ ...data, id: doc.id })
          }
        })
        setMessages(loadedMessages.reverse())
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Erreur écouteur chat:', err)
        setError('Impossible de charger les messages de cette conversation.')
        setLoading(false)
      }
    )

    return () => unsub()
  }, [selectedChatId, appUser])

  // Marquer comme lu à l'ouverture et dès que des messages arrivent dans cette conversation
  useEffect(() => {
    if (selectedChatId) {
      markAsRead(selectedChatId)
    }
  }, [selectedChatId, messages, markAsRead])

  // Faire défiler automatiquement vers le bas lors de l'arrivée de messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Gérer la saisie de texte et détecter le déclencheur @
  const handleInputChange = (text: string) => {
    setInputText(text)
    
    // Détecter si on est en train de taper une mention (uniquement possible en canal général)
    if (selectedChatId === 'general') {
      const words = text.split(' ')
      const lastWord = words[words.length - 1]
      
      if (lastWord.startsWith('@')) {
        setMentionQuery(lastWord.slice(1))
      } else {
        setMentionQuery(null)
      }
    } else {
      setMentionQuery(null)
    }
  }

  // Sélectionner un utilisateur à mentionner
  const handleSelectMention = (user: AppUser) => {
    const words = inputText.split(' ')
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
      const participants = selectedChatId !== 'general' && selectedContact
        ? [appUser.uid, selectedContact.uid]
        : undefined

      await sendChatMessage(
        textToSend,
        {
          uid: appUser.uid,
          prenom: appUser.prenom,
          nom: appUser.nom,
          initiales: appUser.initiales,
          avatarColor: appUser.avatarColor,
        },
        selectedChatId,
        participants
      )
    } catch (err) {
      console.error("Erreur lors de l'envoi du message :", err)
      setError("Erreur lors de l'envoi. Veuillez réessayer.")
    }
  }

  const handleAddPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, ''])
    }
  }

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const updated = [...pollOptions]
      updated.splice(index, 1)
      setPollOptions(updated)
    }
  }

  const handlePollOptionChange = (index: number, val: string) => {
    const updated = [...pollOptions]
    updated[index] = val
    setPollOptions(updated)
  }

  const handleSendPoll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pollQuestion.trim() || !appUser) return
    const validOptions = pollOptions.map(o => o.trim()).filter(Boolean)
    if (validOptions.length < 2) return

    try {
      const participants = selectedChatId === 'general' ? undefined : [appUser.uid, selectedContact!.uid]
      await sendChatPoll(
        pollQuestion,
        validOptions,
        {
          uid: appUser.uid,
          prenom: appUser.prenom,
          nom: appUser.nom,
          initiales: appUser.initiales,
          avatarColor: appUser.avatarColor,
        },
        selectedChatId,
        participants
      )
      
      setPollQuestion('')
      setPollOptions(['', ''])
      setIsPollModalOpen(false)
    } catch (err) {
      console.error('Erreur envoi sondage:', err)
      setError("Impossible d'envoyer le sondage.")
    }
  }

  const handleVote = async (messageId: string, optionIndex: number) => {
    if (!appUser) return
    try {
      await togglePollVote(messageId, optionIndex, appUser.uid)
    } catch (err) {
      console.error('Erreur vote:', err)
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !appUser || !selectedChatId) return

    try {
      setUploadingImage(true)
      const url = await uploadChatPhoto(file, selectedChatId)
      await sendChatImage(
        url,
        {
          uid: appUser.uid,
          prenom: appUser.prenom,
          nom: appUser.nom,
          initiales: appUser.initiales,
          avatarColor: appUser.avatarColor,
        },
        selectedChatId,
        selectedContact ? [appUser.uid, selectedContact.uid] : undefined
      )
    } catch (err: any) {
      console.error('Erreur envoi image:', err)
      alert(err.message || "Impossible d'envoyer la photo.")
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Rendu du contenu du message avec mise en surbrillance des mentions
  const renderMessageContent = (text: string, isMeMessage: boolean) => {
    if (!text.includes('@')) return text

    const words = text.split(/(\s+)/)
    return words.map((word, idx) => {
      if (word.startsWith('@')) {
        const cleanWord = word.slice(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        const lowerCleanWord = cleanWord.toLowerCase()

        const matchedUser = users.find(
          u => u.initiales.toLowerCase() === lowerCleanWord || u.prenom.toLowerCase() === lowerCleanWord
        )

        if (matchedUser) {
          const isMeMention = matchedUser.uid === appUser?.uid
          
          let badgeClass = ''
          if (isMeMessage) {
            badgeClass = isMeMention 
              ? 'bg-[var(--color-danger)] text-white border border-white/20' 
              : 'bg-white/20 text-white'
          } else {
            badgeClass = isMeMention 
              ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[var(--color-danger)]/20' 
              : 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
          }

          return (
            <span
              key={idx}
              className={`font-semibold px-1.5 py-0.5 rounded text-[13px] inline-block ${badgeClass}`}
            >
              @{matchedUser.initiales}
            </span>
          )
        }
      }
      return word
    })
  }

  // Filtrer les suggestions de membres de l'équipe pour les mentions @
  const suggestions = mentionQuery !== null
    ? users.filter(u => 
        u.prenom.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.nom.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.initiales.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : []

  // Filtrer la liste des utilisateurs pour les DMs privés selon la recherche
  const filteredContacts = users
    .filter(u => u.uid !== appUser?.uid)
    .filter(u => {
      const label = `${u.prenom} ${u.nom} ${u.initiales}`.toLowerCase()
      return label.includes(searchQuery.toLowerCase())
    })

  return (
    <div className="flex-1 flex h-screen max-h-screen bg-[var(--color-bg-primary)] overflow-hidden">
      
      {/* 1. LISTE DES DISCUSSIONS (Side Panel) */}
      <div 
        className={`w-full md:w-80 border-r border-[var(--color-border-subtle)] flex flex-col shrink-0 bg-white transition-all ${
          selectedChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* En-tête de liste */}
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Discussions</h1>
          </div>
          
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[var(--color-text-secondary)]" size={16} />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] rounded-lg pl-9 pr-3 py-2 text-xs border border-transparent focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Liste défilante */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {/* A. Canal Général */}
          <button
            type="button"
            onClick={() => setSelectedChatId('general')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              selectedChatId === 'general'
                ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] font-semibold'
                : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
            }`}
          >
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                selectedChatId === 'general' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
              }`}
            >
              <Users size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm truncate">Canal Général</span>
                {unreadCounts['general'] > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white">
                    {unreadCounts['general']}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] truncate">Discussion de toute l'équipe</p>
            </div>
          </button>

          <div className="h-px bg-[var(--color-border-subtle)] my-2 mx-2" />
          <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-3 mb-1">
            Discussions privées
          </span>

          {/* B. DMs Individuels */}
          {filteredContacts.length === 0 ? (
            <div className="text-center py-6 text-xs text-[var(--color-text-secondary)]">
              Aucun technicien trouvé.
            </div>
          ) : (
            filteredContacts.map(u => {
              const dmId = getDmChatId(appUser?.uid || '', u.uid)
              const unread = unreadCounts[dmId] || 0
              const isSelected = selectedChatId === dmId

              return (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => setSelectedChatId(dmId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] font-semibold'
                      : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                  }`}
                >
                  <UserAvatar 
                    initiales={u.initiales} 
                    color={u.avatarColor} 
                    size={40} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{u.prenom} {u.nom}</span>
                      {unread > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-text-secondary)]">Technicien</span>
                      <span className="text-[10px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-1 rounded">
                        {u.initiales}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* 2. ZONE DE DISCUSSION PRINCIPALE */}
      <div 
        className={`flex-1 flex flex-col h-screen max-h-screen bg-[var(--color-bg-primary)] overflow-hidden ${
          !selectedChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* En-tête du chat actif */}
        <div 
          className="px-4 py-3 flex items-center gap-3 shrink-0 animate-fade-in" 
          style={{ 
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'var(--glass-panel)',
            WebkitBackdropFilter: 'var(--glass-panel)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Bouton retour mobile */}
          <button 
            type="button" 
            onClick={() => setSelectedChatId('')} 
            className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors md:hidden flex items-center gap-1 text-sm font-medium animate-fade-in"
          >
            <ArrowLeft size={20} />
            <span>Discussions</span>
          </button>

          {/* Bouton retour desktop pour quitter la page */}
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors hidden md:block" 
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>

          {selectedChatId === 'general' ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Canal Général</h1>
                <p className="text-[10px] text-[var(--color-text-secondary)]">Discussions de toute l'équipe terrain</p>
              </div>
            </div>
          ) : selectedContact ? (
            <div className="flex items-center gap-3">
              <UserAvatar initiales={selectedContact.initiales} color={selectedContact.avatarColor} size={36} />
              <div>
                <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">{selectedContact.prenom} {selectedContact.nom}</h1>
                <p className="text-[10px] text-[var(--color-text-secondary)]">Discussion privée • {selectedContact.initiales}</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Sélectionnez une discussion</h1>
            </div>
          )}
        </div>

        {/* Zone de messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {!selectedChatId ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)] text-sm gap-2">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[var(--color-border-subtle)] text-[var(--color-accent)]">
                <Users size={24} />
              </div>
              <span>Sélectionnez un contact pour démarrer une discussion.</span>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[var(--color-accent)]" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-[var(--color-danger)] font-medium my-auto">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
              Aucun message dans cette conversation. Lancez la discussion !
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isMe = msg.senderUid === appUser?.uid
                  const showSenderName = selectedChatId === 'general' && (index === 0 || messages[index - 1].senderUid !== msg.senderUid)

                  const containsMyMention = selectedChatId === 'general' && appUser && 
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
                      {/* Avatar de l'expéditeur (uniquement sur le canal général pour les autres) */}
                      {selectedChatId === 'general' && !isMe && (
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
                        {showSenderName && (
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
                          {msg.isPoll ? (
                            <PollView
                              message={msg}
                              isMe={isMe}
                              currentUserId={appUser?.uid || ''}
                              users={users}
                              appUserInitials={appUser?.initiales || ''}
                              onVote={(optIdx) => handleVote(msg.id, optIdx)}
                            />
                          ) : msg.isImage && msg.imageUrl ? (
                            <div className="flex flex-col gap-1 max-w-[280px] sm:max-w-[320px]">
                              <img
                                src={msg.imageUrl}
                                alt="Photo"
                                className="rounded-lg object-cover w-full max-h-[220px] cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => setZoomImageUrl(msg.imageUrl || null)}
                              />
                            </div>
                          ) : (
                            renderMessageContent(msg.text, isMe)
                          )}
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
                <UserAvatar initiales={u.initiales} color={u.avatarColor} size={18} fontSize={7} />
                <span>{u.prenom} {u.nom}</span>
                <span className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-1 rounded">{u.initiales}</span>
              </button>
            ))}
          </m.div>
        )}

        {/* Barre de saisie */}
        {selectedChatId && (
          <div 
            className="p-4 shrink-0" 
            style={{ 
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'var(--glass-panel)',
              WebkitBackdropFilter: 'var(--glass-panel)',
              borderTop: '1px solid var(--color-border-subtle)',
            }}
          >
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
              
              {uploadingImage ? (
                <div className="p-2.5 shrink-0 flex items-center justify-center">
                  <Loader2 className="animate-spin text-[var(--color-accent)]" size={20} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePhotoClick}
                  className="p-2.5 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-accent)] active:scale-95 transition-all shrink-0"
                  title="Envoyer une photo"
                >
                  <Camera size={20} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPollModalOpen(true)}
                className="p-2.5 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-accent)] active:scale-95 transition-all shrink-0"
                title="Créer un sondage"
              >
                <BarChart2 size={20} />
              </button>
              <input
                type="text"
                placeholder={
                  selectedChatId === 'general' 
                    ? "Écrire un message (@ pour mentionner)..." 
                    : `Écrire à ${selectedContact?.prenom}...`
                }
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-all placeholder:text-[var(--color-text-tertiary)] text-[var(--color-text-primary)] min-w-0"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  inputText.trim() 
                    ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:scale-95' 
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                }`}
                aria-label="Envoyer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal de création de sondage */}
      <AnimatePresence>
        {isPollModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPollModalOpen(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            />
            
            {/* Contenu du Modal */}
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-2xl shadow-[var(--shadow-modal)] w-full max-w-[420px] overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Créer un sondage</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(false)}
                  className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSendPoll} className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Question */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                    Question du sondage
                  </label>
                  <input
                    type="text"
                    placeholder="Saisir la question..."
                    required
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-all text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                    Options de réponse
                  </label>
                  <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                    {pollOptions.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[11px] text-[var(--color-text-tertiary)] font-bold w-5 shrink-0 text-center">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          required={idx < 2}
                          value={option}
                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                          className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-all text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePollOption(idx)}
                            className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-xl transition-all"
                            title="Supprimer cette option"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {pollOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="w-full mt-2 py-2 border border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] flex items-center justify-center gap-1.5 text-xs font-semibold transition-all"
                    >
                      <Plus size={14} />
                      <span>Ajouter une option</span>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPollModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-bg-tertiary)] active:scale-95 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!pollQuestion.trim() || pollOptions.map(o => o.trim()).filter(Boolean).length < 2}
                    className={`px-4 py-2 text-xs font-semibold text-white rounded-xl active:scale-95 transition-all ${
                      pollQuestion.trim() && pollOptions.map(o => o.trim()).filter(Boolean).length >= 2
                        ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed border border-[var(--color-border-subtle)]'
                    }`}
                  >
                    Envoyer le sondage
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visionneuse de photos Plein écran */}
      <AnimatePresence>
        {zoomImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay flouté */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomImageUrl(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-[4px] cursor-zoom-out"
            />
            
            {/* Conteneur de l'image */}
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative max-w-full max-h-[85vh] z-10 flex flex-col items-center gap-4"
            >
              <img
                src={zoomImageUrl}
                alt="Zoom"
                className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-full border border-white/10 backdrop-blur-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                <X size={14} /> Fermer
              </button>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
