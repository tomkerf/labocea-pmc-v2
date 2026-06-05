import { COLORS } from '@/lib/constants'

interface PointMesureContraintesProps {
  contraintes: string;
  setContraintes: (val: string) => void;
  handleSaveContraintes: () => void;
  saveStatus: 'idle' | 'saving' | 'saved';
}

export function PointMesureContraintes({ contraintes, setContraintes, handleSaveContraintes, saveStatus }: PointMesureContraintesProps) {
  return (
    <div className="mx-4 mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Mémoire Terrain & Contraintes
        </h2>
        {saveStatus === 'saving' && (
          <span className="text-[11px]" style={{ color: COLORS.ACCENT }}>Enregistrement…</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-[11px]" style={{ color: COLORS.SUCCESS }}>Enregistré ✓</span>
        )}
      </div>
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        <textarea
          value={contraintes}
          onChange={(e) => setContraintes(e.target.value)}
          onBlur={handleSaveContraintes}
          rows={4}
          aria-label="Contraintes terrain et mémoire du point"
          className="w-full p-4 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{ background: COLORS.BG_SECONDARY, color: COLORS.TEXT_PRIMARY }}
          placeholder="Saisissez ici les contraintes d'accès, codes barrières, équipements spécifiques requis..."
        />
      </div>
    </div>
  )
}
