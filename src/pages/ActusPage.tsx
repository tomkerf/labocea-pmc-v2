import { useState, useMemo } from 'react'
import { Plus, Search, Calendar, User, BookOpen, Trash2, Edit } from 'lucide-react'
import { useActusStore } from '@/stores/actusStore'
import { useAuthStore, selectUid, selectAppUser } from '@/stores/authStore'
import { deleteActu, markActuAsRead, markActuAsUnread } from '@/services/actuService'
import { toast } from '@/stores/toastStore'
import ActuFormModal from '@/components/actus/ActuFormModal'
import BaseModal from '@/components/ui/BaseModal'
import type { Actu, ActuCategorie } from '@/types'

const CATEGORY_MAP: { [key in ActuCategorie]: { label: string; className: string } } = {
  service: { label: '📢 Service', className: 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[rgba(0,113,227,0.15)]' },
  reglementation: { label: '⚖️ Réglo', className: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.15)]' },
  client: { label: '🤝 Client', className: 'bg-[var(--color-success-light)] text-[var(--color-success)] border border-[rgba(52,199,89,0.15)]' },
  autre: { label: '🏷️ Autre', className: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]' },
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
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 max-w-4xl mx-auto bg-[var(--color-bg-primary)]">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Actualités</h1>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] mt-0.5">Notes internes, veille réglementaire et vie de l'équipe.</p>
        </div>
        {isManagerOrAdmin && (
          <button
            onClick={() => {
              setEditingActu(null)
              setIsFormOpen(true)
            }}
            className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            <span>Publier</span>
          </button>
        )}
      </div>

      {/* Barre d'outils (Recherche & Filtres) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Filtres Pilules (Apple Style segmented control) */}
        <div className="flex p-0.5 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] overflow-x-auto self-start md:self-auto shadow-sm">
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSel
                    ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Barre de recherche */}
        <div className="relative flex-1 md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Rechercher une actu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Flux d'actualités */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]" />
          ))}
        </div>
      ) : filteredActus.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-sm">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">Aucune actualité trouvée.</p>
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
                className={`relative flex flex-col gap-3.5 rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-[0.5px] hover:shadow-md bg-[var(--color-bg-secondary)] border shadow-[var(--shadow-card)] group ${
                  isUnread ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20' : 'border-[var(--color-border-subtle)]'
                }`}
              >
                {/* Point bleu "non lu" */}
                {isUnread && (
                  <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cat.className}`}>
                    {cat.label}
                  </span>
                  {actu.prioritaire && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.15)] flex items-center gap-1">
                      📌 Épinglé
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">
                    {formattedDate}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold group-hover:text-[var(--color-accent)] transition-colors text-[var(--color-text-primary)]">
                    {actu.titre}
                  </h3>
                </div>

                <p className="text-[12px] leading-relaxed line-clamp-2 text-[var(--color-text-secondary)] font-medium">
                  {actu.contenu}
                </p>

                <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3.5 mt-1">
                  <div className="flex items-center gap-4 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1">
                      <User size={11} className="text-[var(--color-text-tertiary)]" />
                      Auteur : {actu.auteurInitiales}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={11} className="text-[var(--color-text-tertiary)]" />
                      {getReadingTime(actu.contenu)}
                    </span>
                  </div>

                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleEdit(e, actu)}
                        className="p-1 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                        aria-label="Modifier"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, actu.id)}
                        className="p-1 rounded-md hover:bg-[var(--color-danger-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={13} />
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
        icon={<BookOpen size={16} strokeWidth={1.8} className="text-[var(--color-accent)]" />}
        maxWidth="2xl"
        footer={
          <div className="flex w-full justify-between items-center gap-2.5">
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
                className="text-xs font-bold px-3 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                {selectedActu.lectureUids.includes(uid) ? 'Marquer comme non lu' : 'Marquer comme lu'}
              </button>
            )}
            <button
              onClick={() => setSelectedActu(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all active:scale-95 shadow-sm ml-auto"
            >
              Fermer
            </button>
          </div>
        }
      >
        {selectedActu && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2.5 text-[10px] font-bold border-b border-[var(--color-border-subtle)] pb-3 text-[var(--color-text-secondary)]">
              <span className={`px-2 py-0.5 rounded-full ${CATEGORY_MAP[selectedActu.categorie]?.className || CATEGORY_MAP.autre.className}`}>
                {CATEGORY_MAP[selectedActu.categorie]?.label || CATEGORY_MAP.autre.label}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-[var(--color-text-tertiary)]" />
                {new Date(selectedActu.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-1">
                <User size={11} className="text-[var(--color-text-tertiary)]" />
                Auteur : {selectedActu.auteurInitiales}
              </span>
            </div>

            <div className="text-[13px] font-medium leading-relaxed whitespace-pre-line py-2 text-[var(--color-text-primary)]">
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
