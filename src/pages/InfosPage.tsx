import { useState, useMemo, useCallback } from 'react'
import {
  Search, X, Plus, ChevronDown, ChevronRight,
  User, Key, MapPin, FileText, Phone, Mail, Copy, Eye, EyeOff, Pencil, Trash2,
} from 'lucide-react'
import { useClientsListener, saveClient } from '@/hooks/useClients'
import { useMissionsStore } from '@/stores/missionsStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import type { Client, TerrainEntry, TerrainType } from '@/types'

// ── Helpers ───────────────────────────────────────────────────

/** Supprime les champs undefined d'un objet — Firestore les rejette */
function stripUndef<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')
  ) as T
}

// ── Config types ──────────────────────────────────────────────

const TYPE_CONFIG: Record<TerrainType, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  contact: { label: 'Contact',  Icon: User,     color: 'var(--color-accent)',   bg: 'var(--color-accent-light)'  },
  acces:   { label: 'Accès',    Icon: Key,      color: 'var(--color-warning)',  bg: 'var(--color-warning-light)' },
  site:    { label: 'Site',     Icon: MapPin,   color: 'var(--color-success)',  bg: 'var(--color-success-light)' },
  note:    { label: 'Note',     Icon: FileText, color: 'var(--color-neutral)',  bg: 'var(--color-bg-tertiary)'   },
}

// ── Helpers ───────────────────────────────────────────────────

function Badge({ type }: { type: TerrainType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <cfg.Icon size={10} strokeWidth={2} />
      {cfg.label}
    </span>
  )
}

// ── Carte entrée ──────────────────────────────────────────────

