import { useState } from 'react'
import { X } from 'lucide-react'
import type { Client, TerrainEntry, TerrainType } from '@/types'
import { TYPE_CONFIG } from './EntryCard'

/** Supprime les champs undefined d'un objet — Firestore les rejette */
function stripUndef<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')
  ) as T
}

export interface FormProps {
  entry?: Partial<TerrainEntry>
  clients: Client[]
  defaultClientId?: string
  error?: string | null
  onSave: (clientId: string, entry: TerrainEntry) => void
  onClose: () => void
}

export function EntryForm({ entry, clients, defaultClientId, error, onSave, onClose }: FormProps) {
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
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-4"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>

          {/* Type */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(TYPE_CONFIG) as TerrainType[]).map(t => {
                const cfg = TYPE_CONFIG[t]
                const active = type === t
                return (
                  <button type="button" key={t} onClick={() => setType(t)}
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
          <button type="button" onClick={handleSave} disabled={!canSave}
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
