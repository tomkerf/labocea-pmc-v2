import { useState } from 'react'
import { X, Bug } from 'lucide-react'
import { motion } from 'framer-motion'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore, selectUid, selectAppUser } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

interface Props {
  onClose: () => void
}

export default function BugReportModal({ onClose }: Props) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)

  async function handleSubmit() {
    if (!description.trim() || !uid) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'bugs'), {
        description: description.trim(),
        page: window.location.pathname,
        userUid: uid,
        userNom: appUser ? `${appUser.prenom} ${appUser.nom}` : '',
        userInitiales: appUser?.initiales ?? '',
        createdAt: serverTimestamp(),
      })

      // Déclencher une notification push pour l'administrateur
      import('@/services/notificationService').then(({ sendPushToTechnician }) => {
        sendPushToTechnician(
          'THK',
          '🐞 Nouveau bug signalé',
          `${appUser ? `${appUser.prenom} ${appUser.nom}` : 'Un utilisateur'} a signalé un problème sur ${window.location.pathname}`,
          undefined,
          true // allowSelfNotification
        )
      }).catch(err => console.error('[Notification] Failed to load notificationService:', err))

      toast.success('Signalement envoyé, merci !')
      onClose()
    } catch {
      toast.error('Échec de l\'envoi. Vérifie ta connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0"
      style={{
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug size={17} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Signaler un problème
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md"
            style={{ color: 'var(--color-text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Décris ce qui ne fonctionne pas. La page actuelle sera jointe automatiquement.
        </p>

        <textarea
          autoFocus
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ex : Le bouton Enregistrer ne répond pas sur la fiche client Plounerin…"
          className="w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
          }}
        />

        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Page : <code>{window.location.pathname}</code>
        </p>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}>
            Annuler
          </button>
          <button type="button"
            onClick={handleSubmit}
            disabled={!description.trim() || submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              background: description.trim() && !submitting ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              cursor: description.trim() && !submitting ? 'pointer' : 'not-allowed',
            }}>
            {submitting ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
