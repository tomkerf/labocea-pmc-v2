import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { COLORS, Z_INDEX } from '@/lib/constants'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  hideCloseButton?: boolean
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
  'sm': 'sm:max-w-sm',
  'md': 'sm:max-w-md',
  'lg': 'sm:max-w-lg',
  'xl': 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
}

export default function BaseModal({ 
  isOpen, 
  onClose, 
  title, 
  icon, 
  children, 
  footer, 
  maxWidth = 'md',
  hideCloseButton = false
}: BaseModalProps) {

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCloseRef.current()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const mwClass = MAX_WIDTH_CLASSES[maxWidth] || 'sm:max-w-md'

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center p-4 sm:p-0"
          style={{
            zIndex: Z_INDEX.MODAL,
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'var(--glass-scrim)',
            WebkitBackdropFilter: 'var(--glass-scrim)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <m.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className={`w-full ${mwClass} rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh]`}
            style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-modal)' }}
          >
            {(title || icon || !hideCloseButton) && (
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {icon}
                  {title && (
                    <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                      {title}
                    </h2>
                  )}
                </div>
                {!hideCloseButton && (
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="p-1 rounded-md hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--color-text-tertiary)' }}
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="overflow-y-auto overscroll-contain flex-1 -mx-2 px-2">
              {children}
            </div>

            {footer && (
              <div className="flex gap-2 justify-end shrink-0 pt-3 mt-1" style={{ borderTop: `1px solid ${COLORS.BORDER}` }}>
                {footer}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
