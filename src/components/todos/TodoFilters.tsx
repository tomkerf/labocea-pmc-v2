import { Search } from 'lucide-react'
import { m } from 'framer-motion'
import { COLORS } from '@/lib/constants'
import type { PageAction, PageState } from '@/pages/todos/todosPageReducer'

interface TodoFiltersProps {
  search: PageState['search']
  filterTab: PageState['filterTab']
  filterPriority: PageState['filterPriority']
  dispatch: React.Dispatch<PageAction>
}

export default function TodoFilters({ search, filterTab, dispatch }: TodoFiltersProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
        <input
          value={search}
          onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
          aria-label="Rechercher une tâche"
          placeholder="Rechercher une tâche par titre, client, matériel..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
          style={{
            background: COLORS.BG_SECONDARY,
            border: '1px solid var(--color-border-subtle)',
            color: COLORS.TEXT_PRIMARY,
          }}
        />
      </div>

      <div className="flex items-center">
        <div
          className="relative flex p-0.5 rounded-lg text-xs font-semibold w-full"
          style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}
        >
          {([
            { id: 'toutes', label: 'Toutes' },
            { id: 'mes_taches', label: 'Miennes' },
            { id: 'equipe', label: 'Équipe' },
            { id: 'priorite', label: 'Priorité' },
          ] as const).map((tab) => {
            const isActive = filterTab === tab.id
            return (
              <button type="button"
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_FILTER_TAB', payload: tab.id })}
                className="relative z-10 py-1.5 rounded-md transition-colors cursor-pointer focus:outline-none flex-1 text-center font-bold"
                style={{ color: isActive ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY }}
              >
                {isActive && (
                  <m.div
                    layoutId="active-todo-tab"
                    className="absolute inset-0 rounded-md -z-10 shadow-sm"
                    style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-card)' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
