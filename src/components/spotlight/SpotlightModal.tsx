import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import BaseModal from '@/components/ui/BaseModal'
import { useMissionsStore } from '@/stores/missionsStore'
import { useSpotlightStore } from '@/stores/spotlightStore'
import { useSpotlightResults } from '@/hooks/useSpotlightResults'
import { COLORS } from '@/lib/constants'

interface FlatResult {
  key: string
  label: string
  sublabel: string
  to: string
}

export default function SpotlightModal() {
  const navigate = useNavigate()
  const isOpen = useSpotlightStore((s) => s.isOpen)
  const close = useSpotlightStore((s) => s.close)
  const clients = useMissionsStore((s) => s.clients)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useSpotlightResults(clients, query)

  const flatResults = useMemo<FlatResult[]>(() => [
    ...results.clients.map((c) => ({
      key: `client-${c.id}`,
      label: c.nom,
      sublabel: c.segment || 'Client',
      to: `/missions/${c.id}`,
    })),
    ...results.plans.map(({ plan, client }) => ({
      key: `plan-${plan.id}`,
      label: plan.nom,
      sublabel: `${client.nom} · ${plan.siteNom}`,
      to: `/missions/${client.id}/plan/${plan.id}`,
    })),
  ], [results])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  function handleSelect(result: FlatResult) {
    navigate(result.to)
    close()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = flatResults[selectedIndex]
      if (selected) handleSelect(selected)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={close} hideCloseButton maxWidth="lg">
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

        {query.trim() && flatResults.length === 0 && (
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
              <button key={c.id} type="button"
                onClick={() => handleSelect(flatResults[i])}
                className="flex flex-col items-start px-2 py-2 rounded-lg text-left"
                style={{ background: selectedIndex === i ? 'var(--color-accent-light)' : 'transparent' }}>
                <span className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{c.nom}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{c.segment || 'Client'}</span>
              </button>
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
                <button key={plan.id} type="button"
                  onClick={() => handleSelect(flatResults[flatIndex])}
                  className="flex flex-col items-start px-2 py-2 rounded-lg text-left"
                  style={{ background: selectedIndex === flatIndex ? 'var(--color-accent-light)' : 'transparent' }}>
                  <span className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{plan.nom}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{client.nom} · {plan.siteNom}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </BaseModal>
  )
}
