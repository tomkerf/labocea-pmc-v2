import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Remplace l'écran blanc par un message d'erreur lisible.
 * Encapsuler les routes protégées pour intercepter les crashes de rendu.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary]', error.message, error)
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed')
    ) {
      window.location.reload()
      return { error: null }
    }
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Une erreur est survenue
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {this.state.error.message}
          </p>
          <button type="button"
            onClick={() => { this.setState({ error: null }); history.back() }}
            className="text-sm px-4 py-2 rounded-lg font-medium"
            style={{ background: 'var(--color-accent)', color: 'white' }}
          >
            Retour
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
