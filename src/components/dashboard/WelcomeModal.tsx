import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface WelcomeModalProps {
  show: boolean;
  onDismiss: (navigateAide: boolean) => void;
}

export function WelcomeModal({ show, onDismiss }: WelcomeModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)' }}
          >
            <button type="button"
              onClick={() => onDismiss(false)}
              aria-label="Fermer"
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 transition-colors focus:outline-none focus-visible:ring-2"
              style={{ color: COLORS.TEXT_SECONDARY }}
            >
              <X size={18} />
            </button>

            <div className="p-6 text-center flex flex-col items-center">
              <div className="size-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                <BookOpen size={24} />
              </div>
              
              <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                Bienvenue sur PMC V2 ! 👋
              </h3>
              
              <p className="text-sm mb-6 leading-relaxed" style={{ color: COLORS.TEXT_SECONDARY }}>
                L'application a fait peau neuve. Pour découvrir les nouveautés et le fonctionnement général, n'hésite pas à consulter le mode d'emploi.
              </p>

              <div className="flex flex-col gap-2 w-full">
                <button type="button"
                  onClick={() => onDismiss(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ background: COLORS.ACCENT, color: 'white' }}
                >
                  Lire le mode d'emploi
                </button>
                <button type="button"
                  onClick={() => onDismiss(false)}
                  className="w-full py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 rounded-xl"
                  style={{ color: COLORS.TEXT_SECONDARY }}
                >
                  Plus tard
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
