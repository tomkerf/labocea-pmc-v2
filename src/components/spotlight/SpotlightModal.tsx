import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import BaseModal from '@/components/ui/BaseModal'
import { useMissionsStore } from '@/stores/missionsStore'
import { useSpotlightStore } from '@/stores/spotlightStore'
import { useSpotlightResults } from '@/hooks/useSpotlightResults'
import { COLORS } from '@/lib/constants'

interface ResultRowProps {
  label: string
  sublabel: string
  isSelected: boolean
  onClick: () => void
}

function ResultRow({ label, sublabel, isSelected, onClick }: ResultRowProps) {
  return (
    <button type="button"
      onClick={onClick}
      className="flex flex-col items-start px-2 py-2 rounded-lg text-left"
      style={{ background: isSelected ? 'var(--color-accent-light)' : 'transparent' }}>
      <span className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{label}</span>
      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{sublabel}</span>
    </button>
  )
}

export default function SpotlightModal() {
  const navigate = useNavigate()
  const isOpen = useSpotlightStore((s) => s.isOpen)
  const close = useSpotlightStore((s) => s.close)
  const clients = useMissionsStore((s) => s.clients)
  const [query, setQuery] = useState('')
  const [prevQuery, setPrevQuery] = useState(query)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useSpotlightResults(clients, query)

  // Adjust state during render (React-documented pattern) instead of an
  // effect: keeps selection in sync with the query without a set-state-in-effect.
  if (query !== prevQuery) {
    setPrevQuery(query)
    setSelectedIndex(0)
  }

  const flatTargets = useMemo<string[]>(() => [
    ...results.clients.map((c) => `/missions/${c.id}`),
    ...results.plans.map(({ plan, client }) => `/missions/${client.id}/plan/${plan.id}`),
  ], [results])

  function handleClose() {
    close()
    setQuery('')
    setSelectedIndex(0)
  }

  function handleSelect(to: string) {
    navigate(to)
    handleClose()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatTargets.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = flatTargets[selectedIndex]
      if (target) handleSelect(target)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} hideCloseButton maxWidth="lg">
      <div className="flex flex-col gap-1 -mt-2">
        <div className="flex items-center gap-2 px-1 pb-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Search size={16} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un client, un point…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: COLORS.TEXT_PRIMARY }}
            aria-label="Rechercher"
          />
        </div>

        {query.trim() && flatTargets.length === 0 && (
          <p className="text-sm px-1 py-4" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun résultat pour « {query} »
          </p>
        )}

        {results.clients.length > 0 && (
          <div className="flex flex-col pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-1 pb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Clients
            </p>
            {results.clients.map((c, i) => (
              <ResultRow key={c.id}
                label={c.nom}
                sublabel={c.segment || 'Client'}
                isSelected={selectedIndex === i}
                onClick={() => handleSelect(flatTargets[i])}
              />
            ))}
          </div>
        )}

        {results.plans.length > 0 && (
          <div className="flex flex-col pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-1 pb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Points de prélèvement
            </p>
            {results.plans.map(({ plan, client }, i) => {
              const flatIndex = results.clients.length + i
              return (
                <ResultRow key={plan.id}
                  label={plan.nom}
                  sublabel={`${client.nom} · ${plan.siteNom}`}
                  isSelected={selectedIndex === flatIndex}
                  onClick={() => handleSelect(flatTargets[flatIndex])}
                />
              )
            })}
          </div>
        )}
      </div>
    </BaseModal>
  )
}
