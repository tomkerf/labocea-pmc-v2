import { useState } from 'react'
import { Bug } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore, selectUid, selectAppUser } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { COLLECTIONS, COLORS } from '@/lib/constants'
import BaseModal from '@/components/ui/BaseModal'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function BugReportModal({ isOpen, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)

  function handleClose() {
    setDescription('')
    onClose()
  }

  async function handleSubmit() {
    if (!description.trim() || !uid) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, COLLECTIONS.BUGS), {
        description: description.trim(),
        page: window.location.pathname,
        userUid: uid,
        userNom: appUser ? `${appUser.prenom} ${appUser.nom}` : '',
        userInitiales: appUser?.initiales ?? '',
        createdAt: serverTimestamp(),
      })

      import('@/services/notificationService').then(({ sendPushToTechnician }) => {
        sendPushToTechnician(
          'THK',
          '🐞 Nouveau bug signalé',
          `${appUser ? `${appUser.prenom} ${appUser.nom}` : 'Un utilisateur'} a signalé un problème sur ${window.location.pathname}`,
          undefined,
          true
        )
      }).catch(err => console.error('[Notification] Failed to load notificationService:', err))

      toast.success('Signalement envoyé, merci !')
      handleClose()
    } catch {
      toast.error('Échec de l\'envoi. Vérifie ta connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Signaler un problème"
      icon={<Bug size={17} strokeWidth={1.8} style={{ color: COLORS.ACCENT }} />}
      footer={
        <>
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-sm"
            style={{ color: COLORS.TEXT_SECONDARY, background: COLORS.BG_TERTIARY }}>
            Annuler
          </button>
          <button type="button"
            onClick={handleSubmit}
            disabled={!description.trim() || submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{
              background: description.trim() && !submitting ? COLORS.ACCENT : 'var(--color-text-tertiary)',
              cursor: description.trim() && !submitting ? 'pointer' : 'not-allowed',
            }}>
            {submitting ? 'Envoi…' : 'Envoyer'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
          Décris ce qui ne fonctionne pas. La page actuelle sera jointe automatiquement.
        </p>
        <textarea

          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ex : Le bouton Enregistrer ne répond pas sur la fiche client Plounerin…"
          className="w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{
            border: `1px solid ${COLORS.BORDER}`,
            background: COLORS.BG_TERTIARY,
            color: COLORS.TEXT_PRIMARY,
          }}
        />
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Page : <code>{window.location.pathname}</code>
        </p>
      </div>
    </BaseModal>
  )
}
