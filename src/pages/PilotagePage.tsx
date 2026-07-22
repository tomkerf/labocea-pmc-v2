import { useState, useMemo } from 'react'
import { CalendarRange, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMissionsStore } from '@/stores/missionsStore'
import { usePreleveursStore } from '@/stores/preleveursStore'
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import { useAuthStore, selectUid } from '@/stores/authStore'
import YearMatrixView from '@/components/planning/YearMatrixView'
import WorkloadMatrixView from '@/components/planning/WorkloadMatrixView'
import { COLORS } from '@/lib/constants'

export default function PilotagePage() {
  const { clients } = useMissionsStore()
  usePreleveursListener()
  const preleveurs = usePreleveursStore((s) => s.preleveurs)
  const uid = useAuthStore(selectUid)

  const availableSites = useMemo(() => {
    const sites = new Set<string>()
    preleveurs.forEach(p => { if (p.site) sites.add(p.site) })
    return Array.from(sites).sort()
  }, [preleveurs])

  const availableTechs = useMemo(() => {
    const techs = new Set<string>()
    clients.forEach(c => { if (c.preleveur) techs.add(c.preleveur) })
    return Array.from(techs).sort()
  }, [clients])

  const [view, setView] = useState<'annee' | 'charge'>('annee')
  const [year, setYear] = useState(new Date().getFullYear())

  const [filterSite, setFilterSite] = useState<string>(() => {
    const key = uid ? `pilotage_filter_site_${uid}` : 'pilotage_filter_site'
    return localStorage.getItem(key) ?? ''
  })
  const [filterTech, setFilterTech] = useState<string>(() => {
    const key = uid ? `pilotage_filter_tech_${uid}` : 'pilotage_filter_tech'
    return localStorage.getItem(key) ?? ''
  })
  const [filterMethod, setFilterMethod] = useState('')
  const [filterPause, setFilterPause] = useState<string>(() => {
    const key = uid ? `pilotage_filter_pause_${uid}` : 'pilotage_filter_pause'
    return localStorage.getItem(key) ?? 'actifs'
  })

  const handleFilterSiteChange = (val: string) => {
    setFilterSite(val)
    if (uid) localStorage.setItem(`pilotage_filter_site_${uid}`, val)
  }
  const handleFilterTechChange = (val: string) => {
    setFilterTech(val)
    if (uid) localStorage.setItem(`pilotage_filter_tech_${uid}`, val)
  }
  const handleFilterPauseChange = (val: string) => {
    setFilterPause(val)
    if (uid) localStorage.setItem(`pilotage_filter_pause_${uid}`, val)
  }

  const visibleClients = clients.filter((c) => {
    if (filterPause === 'pause') return !!c.pause
    if (filterPause === 'tous') return true
    return !c.pause
  })

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-6 pt-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            Pilotage
          </h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            Vue d'ensemble annuelle et charge de travail de l'équipe
          </p>
        </div>
      </div>

      {/* Toggle Vue annuelle / Charge */}
      <div className="shrink-0 flex gap-1 p-1 rounded-lg mb-3 w-fit ml-6"
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
        {([['annee', 'Vue annuelle', CalendarRange], ['charge', 'Charge', BarChart3]] as const).map(([v, label, Icon]) => {
          const active = view === v
          const softActive = v === 'charge'
          return (
            <button type="button" key={v} onClick={() => setView(v)}
              className="px-3 py-1 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              style={{
                background: active ? (softActive ? 'var(--color-accent-light)' : COLORS.ACCENT) : 'transparent',
                color: active ? (softActive ? COLORS.ACCENT : 'white') : COLORS.TEXT_SECONDARY,
              }}>
              <Icon size={13} /> {label}
            </button>
          )
        })}
      </div>

      {/* Filtres */}
      <div className="shrink-0 flex flex-col sm:flex-row gap-3 mb-3 px-6">
        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="pilotage-filter-site" className="sr-only">Site géographique</label>
          <select
            id="pilotage-filter-site"
            value={filterSite}
            onChange={(e) => handleFilterSiteChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
          >
            <option value="">Site : tous les sites</option>
            {availableSites.map(site => <option key={site} value={site}>{site}</option>)}
          </select>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="pilotage-filter-tech" className="sr-only">Technicien (préleveur)</label>
          <select
            id="pilotage-filter-tech"
            value={filterTech}
            onChange={(e) => handleFilterTechChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
          >
            <option value="">Technicien : tous</option>
            {availableTechs.map(tech => <option key={tech} value={tech}>{tech}</option>)}
          </select>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="pilotage-filter-pause" className="sr-only">Statut</label>
          <select
            id="pilotage-filter-pause"
            value={filterPause}
            onChange={(e) => handleFilterPauseChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
          >
            <option value="actifs">Statut : actifs</option>
            <option value="pause">Statut : en pause</option>
            <option value="tous">Statut : tous</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="pilotage-filter-method" className="sr-only">Méthode</label>
          <select
            id="pilotage-filter-method"
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_PRIMARY }}
          >
            <option value="">Méthode : toutes</option>
            <option value="Ponctuel">Ponctuel</option>
            <option value="Composite">Composite</option>
            <option value="Automatique">Bilan 24 (Automatique)</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Navigation Année */}
        <div className="shrink-0 flex items-center gap-3 mb-3 px-6">
          <button type="button" onClick={() => setYear((y) => y - 1)}
            aria-label="Année précédente"
            className="size-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_SECONDARY }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            Année {year}
          </span>
          <button type="button" onClick={() => setYear((y) => y + 1)}
            aria-label="Année suivante"
            className="size-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_SECONDARY }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {view === 'annee' ? (
          <YearMatrixView
            clients={visibleClients}
            year={year}
            filterTech={filterTech}
            filterSite={filterSite}
            filterMethod={filterMethod}
            preleveurs={preleveurs}
          />
        ) : (
          <WorkloadMatrixView
            clients={visibleClients}
            year={year}
            filterTech={filterTech}
            filterSite={filterSite}
            filterMethod={filterMethod}
            preleveurs={preleveurs}
          />
        )}
      </div>
    </div>
  )
}
