import { useState, useMemo } from 'react'
import { Plus, Search, Calendar, User, BookOpen, Trash2, Edit } from 'lucide-react'
import { useActusStore } from '@/stores/actusStore'
import { useAuthStore, selectUid, selectAppUser } from '@/stores/authStore'
import { deleteActu, markActuAsRead, markActuAsUnread } from '@/services/actuService'
import { COLORS } from '@/lib/constants'
import { toast } from '@/stores/toastStore'
import ActuFormModal from '@/components/actus/ActuFormModal'
import BaseModal from '@/components/ui/BaseModal'
import type { Actu, ActuCategorie } from '@/types'

const CATEGORY_MAP: { [key in ActuCategorie]: { label: string; bg: string; color: string } } = {
  service: { label: '📢 Service', bg: '#E8F1FB', color: 'var(--color-accent)' },
  reglementation: { label: '⚖️ Réglo', bg: '#FFEEED', color: '#FF3B30' },
  client: { label: '🤝 Client', bg: '#EAF8EE', color: '#34C759' },
  autre: { label: '🏷️ Autre', bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' },
}

export default function ActusPage() {
  const { actus, loading } = useActusStore()
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)
  const isManagerOrAdmin = appUser?.role === 'admin' || appUser?.role === 'charge_mission'

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedActu, setSelectedActu] = useState<Actu | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingActu, setEditingActu] = useState<Actu | null>(null)

  const filteredActus = useMemo(() => {
    return actus.filter(actu => {
      const matchCategory = activeCategory === 'all' || actu.categorie === activeCategory
      const matchSearch =
        actu.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        actu.contenu.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [actus, activeCategory, searchQuery])

  async function handleOpenActu(actu: Actu) {
    setSelectedActu(actu)
    if (uid && !actu.lectureUids.includes(uid)) {
      try {
        await markActuAsRead(actu.id, uid)
      } catch (err) {
        console.error('[ActusPage] Error marking as read:', err)
      }
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!window.confirm('Es-tu sûr de vouloir supprimer cette actualité ?')) return
    try {
      await deleteActu(id)
      toast.success('Actualité supprimée')
      if (selectedActu?.id === id) {
        setSelectedActu(null)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la suppression')
    }
  }

  function handleEdit(e: React.MouseEvent, actu: Actu) {
    e.stopPropagation()
    setEditingActu(actu)
    setIsFormOpen(true)
  }

  function renderMarkdown(text: string) {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>')
    escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, (_match, label, url) =>
      /^https?:\/\//i.test(url)
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--color-accent); font-weight: 500; text-decoration: underline;">${label}</a>`
        : label
    )
    escaped = escaped.replace(/\n/g, '<br />')

    return <span dangerouslySetInnerHTML={{ __html: escaped }} />
  }

  function getReadingTime(text: string): string {
    const words = text.trim().split(/\s+/).length
    const minutes = Math.ceil(words / 200)
    return `${minutes} min de lecture`
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: COLORS.TEXT_PRIMARY }}>Actualités</h1>
          <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>Notes internes, veille réglementaire et vie de l'équipe.</p>
        </div>
        {isManagerOrAdmin && (
          <button
            onClick={() => {
              setEditingActu(null)
              setIsFormOpen(true)
            }}
            className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
            style={{ background: COLORS.ACCENT }}
          >
            <Plus size={16} />
            <span>Publier</span>
          </button>
        )}
      </div>

      {/* Barre d'outils (Recherche & Filtres) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Filtres Pilules (Apple Style segmented control) */}
        <div className="flex p-0.5 rounded-lg bg-gray-200/60 overflow-x-auto self-start md:self-auto">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'service', label: '📢 Service' },
            { value: 'reglementation', label: '⚖️ Réglo' },
            { value: 'client', label: '🤝 Clients' },
            { value: 'autre', label: '🏷️ Autre' },
          ].map(opt => {
            const isSel = activeCategory === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setActiveCategory(opt.value)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  background: isSel ? COLORS.BG_SECONDARY : 'transparent',
                  color: isSel ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
                  boxShadow: isSel ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Barre de recherche */}
        <div className="relative flex-1 md:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Rechercher une actu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{
              border: `1px solid ${COLORS.BORDER}`,
              background: COLORS.BG_SECONDARY,
              color: COLORS.TEXT_PRIMARY,
            }}
          />
        </div>
      </div>

      {/* Flux d'actualités */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }} />
          ))}
        </div>
      ) : filteredActus.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>Aucune actualité trouvée.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredActus.map(actu => {
            const isUnread = uid && !actu.lectureUids.includes(uid)
            const cat = CATEGORY_MAP[actu.categorie] || CATEGORY_MAP.autre
            const formattedDate = new Date(actu.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })

            return (
              <div
                key={actu.id}
                onClick={() => handleOpenActu(actu)}
                className="relative flex flex-col gap-3 rounded-xl p-5 cursor-pointer transition-all hover:translate-y-[-1px] group"
                style={{
                  background: COLORS.BG_SECONDARY,
                  border: isUnread ? `1.5px solid ${COLORS.ACCENT}` : '1px solid var(--color-border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Point bleu "non lu" */}
                {isUnread && (
                  <div className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full" style={{ background: COLORS.ACCENT }} />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                    {cat.label}
                  </span>
                  {actu.prioritaire && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E3] text-[#FF9F0A]">
                      📌 Épinglé
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {formattedDate}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <h3 className="text-[16px] font-bold group-hover:text-blue-600 transition-colors" style={{ color: COLORS.TEXT_PRIMARY }}>
                    {actu.titre}
                  </h3>
                </div>

                <p className="text-[13px] line-clamp-2" style={{ color: COLORS.TEXT_SECONDARY }}>
                  {actu.contenu}
                </p>

                <div className="flex items-center justify-between border-t pt-3 mt-1" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      Auteur : {actu.auteurInitiales}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />
                      {getReadingTime(actu.contenu)}
                    </span>
                  </div>

                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleEdit(e, actu)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        style={{ color: COLORS.TEXT_SECONDARY }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, actu.id)}
                        className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                        style={{ color: COLORS.TEXT_SECONDARY }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de lecture d'une actualité */}
      <BaseModal
        isOpen={selectedActu !== null}
        onClose={() => setSelectedActu(null)}
        title={selectedActu?.titre || ''}
        icon={<BookOpen size={17} strokeWidth={1.8} style={{ color: COLORS.ACCENT }} />}
        maxWidth="2xl"
        footer={
          <div className="flex w-full justify-between items-center">
            {uid && selectedActu && (
              <button
                onClick={async () => {
                  if (selectedActu.lectureUids.includes(uid)) {
                    await markActuAsUnread(selectedActu.id, uid)
                    setSelectedActu({ ...selectedActu, lectureUids: selectedActu.lectureUids.filter(u => u !== uid) })
                  } else {
                    await markActuAsRead(selectedActu.id, uid)
                    setSelectedActu({ ...selectedActu, lectureUids: [...selectedActu.lectureUids, uid] })
                  }
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  color: COLORS.TEXT_SECONDARY,
                  background: COLORS.BG_SECONDARY,
                }}
              >
                {selectedActu.lectureUids.includes(uid) ? 'Marquer comme non lu' : 'Marquer comme lu'}
              </button>
            )}
            <button
              onClick={() => setSelectedActu(null)}
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white"
              style={{ background: COLORS.ACCENT }}
            >
              Fermer
            </button>
          </div>
        }
      >
        {selectedActu && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 text-xs border-b pb-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <span className="font-semibold px-2 py-0.5 rounded-full" style={{
                background: CATEGORY_MAP[selectedActu.categorie]?.bg || CATEGORY_MAP.autre.bg,
                color: CATEGORY_MAP[selectedActu.categorie]?.color || CATEGORY_MAP.autre.color
              }}>
                {CATEGORY_MAP[selectedActu.categorie]?.label || CATEGORY_MAP.autre.label}
              </span>
              <span style={{ color: COLORS.TEXT_SECONDARY }} className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(selectedActu.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span style={{ color: COLORS.TEXT_SECONDARY }} className="flex items-center gap-1">
                <User size={12} />
                Auteur : {selectedActu.auteurInitiales}
              </span>
            </div>

            <div className="text-sm leading-relaxed whitespace-pre-line py-2" style={{ color: COLORS.TEXT_PRIMARY }}>
              {renderMarkdown(selectedActu.contenu)}
            </div>
          </div>
        )}
      </BaseModal>

      {/* Modal de création/édition */}
      {isFormOpen && (
        <ActuFormModal
          key={editingActu?.id || 'new'}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          editingActu={editingActu}
        />
      )}
    </div>
  )
}
