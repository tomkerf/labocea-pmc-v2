import { useState } from 'react'
import { Newspaper, Sparkles } from 'lucide-react'
import { createActu, updateActu } from '@/services/actuService'
import { generateRegulatorySummary } from '@/services/aiService'
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

  // AI Assistant states
  const [showAiAssistant, setShowAiAssistant] = useState(false)
  const [aiRawText, setAiRawText] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [customApiKey, setCustomApiKey] = useState(() => sessionStorage.getItem('pmc_gemini_api_key') || '')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

  async function handleGenerateSummary() {
    if (!aiRawText.trim()) return
    setAiLoading(true)
    try {
      const summary = await generateRegulatorySummary(aiRawText.trim(), customApiKey.trim() || undefined)
      setAiResult(summary)
    } catch (error) {
      console.error(error)
      const errMsg = error instanceof Error ? error.message : 'Impossible de générer la synthèse.'
      toast.error(`Erreur IA : ${errMsg}`)
      if (
        errMsg.includes('API_KEY') ||
        errMsg.includes('API key') ||
        errMsg.includes('not found') ||
        errMsg.includes('disabled') ||
        errMsg.includes('restricted')
      ) {
        setShowApiKeyInput(true)
      }
    } finally {
      setAiLoading(false)
    }
  }

  function handleSaveApiKey() {
    if (customApiKey.trim()) {
      sessionStorage.setItem('pmc_gemini_api_key', customApiKey.trim())
      toast.success('Clé API Gemini sauvegardée pour cette session')
      setShowApiKeyInput(false)
    } else {
      sessionStorage.removeItem('pmc_gemini_api_key')
      toast.success('Clé API supprimée')
    }
  }

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
    <>
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
          <div className="flex justify-between items-center">
            <label htmlFor="actu-content" className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
              Contenu (Markdown supporté)
            </label>
            <button
              type="button"
              onClick={() => setShowAiAssistant(true)}
              className="text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors hover:text-blue-700"
              style={{ color: COLORS.ACCENT }}
            >
              <Sparkles size={12} />
              Assistant IA
            </button>
          </div>
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

      {/* Modal Assistant IA */}
      <BaseModal
        isOpen={showAiAssistant}
        onClose={() => {
          setShowAiAssistant(false)
          setAiRawText('')
          setAiResult('')
        }}
        title="Assistant IA — Synthèse réglementaire"
        icon={<Sparkles size={17} strokeWidth={1.8} style={{ color: COLORS.ACCENT }} />}
        footer={
          <div className="flex w-full justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAiAssistant(false)
                setAiRawText('')
                setAiResult('')
              }}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer"
              style={{ color: COLORS.TEXT_SECONDARY, background: COLORS.BG_TERTIARY }}
            >
              Fermer
            </button>
            {aiResult && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContenu(prev => prev ? `${prev}\n\n${aiResult}` : aiResult)
                    toast.success('Synthèse ajoutée à la suite')
                    setShowAiAssistant(false)
                    setAiRawText('')
                    setAiResult('')
                  }}
                  className="px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  style={{ color: COLORS.TEXT_PRIMARY, background: COLORS.BG_TERTIARY, border: `1px solid ${COLORS.BORDER}` }}
                >
                  Ajouter à la suite
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContenu(aiResult)
                    toast.success('Synthèse insérée')
                    setShowAiAssistant(false)
                    setAiRawText('')
                    setAiResult('')
                  }}
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                  style={{ background: COLORS.ACCENT }}
                >
                  Remplacer le texte
                </button>
              </div>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
            Collez un texte de loi ou un règlement brut ci-dessous. L'IA rédigera un résumé clair structuré (Contexte, Obligations, Échéances, Impacts).
          </p>

          {/* Configuration clé API */}
          <div>
            <button
              type="button"
              onClick={() => setShowApiKeyInput(prev => !prev)}
              className="text-xs font-semibold cursor-pointer underline block mb-2"
              style={{ color: COLORS.TEXT_SECONDARY }}
            >
              {showApiKeyInput ? 'Masquer la configuration de clé API' : '⚙️ Configurer une clé API Gemini personnalisée'}
            </button>

            {showApiKeyInput && (
              <div className="flex gap-2 p-3 rounded-lg border mb-3" style={{ background: COLORS.BG_TERTIARY, borderColor: COLORS.BORDER }}>
                <input
                  type="password"
                  placeholder="Collez votre clé API Gemini (AI Studio) ici..."
                  value={customApiKey}
                  onChange={e => setCustomApiKey(e.target.value)}
                  className="flex-1 rounded px-2.5 py-1.5 text-xs outline-none bg-white border"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-3 py-1.5 rounded text-xs text-white font-medium cursor-pointer"
                  style={{ background: COLORS.ACCENT }}
                >
                  Enregistrer
                </button>
              </div>
            )}
          </div>

          <textarea
            rows={6}
            placeholder="Collez le texte brut ici (ex: Arrêté du 20 mai 2026 fixant les seuils d'auto-surveillance...)"
            value={aiRawText}
            onChange={e => setAiRawText(e.target.value)}
            disabled={aiLoading}
            className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none bg-white border"
            style={{
              border: `1px solid ${COLORS.BORDER}`,
              background: COLORS.BG_SECONDARY,
              color: COLORS.TEXT_PRIMARY,
            }}
          />

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={!aiRawText.trim() || aiLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background: aiRawText.trim() && !aiLoading ? COLORS.ACCENT : 'var(--color-text-tertiary)',
            }}
          >
            {aiLoading ? (
              <>
                <div className="size-4 rounded-full border-2 animate-spin border-white border-t-transparent" />
                <span>Analyse et synthèse par l'IA en cours...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Générer la synthèse réglementaire</span>
              </>
            )}
          </button>

          {aiResult && (
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
                Aperçu du résultat
              </label>
              <div className="p-4 rounded-lg border text-sm max-h-60 overflow-y-auto whitespace-pre-line bg-gray-50/50">
                {aiResult}
              </div>
            </div>
          )}
        </div>
      </BaseModal>
    </>
  )
}
