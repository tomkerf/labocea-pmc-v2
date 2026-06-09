import { Camera } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { Plan } from '@/types'

interface PointMesurePhotosProps {
  plan: Plan;
  allPhotos: string[];
}

export function PointMesurePhotos({ plan, allPhotos }: PointMesurePhotosProps) {
  return (
    <>
      {/* Photos de repérage (Fiche) */}
      {(plan.photos ?? []).length > 0 && (
        <div className="mx-4 mb-6">
          <h2 className="text-xs font-semibold uppercase mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Photos de repérage
          </h2>
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex flex-wrap gap-2">
              {(plan.photos ?? []).map((url, i) => (
                <div key={url} className="relative rounded-lg overflow-hidden shrink-0 bg-gray-50"
                  style={{ width: 80, height: 80, border: '1px solid var(--color-border)' }}>
                  <img src={url} alt={`Repérage ${i + 1}`} className="size-full object-cover" />
                  <a href={url} target="_blank" rel="noreferrer" 
                    className="absolute bottom-1 right-1 p-1 bg-white/80 backdrop-blur rounded-full text-gray-700 hover:text-blue-600 focus:outline-none focus-visible:ring-2"
                    title="Ouvrir la photo dans un nouvel onglet"
                  >
                    <Camera size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Galerie Photos */}
      {allPhotos.length > 0 && (
        <div className="mx-4 mb-6">
          <h2 className="text-xs font-semibold uppercase mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Photos du point ({allPhotos.length})
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {allPhotos.map((url) => (
              <div key={url} className="shrink-0 size-28 rounded-xl overflow-hidden border border-gray-200 relative bg-gray-50">
                <img src={url} alt="Point de mesure" className="size-full object-cover" />
                <a href={url} target="_blank" rel="noreferrer" 
                  className="absolute bottom-1 right-1 p-1 bg-white/80 backdrop-blur rounded-full text-gray-700 hover:text-blue-600 focus:outline-none focus-visible:ring-2">
                  <Camera size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
