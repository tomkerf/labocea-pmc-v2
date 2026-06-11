import { Camera, Loader2, X } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface SamplingPhotosSectionProps {
  photos: string[]
  uploading: boolean
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPhotoDelete: (url: string) => void
}

export default function SamplingPhotosSection({ photos, uploading, onPhotoChange, onPhotoDelete }: SamplingPhotosSectionProps) {
  return (
    <div className="sm:col-span-2">
      <p className="block text-xs font-medium mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>
        Photos terrain
      </p>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((url, i) => (
            <div key={url}
              className="relative rounded-lg overflow-hidden shrink-0"
              style={{ width: 96, height: 96, border: '1px solid var(--color-border)' }}>
              <a href={url} target="_blank" rel="noreferrer" className="block size-full">
                <img
                  src={url}
                  alt={`Prélèvement ${i + 1}`}
                  className="size-full object-cover cursor-zoom-in"
                  loading="lazy"
                />
              </a>
              <button type="button"
                onClick={() => onPhotoDelete(url)}
                aria-label="Supprimer cette photo"
                className="absolute top-1 right-1 size-5 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors"
                title="Supprimer cette photo"
              >
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
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          capture="environment"
          className="hidden"
          onChange={onPhotoChange}
          disabled={uploading}
        />
      </label>
    </div>
  )
}
