import { useState } from 'react'
import { Newspaper } from 'lucide-react'
import { createActu, updateActu } from '@/services/actuService'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { COLORS } from '@/lib/constants'
import BaseModal from '@/components/ui/BaseModal'
import type { Actu, ActuCategorie } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  editingActu?: Actu | null
}

const CATEGORIES: { value: ActuCategorie; label: string }[] = [
  { value: 'service', label: '📢 Actu service' },
  { value: 'reglementation', label: '⚖️ Réglementation' },
  { value: 'client', label: '🤝 Nouveau client' },
  { value: 'autre', label: '🏷️ Autre' },
]

export default function ActuFormModal({ isOpen, onClose, editingActu }: Props) {
  const [titre, setTitre] = useState(() => editingActu?.titre ?? '')
  const [contenu, setContenu] = useState(() => editingActu?.contenu ?? '')
  const [categorie, setCategorie] = useState<ActuCategorie>(() => editingActu?.categorie ?? 'service')
  const [prioritaire, setPrioritaire] = useState(() => editingActu?.prioritaire ?? false)
  const [submitting, setSubmitting] = useState(false)

  const uid = useAuthStore(selectUid)
  const initiales = useAuthStore(selectInitiales)

  function handleClose() {
    setTitre('')
    setContenu('')
    setCategorie('service')
    setPrioritaire(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim() || !contenu.trim() || !uid) return
    setSubmitting(true)

    try {
      if (editingActu) {
        await updateActu(editingActu.id, titre.trim(), contenu.trim(), categorie, prioritaire)
        toast.success('Actualité mise à jour')
      } else {
        await createActu(titre.trim(), contenu.trim(), categorie, prioritaire, uid, initiales)
        toast.success('Actualité publiée')
      }
      handleClose()
    } catch (err) {
      console.error(err)
      toast.error('Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = titre.trim().length > 0 && contenu.trim().length > 0

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingActu ? 'Modifier l\'actualité' : 'Publier une actualité'}
      icon={<Newspaper size={17} strokeWidth={1.8} style={{ color: COLORS.ACCENT }} />}
      footer={
        <>
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: COLORS.TEXT_SECONDARY, background: COLORS.BG_TERTIARY }}>
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{
              background: isValid && !submitting ? COLORS.ACCENT : 'var(--color-text-tertiary)',
              cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Publication…' : editingActu ? 'Modifier' : 'Publier'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="actu-title" className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
            Titre
          </label>
          <input
            id="actu-title"
            type="text"
            value={titre}
            onChange={e => setTitre(e.target.value)}
            placeholder="Ex : Nouveau marché pour la station de..."
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              border: `1px solid ${COLORS.BORDER}`,
              background: COLORS.BG_SECONDARY,
              color: COLORS.TEXT_PRIMARY,
            }}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="actu-category" className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
              Catégorie
            </label>
            <select
              id="actu-category"
              value={categorie}
              onChange={e => setCategorie(e.target.value as ActuCategorie)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                border: `1px solid ${COLORS.BORDER}`,
                background: COLORS.BG_SECONDARY,
                color: COLORS.TEXT_PRIMARY,
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <input
              id="actu-priority"
              type="checkbox"
              checked={prioritaire}
              onChange={e => setPrioritaire(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="actu-priority" className="text-sm font-medium cursor-pointer" style={{ color: COLORS.TEXT_PRIMARY }}>
              📌 Épingler / Prioritaire
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="actu-content" className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
            Contenu (Markdown supporté)
          </label>
          <textarea
            id="actu-content"
            rows={8}
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            placeholder="Écris ton message ici. Tu peux utiliser du **gras**, des _italiques_, des listes ou des [liens](https://...)."
            className="w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              border: `1px solid ${COLORS.BORDER}`,
              background: COLORS.BG_SECONDARY,
              color: COLORS.TEXT_PRIMARY,
            }}
            required
          />
        </div>
      </form>
    </BaseModal>
  )
}
