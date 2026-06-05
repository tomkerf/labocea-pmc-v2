import { useState } from 'react'
import { KeyRound, ChevronDown } from 'lucide-react'
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { COLORS } from '@/lib/constants'

export function ChangePasswordSection({ email }: { email: string }) {
  const [open,    setOpen]    = useState(false)
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [status,  setStatus]  = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setErrorMsg('Les mots de passe ne correspondent pas.'); setStatus('error'); return }
    if (next.length < 6)  { setErrorMsg('Le mot de passe doit faire au moins 6 caractères.'); setStatus('error'); return }

    setStatus('saving'); setErrorMsg('')
    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user || !email) throw new Error('Utilisateur non connecté.')
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, current))
      await updatePassword(user, next)
      setStatus('success')
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => { setStatus('idle'); setOpen(false) }, 2000)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('Mot de passe actuel incorrect.')
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Trop de tentatives. Réessaie dans quelques minutes.')
      } else {
        setErrorMsg('Une erreur est survenue. Réessaie.')
      }
      setStatus('error')
    }
  }

  return (
    <div className="rounded-xl mb-4 overflow-hidden"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyRound size={16} strokeWidth={1.8} style={{ color: COLORS.TEXT_SECONDARY }} />
          <span className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>Changer le mot de passe</span>
        </div>
        <ChevronDown size={16} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <div className="pt-4 flex flex-col gap-3">
            {[
              { label: 'Mot de passe actuel', value: current, onChange: setCurrent },
              { label: 'Nouveau mot de passe', value: next,    onChange: setNext    },
              { label: 'Confirmer',            value: confirm, onChange: setConfirm },
            ].map(({ label, value, onChange }) => {
              const id = `cp-pwd-${label.toLowerCase().replace(/\s+/g, '-')}`
              return (
                <div key={label}>
                  <label htmlFor={id} className="text-xs font-medium block mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>{label}</label>
                  <input id={id} type="password" value={value} onChange={e => onChange(e.target.value)} required
                    className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                    style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
                </div>
              )
            })}
          </div>
          {status === 'error'   && <p className="text-xs" style={{ color: COLORS.DANGER  }}>{errorMsg}</p>}
          {status === 'success' && <p className="text-xs" style={{ color: COLORS.SUCCESS }}>Mot de passe mis à jour.</p>}
          <button type="submit" disabled={status === 'saving'}
            className="text-sm font-medium px-4 py-2 rounded-lg mt-1"
            style={{ background: COLORS.ACCENT, color: 'white', opacity: status === 'saving' ? 0.6 : 1 }}>
            {status === 'saving' ? 'Mise à jour…' : 'Mettre à jour'}
          </button>
        </form>
      )}
    </div>
  )
}
