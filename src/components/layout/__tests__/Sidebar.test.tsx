import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import Sidebar from '../Sidebar'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'

// BugReportModal (importé par Sidebar) tire @/lib/firebase — on évite l'init réelle
vi.mock('@/lib/firebase', () => ({
  db: {}
}))

// ── Helper ──────────────────────────────────────────────────────
function renderSidebar() {
  return render(
    <LazyMotion features={domAnimation}>
      <MemoryRouter><Sidebar /></MemoryRouter>
    </LazyMotion>
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  useChatNotificationStore.setState({ unreadCount: 0 })
})

describe('Sidebar — rail repliable', () => {
  it('affiche la sidebar dépliée par défaut avec le bouton de réduction', () => {
    renderSidebar()
    expect(screen.getByText('Planning')).toBeTruthy()
    const toggle = screen.getByRole('button', { name: 'Réduire la barre latérale' })
    expect(toggle).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('replier masque les libellés, titres de sections et titre de l\'app', () => {
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: 'Réduire la barre latérale' }))
    expect(screen.queryByText('Planning')).toBeNull()
    expect(screen.queryByText('Activité & Planning')).toBeNull()
    expect(screen.queryByText('Labocea PMC')).toBeNull()
    expect(screen.getByRole('link', { name: 'Planning' })).toBeTruthy()
  })

  it('persiste l\'état replié dans localStorage et le restaure au montage', () => {
    const { unmount } = renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: 'Réduire la barre latérale' }))
    expect(localStorage.getItem('sidebar_collapsed')).toBe('true')

    unmount()
    renderSidebar()
    const toggle = screen.getByRole('button', { name: 'Développer la barre latérale' })
    expect(toggle).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('affiche le badge de messagerie en mode rail', () => {
    useChatNotificationStore.setState({ unreadCount: 3 })
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: 'Réduire la barre latérale' }))
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Messagerie (3)' })).toBeTruthy()
  })

  it('conserve l\'état des sections repliables après un aller-retour rail', () => {
    renderSidebar()
    // Déplie la section « Matériel & Suivi » (repliée par défaut)
    fireEvent.click(screen.getByRole('button', { name: /Matériel & Suivi/ }))
    expect(screen.getByText('Matériel')).toBeTruthy()

    // Passage en mode rail : les items restent accessibles (liste aplatie)
    fireEvent.click(screen.getByRole('button', { name: 'Réduire la barre latérale' }))
    expect(screen.getByRole('link', { name: 'Matériel' })).toBeTruthy()

    // Retour en mode déplié : la section reste dépliée
    fireEvent.click(screen.getByRole('button', { name: 'Développer la barre latérale' }))
    expect(screen.getByText('Matériel')).toBeTruthy()
    // La section jamais dépliée reste repliée
    expect(screen.queryByText('Asservissement')).toBeNull()
  })
})
