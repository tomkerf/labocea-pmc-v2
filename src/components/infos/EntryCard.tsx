import { useState } from 'react'
import {
  User, Key, MapPin, FileText, Phone, Mail, Copy, Eye, EyeOff, Pencil, Trash2,
} from 'lucide-react'
import type { TerrainEntry, TerrainType } from '@/types'

export const TYPE_CONFIG: Record<TerrainType, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  contact: { label: 'Contact',  Icon: User,     color: 'var(--color-accent)',   bg: 'var(--color-accent-light)'  },
  acces:   { label: 'Accès',    Icon: Key,      color: 'var(--color-warning)',  bg: 'var(--color-warning-light)' },
  site:    { label: 'Site',     Icon: MapPin,   color: 'var(--color-success)',  bg: 'var(--color-success-light)' },
  note:    { label: 'Note',     Icon: FileText, color: 'var(--color-neutral)',  bg: 'var(--color-bg-tertiary)'   },
}

export function Badge({ type }: { type: TerrainType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <cfg.Icon size={10} strokeWidth={2} />
      {cfg.label}
    </span>
  )
}

export function EntryCard({
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
