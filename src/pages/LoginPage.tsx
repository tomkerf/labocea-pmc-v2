import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/hooks/useAuth'
import { COLORS } from '@/lib/constants'


export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      setError('Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.BG_PRIMARY }}>
      <div className="w-full max-w-sm mx-4">

        {/* Logo / Titre */}
        <div className="text-center mb-10">
          <div className="size-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: COLORS.ACCENT }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="10" r="5" fill="white" />
              <path d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY, letterSpacing: '-0.5px' }}>
            Labocea PMC
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
            Connecte-toi pour accéder à ton espace
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-xl overflow-hidden mb-4"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}
          >
            {/* Email */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <label htmlFor="login-email" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="thomas@labocea.fr"
                required
                autoComplete="email"
                className="w-full text-sm outline-none bg-transparent"
                style={{ color: COLORS.TEXT_PRIMARY }}
              />
            </div>

            {/* Mot de passe */}
            <div className="px-4 py-3">
              <label htmlFor="login-password" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                Mot de passe
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full text-sm outline-none bg-transparent"
                style={{ color: COLORS.TEXT_PRIMARY }}
              />
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-sm mb-4 text-center" style={{ color: COLORS.DANGER }}>
              {error}
            </p>
          )}

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              background: COLORS.ACCENT,
              color: 'white',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--color-text-tertiary)' }}>
          Labocea — Usage interne uniquement
        </p>
      </div>
    </div>
  )
}
