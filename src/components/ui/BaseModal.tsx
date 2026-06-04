import { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const maxWidthClasses = {
    'sm': 'sm:max-w-sm',
    'md': 'sm:max-w-md',
    'lg': 'sm:max-w-lg',
    'xl': 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
  }

  const mwClass = maxWidthClasses[maxWidth] || 'sm:max-w-md'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center p-4 sm:p-0"
          style={{
            zIndex: Z_INDEX.MODAL,
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