function EntryCard({
  entry, onEdit, onDelete,
}: {
  entry: TerrainEntry
  onEdit: () => void
  onDelete: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied,   setCopied]   = useState(false)

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-[var(--radius-md)] overflow-hidden"
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}>

      {/* Bande colorée gauche + contenu */}
      <div className="flex">
        <div className="w-1 shrink-0 rounded-l-[var(--radius-md)]"
          style={{ background: TYPE_CONFIG[entry.type].color }} />

        <div className="flex-1 px-4 py-3.5 min-w-0">

          {/* Contact */}
          {entry.type === 'contact' && (
            <div>
              <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                {entry.nom || '—'}
              </p>
              {entry.role && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {entry.role}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {entry.tel && (
                  <a href={`tel:${entry.tel}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                    <Phone size={11} strokeWidth={2} />
                    {entry.tel}
                    <button onClick={e => { e.preventDefault(); copy(entry.tel!) }}
                      className="ml-1 opacity-60 hover:opacity-100">
                      <Copy size={10} strokeWidth={2} />
                    </button>
                  </a>
                )}
                {entry.tel2 && (
                  <a href={`tel:${entry.tel2}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                    <Phone size={11} strokeWidth={2} />
                    {entry.tel2}
                    <button onClick={e => { e.preventDefault(); copy(entry.tel2!) }}
                      className="ml-1 opacity-60 hover:opacity-100">
                      <Copy size={10} strokeWidth={2} />
                    </button>
                  </a>
                )}
                {entry.email && (
                  <a href={`mailto:${entry.email}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    <Mail size={11} strokeWidth={1.8} />
                    {entry.email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Accès */}
          {entry.type === 'acces' && (
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {entry.libelle || 'Code'}
              </p>
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setRevealed(v => !v)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold font-mono cursor-pointer select-none transition-all"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-warning)',
                    filter: revealed ? 'none' : 'blur(6px)',
                    userSelect: revealed ? 'text' : 'none',
                  }}>
                  {entry.code || '—'}
                </div>
                <button
                  onClick={() => setRevealed(v => !v)}
                  className="p-2 rounded-lg shrink-0"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  {revealed ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
                {revealed && entry.code && (
                  <button
                    onClick={() => copy(entry.code!)}
                    className="p-2 rounded-lg shrink-0"
                    style={{
                      background: copied ? 'var(--color-success-light)' : 'var(--color-bg-tertiary)',
                      color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    }}>
                    <Copy size={15} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Site / Note */}
          {(entry.type === 'site' || entry.type === 'note') && (
            <div>
              {entry.libelle && (
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {entry.libelle}
                </p>
              )}
              {entry.contenu && (
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                  {entry.contenu}
                </p>
              )}
            </div>
          )}

          {/* Notes communes */}
          {entry.notes && entry.type !== 'note' && (
            <p className="text-xs mt-2 pt-2 italic"
              style={{ color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
              {entry.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 p-2 shrink-0 justify-start">
          <button onClick={onEdit}
            className="p-2 rounded-lg"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            <Pencil size={13} strokeWidth={1.8} />
          </button>
          <button onClick={onDelete}
            className="p-2 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)' }}>
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Formulaire ────────────────────────────────────────────────

interface FormProps {
  entry?: Partial<TerrainEntry>
  clients: Client[]
  defaultClientId?: string
  error?: string | null
  onSave: (clientId: string, entry: TerrainEntry) => void
  onClose: () => void
}

function EntryForm({ entry, clients, defaultClientId, error, onSave, onClose }: FormProps) {
  const isEdit = !!entry?.id
  const [type,     setType]     = useState<TerrainType>(entry?.type ?? 'contact')
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? '')
  const [nom,      setNom]      = useState(entry?.nom ?? '')
  const [role,     setRole]     = useState(entry?.role ?? '')
  const [tel,      setTel]      = useState(entry?.tel ?? '')
  const [tel2,     setTel2]     = useState(entry?.tel2 ?? '')
  const [email,    setEmail]    = useState(entry?.email ?? '')
  const [libelle,  setLibelle]  = useState(entry?.libelle ?? '')
  const [code,     setCode]     = useState(entry?.code ?? '')
  const [contenu,  setContenu]  = useState(entry?.contenu ?? '')
  const [notes,    setNotes]    = useState(entry?.notes ?? '')

  function handleSave() {
    const specific =
      type === 'contact' ? { nom: nom.trim(), role: role.trim(), tel: tel.trim(), tel2: tel2.trim(), email: email.trim() }
      : type === 'acces'  ? { libelle: libelle.trim(), code: code.trim() }
      :                     { libelle: libelle.trim(), contenu: contenu.trim() }

    const base = stripUndef({
      id:        entry?.id ?? crypto.randomUUID(),
      type,
      createdAt: entry?.createdAt ?? new Date().toISOString(),
      notes:     notes.trim(),
      ...specific,
    }) as TerrainEntry

    onSave(clientId, base)
  }

  const canSave = type === 'contact' ? nom.trim().length > 0
    : type === 'acces' ? libelle.trim().length > 0 && code.trim().length > 0
    : (libelle.trim().length > 0 || contenu.trim().length > 0)

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg outline-none"
  const inputStyle = {
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)', maxHeight: '92dvh' }}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isEdit ? 'Modifier' : 'Nouvelle entrée'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-4"
          style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom,0px))' }}>

          {/* Type */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(TYPE_CONFIG) as TerrainType[]).map(t => {
                const cfg = TYPE_CONFIG[t]
                const active = type === t
                return (
                  <button key={t} onClick={() => setType(t)}
                    className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: active ? cfg.bg : 'var(--color-bg-tertiary)',
                      color: active ? cfg.color : 'var(--color-text-tertiary)',
                      border: `1px solid ${active ? cfg.color + '40' : 'var(--color-border-subtle)'}`,
                    }}>
                    <cfg.Icon size={14} strokeWidth={1.8} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Client */}
          {!isEdit && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className={inputCls} style={inputStyle}>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          )}

          {/* Champs contact */}
          {type === 'contact' && (
            <>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Nom *</label>
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Prénom Nom"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Rôle / Poste</label>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="Responsable exploitation…"
                  className={inputCls} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Mobile</label>
                  <input type="tel" value={tel} onChange={e => setTel(e.target.value)} placeholder="06 XX XX XX XX"
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Fixe</label>
                  <input type="tel" value={tel2} onChange={e => setTel2(e.target.value)} placeholder="02 XX XX XX XX"
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom.nom@client.fr"
                  className={inputCls} style={inputStyle} />
              </div>
            </>
          )}

          {/* Champs accès */}
          {type === 'acces' && (
            <>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Libellé *</label>
                <input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Portail nord, Digicode…"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="1234, A→B→C…"
                  className={`${inputCls} font-mono font-semibold tracking-widest`} style={inputStyle} />
              </div>
            </>
          )}

          {/* Champs site / note */}
          {(type === 'site' || type === 'note') && (
            <>
              {type === 'site' && (
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Titre</label>
                  <input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Localisation, consigne…"
                    className={inputCls} style={inputStyle} />
                </div>
              )}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {type === 'site' ? 'Description' : 'Note'}
                </label>
                <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={4}
                  placeholder={type === 'site' ? 'Accès par la D5, contacter la garderie avant 8h…' : 'Information utile…'}
                  className={`${inputCls} resize-none`} style={inputStyle} />
              </div>
            </>
          )}

          {/* Notes communes */}
          {type !== 'note' && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Notes complémentaires</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionnel"
                className={inputCls} style={inputStyle} />
            </div>
          )}

          {/* Erreur */}
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          {/* Bouton */}
          <button onClick={handleSave} disabled={!canSave}
            className="w-full py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: canSave ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: canSave ? 'white' : 'var(--color-text-tertiary)',
            }}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

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

  const TABS: { key: TerrainType | 'all'; label: string; Icon?: React.ElementType }[] = [
    { key: 'all',     label: 'Tout'     },
    { key: 'contact', label: 'Contacts', Icon: User     },
    { key: 'acces',   label: 'Accès',    Icon: Key      },
    { key: 'site',    label: 'Sites',    Icon: MapPin   },
    { key: 'note',    label: 'Notes',    Icon: FileText },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>

      {/* Header + recherche */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex flex-col gap-3"
        style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-subtle)' }}>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Infos terrain
          </h1>
          <button onClick={() => setModal('new')}
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
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
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
              <button key={tab.key} onClick={() => setFilter(tab.key)}
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
              <button
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
                  <button
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
