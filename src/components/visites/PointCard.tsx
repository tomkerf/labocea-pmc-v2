import { useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { PointVisite, NatureEauType, MethodeType, FaisabiliteVisite } from '@/types'

const NATURE_EAU: NatureEauType[] = ['Eau usée', 'Rivière', 'Souterraine', 'Eau pluviale', 'Eau saline', 'Boues', 'Autre']
const METHODES: MethodeType[] = ['Ponctuel', 'Composite', 'Automatique']

const FAISABILITE: { key: FaisabiliteVisite; label: string; color: string }[] = [
  { key: 'ok', label: '✓ OK', color: COLORS.SUCCESS },
  { key: 'difficile', label: '⚠ Difficile', color: COLORS.WARNING },
  { key: 'impossible', label: '✗ Impossible', color: COLORS.DANGER },
]

export interface PointCardProps {
  point: PointVisite
  idx: number
  total: number
  uploading: boolean
  onChange: (field: keyof PointVisite, value: unknown) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onPhotoAdd: (file: File) => void
  onPhotoDelete: (url: string) => void
}

export default function PointCard({ point, idx, total, uploading, onChange, onMove, onRemove, onPhotoAdd, onPhotoDelete }: PointCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-xl p-5"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* Header point */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
          P{idx + 1}
        </span>
        <input
          value={point.nom}
          onChange={e => onChange('nom', e.target.value)}
          placeholder="Nom du point (ex: Regard aval station)"
          aria-label="Nom du point de visite"
          className="field-input flex-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          {idx > 0 && (
            <button type="button" onClick={() => onMove(-1)} aria-label="Monter ce point" className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Monter">↑</button>
          )}
          {idx < total - 1 && (
            <button type="button" onClick={() => onMove(1)} aria-label="Descendre ce point" className="p-1 rounded"
              style={{ color: 'var(--color-text-tertiary)' }} title="Descendre">↓</button>
          )}
          {total > 1 && (
            <button type="button" onClick={onRemove} aria-label="Supprimer ce point" className="p-1 rounded"
              style={{ color: COLORS.DANGER }} title="Supprimer">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor={`pc-type-eau-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Type d'eau</label>
          <select id={`pc-type-eau-${point.id}`} value={point.typeEau} onChange={e => onChange('typeEau', e.target.value as NatureEauType)}
            className="field-input w-full">
            {NATURE_EAU.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`pc-methode-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Méthode</label>
          <select id={`pc-methode-${point.id}`} value={point.methode} onChange={e => onChange('methode', e.target.value as MethodeType)}
            className="field-input w-full">
            {METHODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Faisabilité */}
      <div className="mb-3" role="group" aria-labelledby={`pc-faisabilite-label-${point.id}`}>
        <p id={`pc-faisabilite-label-${point.id}`} className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>Faisabilité</p>
        <div className="flex gap-2">
          {FAISABILITE.map(f => (
            <button type="button"
              key={f.key}
              onClick={() => onChange('faisabilite', f.key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: point.faisabilite === f.key ? f.color : COLORS.BG_TERTIARY,
                color: point.faisabilite === f.key ? 'white' : COLORS.TEXT_SECONDARY,
                border: `1.5px solid ${point.faisabilite === f.key ? f.color : COLORS.BORDER}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor={`pc-securite-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Sécurité</label>
        <input id={`pc-securite-${point.id}`} value={point.securite} onChange={e => onChange('securite', e.target.value)}
          className="field-input w-full" placeholder="EPI requis, risques, accès…" />
      </div>

      <div className="mb-3">
        <label htmlFor={`pc-notes-${point.id}`} className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Notes</label>
        <input id={`pc-notes-${point.id}`} value={point.notes} onChange={e => onChange('notes', e.target.value)}
          className="field-input w-full" placeholder="Remarques spécifiques…" />
      </div>

      {/* Photos */}
      <div>
        <p className="block text-xs font-medium mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>Photos</p>
        {point.photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {point.photos.map(url => (
              <div key={url} className="relative rounded-lg overflow-hidden shrink-0"
                style={{ width: 96, height: 96, border: '1px solid var(--color-border)' }}>
                <a href={url} target="_blank" rel="noreferrer" className="block size-full">
                  <img src={url} alt="photo" className="size-full object-cover cursor-zoom-in" loading="lazy" />
                </a>
                <button type="button" onClick={() => onPhotoDelete(url)}
                  aria-label="Supprimer cette photo"
                  className="absolute top-1 right-1 size-5 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors">
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
        <label
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            background: COLORS.BG_TERTIARY,
            border: '1px solid var(--color-border)',
            color: uploading ? 'var(--color-text-tertiary)' : COLORS.TEXT_SECONDARY,
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
          }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? 'Envoi en cours…' : 'Ajouter une photo'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoAdd(f) }}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}
