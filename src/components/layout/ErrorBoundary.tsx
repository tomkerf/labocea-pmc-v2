import { Component, type ReactNode } from 'react'
import { COLORS } from '@/lib/constants'
import { isChunkError, reloadOnceForChunkError } from '@/lib/chunkError'


interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Remplace l'écran blanc par un message d'erreur lisible.
 * Encapsuler les routes protégées pour intercepter les crashes de rendu.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    if (isChunkError(error.message)) return { error: null }
    return { error }
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error.message)) {
      if (reloadOnceForChunkError()) return
      this.setState({ error })
      return
    }
    console.error('[ErrorBoundary]', error.message, error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
            Une erreur est survenue
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.TEXT_SECONDARY }}>
            {this.state.error.message}
          </p>
          <button type="button"
            onClick={() => { this.setState({ error: null }); history.back() }}
            className="text-sm px-4 py-2 rounded-lg font-medium"
            style={{ background: COLORS.ACCENT, color: 'white' }}
          >
            Retour
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
