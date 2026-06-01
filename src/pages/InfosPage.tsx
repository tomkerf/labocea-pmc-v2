import { useState, useMemo, useCallback, type ElementType } from 'react'
import { Search, X, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { useClientsListener } from '@/hooks/useClients'
import { saveClient } from '@/services/clientService'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import type { Client, TerrainEntry, TerrainType } from '@/types'
import { Badge, EntryCard } from '@/components/infos/EntryCard'
import { TYPE_CONFIG } from '@/components/infos/entryConfig'
import { EntryForm } from '@/components/infos/EntryForm'

const TABS: { key: TerrainType | 'all'; label: string; Icon?: ElementType }[] = [
  { key: 'all',     label: 'Tout'     },
  { key: 'contact', label: 'Contacts', Icon: TYPE_CONFIG.contact.Icon },
  { key: 'acces',   label: 'Accès',    Icon: TYPE_CONFIG.acces.Icon   },
  { key: 'site',    label: 'Sites',    Icon: TYPE_CONFIG.site.Icon    },
  { key: 'note',    label: 'Notes',    Icon: TYPE_CONFIG.note.Icon    },
]

export default function InfosPage() {
  useClientsListener()
  const uid       = useAuthStore(selectUid)
  const { clients } = useMissionsStore()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<TerrainType | 'all'>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [modal,    setModal]    = useState<null | 'new' | { entry: TerrainEntry; clientId: string }>(null)
  const [saveErr,  setSaveErr]  = useState<string | null>(null)

  // Toutes les entrées terrain, enrichies du client
  const allEntries = useMemo(() => {
    const list: (TerrainEntry & { _clientId: string; _clientNom: string })[] = []
    clients.forEach((c: Client) => {
      (c.terrain ?? []).forEach(t => {
        list.push({ ...t, _clientId: c.id, _clientNom: c.nom })
      })
    })
    return list
  }, [clients])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allEntries.length }
    allEntries.forEach(t => { c[t.type] = (c[t.type] ?? 0) + 1 })
    return c
  }, [allEntries])

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    return allEntries.filter(t => {
      if (filter !== 'all' && t.type !== filter) return false
      if (!q) return true
      return [t._clientNom, t.nom, t.role, t.tel, t.tel2, t.libelle, t.code, t.contenu, t.notes]
        .some(f => f?.toLowerCase().includes(q))
    }).sort((a, b) => a._clientNom.localeCompare(b._clientNom, 'fr', { sensitivity: 'base' }))
  }, [allEntries, filter, q])

  // Grouper par client
  const groups = useMemo(() => {
    const map = new Map<string, { clientId: string; clientNom: string; entries: typeof filtered }>()
    filtered.forEach(t => {
      if (!map.has(t._clientId)) map.set(t._clientId, { clientId: t._clientId, clientNom: t._clientNom, entries: [] })
      map.get(t._clientId)!.entries.push(t)
    })
    return Array.from(map.values())
  }, [filtered])

  const forceOpen = !!q || groups.length === 1

  function toggleGroup(clientId: string) {
    setExpanded(prev => ({ ...prev, [clientId]: !prev[clientId] }))
  }

  const handleSave = useCallback(async (clientId: string, entry: TerrainEntry) => {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    setSaveErr(null)
    try {
      const terrain = client.terrain ?? []
      const exists  = terrain.find(t => t.id === entry.id)
      const updated = exists
        ? terrain.map(t => t.id === entry.id ? entry : t)
        : [...terrain, entry]
      await saveClient({ ...client, terrain: updated }, uid)
      setModal(null)
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.')
    }
  }, [clients, uid])

  async function handleDelete(clientId: string, entryId: string) {
    const client = clients.find((c: Client) => c.id === clientId)
    if (!client || !uid) return
    await saveClient({ ...client, terrain: (client.terrain ?? []).filter(t => t.id !== entryId) }, uid)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>

      {/* Header + recherche */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex flex-col gap-3"
        style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-subtle)' }}>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Infos terrain
          </h1>
          <button type="button" onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'white' }}>
            <Plus size={15} strokeWidth={2} />
            Ajouter
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client, contact, code…"
            className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-tertiary)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtres type */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const active = filter === tab.key
            const cfg    = tab.key !== 'all' ? TYPE_CONFIG[tab.key] : null
            const n      = counts[tab.key] ?? 0
            return (
              <button type="button" key={tab.key} onClick={() => setFilter(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all"
                style={{
                  background: active ? (cfg?.bg ?? 'var(--color-accent-light)') : 'var(--color-bg-secondary)',
                  color:      active ? (cfg?.color ?? 'var(--color-accent)') : 'var(--color-text-secondary)',
                  border:     `1px solid ${active ? (cfg?.color ?? 'var(--color-accent)') + '40' : 'var(--color-border-subtle)'}`,
                }}>
                {tab.Icon && <tab.Icon size={11} strokeWidth={2} />}
                {tab.label}
                {n > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-px rounded-full"
                    style={{
                      background: active ? 'rgba(0,0,0,0.12)' : 'var(--color-bg-tertiary)',
                      color: active ? 'inherit' : 'var(--color-text-tertiary)',
                    }}>
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {groups.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {allEntries.length === 0 ? 'Aucune entrée. Commencez par en ajouter une.' : 'Aucun résultat.'}
            </p>
          </div>
        )}

        {groups.map(g => {
          const isOpen = forceOpen || !!expanded[g.clientId]
          const typeSummary = (Object.keys(TYPE_CONFIG) as TerrainType[])
            .filter(t => g.entries.some(e => e.type === t))

          return (
            <div key={g.clientId} className="rounded-[var(--radius-md)] overflow-hidden"
              style={{
                background: 'var(--color-bg-secondary)',
                border: `1px solid ${isOpen ? 'var(--color-border)' : 'var(--color-border-subtle)'}`,
                boxShadow: 'var(--shadow-card)',
              }}>

              {/* En-tête groupe */}
              <button type="button"
                onClick={() => toggleGroup(g.clientId)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                style={{ borderBottom: isOpen ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {g.clientNom}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {typeSummary.map(t => {
                      const cfg = TYPE_CONFIG[t]
                      const n   = g.entries.filter(e => e.type === t).length
                      return (
                        <span key={t} className="inline-flex items-center gap-1 text-[10px] font-medium"
                          style={{ color: cfg.color }}>
                          <cfg.Icon size={9} strokeWidth={2} />
                          {n}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                  {g.entries.length}
                </span>
                {isOpen
                  ? <ChevronDown size={15} strokeWidth={1.8} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  : <ChevronRight size={15} strokeWidth={1.8} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
              </button>

              {/* Entrées */}
              {isOpen && (
                <div className="flex flex-col gap-2 p-3">
                  {g.entries.map(entry => (
                    <div key={entry.id}>
                      <div className="flex items-center gap-1.5 mb-1.5 px-1">
                        <Badge type={entry.type} />
                      </div>
                      <EntryCard
                        entry={entry}
                        onEdit={() => setModal({ entry, clientId: g.clientId })}
                        onDelete={() => handleDelete(g.clientId, entry.id)}
                      />
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setModal('new')}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium mt-1"
                    style={{
                      border: '1px dashed var(--color-border)',
                      color: 'var(--color-text-tertiary)',
                      background: 'transparent',
                    }}>
                    <Plus size={12} strokeWidth={2} />
                    Ajouter à {g.clientNom.split(' ')[0]}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal formulaire */}
      {modal !== null && (
        <EntryForm
          entry={modal === 'new' ? undefined : modal.entry}
          clients={clients}
          defaultClientId={modal === 'new' ? undefined : modal.clientId}
          error={saveErr}
          onSave={handleSave}
          onClose={() => { setModal(null); setSaveErr(null) }}
        />
      )}
    </div>
  )
}
