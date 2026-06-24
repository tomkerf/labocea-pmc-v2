import { CheckCircle2, CalendarClock, X } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface Props {
  isAutoJ1: boolean;
  saving: boolean;
  onTerminer: () => void;
  onDecaler: () => void;
  onNonEffectue: () => void;
}

export function MissionDetailActions({ isAutoJ1, saving, onTerminer, onDecaler, onNonEffectue }: Props) {
  return (
    <>
      {/* Mobile : barre fixe en bas */}
      <div
        className="md:hidden fixed left-0 right-0 px-4 pt-3 z-10"
        style={{
          bottom: 'calc(65px + env(safe-area-inset-bottom))',
          background: 'rgba(245,245,247,0.92)',
          backdropFilter: 'var(--glass-panel)',
          WebkitBackdropFilter: 'var(--glass-panel)',
          borderTop: '1px solid var(--color-border-subtle)',
          paddingBottom: '12px',
        }}>
        {isAutoJ1 ? (
          <div className="flex flex-col gap-2">
            <button type="button"
              onClick={onDecaler}
              className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{ background: COLORS.ACCENT, color: 'white', boxShadow: '0 4px 16px rgba(0,113,227,0.35)' }}>
              <CalendarClock size={20} />
              Décaler la mission
            </button>
            <button type="button"
              onClick={onNonEffectue}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
              <X size={15} />
              Non effectué
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button type="button"
              onClick={onTerminer}
              disabled={saving}
              className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:active:scale-100"
              style={{ background: saving ? COLORS.BORDER : COLORS.ACCENT, color: 'white', boxShadow: saving ? 'none' : '0 4px 16px rgba(0,113,227,0.35)' }}>
              <CheckCircle2 size={20} />
              {saving ? 'Enregistrement…' : 'Terminer la mission'}
            </button>
            <div className="flex gap-2">
              <button type="button"
                onClick={onNonEffectue}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
                <X size={15} />
                Non effectué
              </button>
              <button type="button"
                onClick={onDecaler}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
                <CalendarClock size={15} />
                Décaler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop : boutons inline en bas de la carte */}
      <div className="hidden md:block mx-4 mb-6 mt-4">
        {isAutoJ1 ? (
          <div className="flex gap-3 justify-end">
            <button type="button"
              onClick={onNonEffectue}
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-transform hover:opacity-90 active:scale-95"
              style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
              <X size={15} />
              Non effectué
            </button>
            <button type="button"
              onClick={onDecaler}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-transform hover:opacity-90 active:scale-95"
              style={{ background: COLORS.ACCENT, color: 'white', boxShadow: '0 2px 8px rgba(0,113,227,0.3)' }}>
              <CalendarClock size={16} />
              Décaler la mission
            </button>
          </div>
        ) : (
          <div className="flex gap-3 justify-end">
            <button type="button"
              onClick={onNonEffectue}
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-transform hover:opacity-90 active:scale-95"
              style={{ background: 'var(--color-warning-light)', color: COLORS.WARNING }}>
              <X size={15} />
              Non effectué
            </button>
            <button type="button"
              onClick={onDecaler}
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-transform hover:bg-gray-200 active:scale-95"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
              <CalendarClock size={15} />
              Décaler
            </button>
            <button type="button"
              onClick={onTerminer}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-transform hover:opacity-90 active:scale-95 disabled:active:scale-100 disabled:hover:opacity-100"
              style={{ background: saving ? COLORS.BORDER : COLORS.ACCENT, color: 'white', boxShadow: saving ? 'none' : '0 2px 8px rgba(0,113,227,0.3)' }}>
              <CheckCircle2 size={16} />
              {saving ? 'Enregistrement…' : 'Terminer la mission'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
