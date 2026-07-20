import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ClipboardList } from 'lucide-react'
import { createClient } from '@/services/clientService'
import { useMissionsStore } from '@/stores/missionsStore'
import { usePreleveursStore } from '@/stores/preleveursStore'
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import { isSamplingOverdue } from '@/lib/overdue'
import ClientCard from '@/components/client/ClientCard'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { Client } from '@/types'


function hasOverdue(client: Client): boolean {
  const year = Number(client.annee) || undefined
  return client.plans.some((p) => p.samplings.some((s) => isSamplingOverdue(s, year, p.methode === 'Automatique')))
}

export default function MissionsPage() {
  const navigate = useNavigate()
  const { clients, loading } = useMissionsStore()
  usePreleveursListener()
  const preleveurs = usePreleveursStore((s) => s.preleveurs)
  const uid = useAuthStore(selectUid)
  const initiales = useAuthStore(selectInitiales)

  // Extraire les sites uniques des prélèveurs
  const availableSites = useMemo(() => {
    const sites = new Set<string>()
    preleveurs.forEach(p => {
      if (p.site) sites.add(p.site)
    })
    return Array.from(sites).sort()
  }, [preleveurs])

  // Extraire les techniciens uniques assignés aux clients
  const availableTechs = useMemo(() => {
    const techs = new Set<string>()
    clients.forEach(c => {
      if (c.preleveur) techs.add(c.preleveur)
    })
    return Array.from(techs).sort()
  }, [clients])

  const [search, setSearch] = useState('')
  const [onlyRetard, setOnlyRetard] = useState(false)
  const [creating, setCreating] = useState(false)

  // Initialisation des filtres et sauvegarde dans le localStorage par utilisateur
  const [filterSite, setFilterSite] = useState<string>(() => {
    const key = uid ? `missions_filter_site_${uid}` : 'missions_filter_site'
    const saved = localStorage.getItem(key)
    if (saved !== null) return saved
    const ini = useAuthStore.getState().appUser?.initiales ?? ''
    const prel = usePreleveursStore.getState().preleveurs.find(p => p.code === ini)
    return prel?.site ?? ''
  })

  const [filterTech, setFilterTech] = useState<string>(() => {
    const key = uid ? `missions_filter_tech_${uid}` : 'missions_filter_tech'
    const saved = localStorage.getItem(key)
    return saved ?? ''
  })

  const [filterPause, setFilterPause] = useState<string>(() => {
    const key = uid ? `missions_filter_pause_${uid}` : 'missions_filter_pause'
    return localStorage.getItem(key) ?? 'actifs'
  })

  const handleFilterPauseChange = (val: string) => {
    setFilterPause(val)
    if (uid) {
      localStorage.setItem(`missions_filter_pause_${uid}`, val)
    }
  }

  // Effet pour appliquer le site géographique du préleveur par défaut lors de sa première connexion
  const siteDefaultApplied = useRef(false)
  useEffect(() => {
    if (!preleveurs.length || !uid) return
    const key = `missions_filter_site_${uid}`
    if (localStorage.getItem(key) !== null) {
      siteDefaultApplied.current = true
      return
    }
    if (siteDefaultApplied.current) return
    siteDefaultApplied.current = true
    const prel = preleveurs.find(p => p.code === initiales)
    const site = prel?.site
    // Init one-shot depuis données async (guard siteDefaultApplied) — cf. .react-doctor/false-positives.md
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (site) setFilterSite(site)
  }, [preleveurs, initiales, uid])

  const handleFilterSiteChange = (val: string) => {
    setFilterSite(val)
    if (uid) {
      localStorage.setItem(`missions_filter_site_${uid}`, val)
    }
  }

  const handleFilterTechChange = (val: string) => {
    setFilterTech(val)
    if (uid) {
      localStorage.setItem(`missions_filter_tech_${uid}`, val)
    }
  }

  const overdueCount = clients.filter(hasOverdue).length

  // Filtre pause : Actifs (défaut) exclut les clients en pause de la liste Missions ;
  // Planning et dashboard les excluent toujours, indépendamment.
  const visibleClients = clients.filter((c) => {
    if (filterPause === 'pause') return !!c.pause
    if (filterPause === 'tous') return true
    return !c.pause
  })

  const filtered = visibleClients.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.nom.toLowerCase().includes(q) ||
      (c.segment ?? '').toLowerCase().includes(q) ||
      (c.preleveur ?? '').toLowerCase().includes(q)
    const matchRetard = !onlyRetard || hasOverdue(c)

    // Filtre par site (si le préleveur assigné appartient au site géographique sélectionné)
    const assigned = c.preleveur || ''
    const prel = preleveurs.find(pr => pr.code === assigned)
    const matchSite = !filterSite || prel?.site === filterSite

    // Filtre par technicien (préleveur)
    const matchTech = !filterTech || assigned === filterTech

    return matchSearch && matchRetard && matchSite && matchTech
  })

  async function handleNewClient() {
    if (!uid || creating) return
    setCreating(true)
    try {
      const id = await createClient(
        {
          annee: String(new Date().getFullYear()),
          nom: 'Nouveau client',
          numClient: '',
          nouvelleDemande: 'Annuelle',
          interlocuteur: '',
          telephone: '',
          mobile: '',
          email: '',
          fonction: '',
          mission: '',
          segment: 'Réseau de mesure',
          numDevis: '',
          numConvention: '',
          preleveur: '',
          dureeContrat: '',
          periodeIntervention: '',
          sites: [],
          montantTotal: 0,
          partPMC: 0,
          partSousTraitance: 0,
        },
        uid,
      )
      navigate(`/missions/${id}`, { state: { isNewDraft: true } })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 bg-[var(--color-bg-primary)]">
      {/* En-tête */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Missions
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {loading ? '…' : `${clients.length} client${clients.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button type="button"
          onClick={handleNewClient}
          disabled={creating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold w-full sm:w-auto transition-all active:scale-[0.98] cursor-pointer bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-sm hover:shadow"
          style={{ opacity: creating ? 0.7 : 1 }}
        >
          <Plus size={16} />
          Nouveau client
        </button>
      </div>

      {/* Filtres globaux (Site et Technicien) */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="missions-filter-site" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Site géographique
          </label>
          <select
            id="missions-filter-site"
            value={filterSite}
            onChange={(e) => handleFilterSiteChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all shadow-sm cursor-pointer"
          >
            <option value="">Tous les sites</option>
            {availableSites.map(site => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="missions-filter-tech" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Technicien (préleveur)
          </label>
          <select
            id="missions-filter-tech"
            value={filterTech}
            onChange={(e) => handleFilterTechChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all shadow-sm cursor-pointer"
          >
            <option value="">Tous les techniciens</option>
            {availableTechs.map(tech => (
              <option key={tech} value={tech}>{tech}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="missions-filter-pause" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Statut
          </label>
          <select
            id="missions-filter-pause"
            value={filterPause}
            onChange={(e) => handleFilterPauseChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all shadow-sm cursor-pointer"
          >
            <option value="actifs">Actifs</option>
            <option value="pause">En pause</option>
            <option value="tous">Tous</option>
          </select>
        </div>
      </div>

      {/* Recherche + filtre retard */}
      <div className="flex gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            aria-label="Rechercher un client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client, segment, préleveur…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all shadow-sm"
          />
        </div>

        {overdueCount > 0 && (
          <button type="button"
            onClick={() => setOnlyRetard((v) => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all border active:scale-95 shadow-sm cursor-pointer ${
              onlyRetard
                ? 'bg-[var(--color-danger)] text-white border-transparent'
                : 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[rgba(255,59,48,0.15)] hover:bg-[var(--color-danger)] hover:text-white hover:border-transparent'
            }`}
          >
            <span className="size-1 rounded-full bg-current shrink-0 animate-pulse" />
            {overdueCount} en retard
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList count={5} variant="card" />
      ) : filtered.length === 0 ? (
        onlyRetard || search ? (
          <div className="text-center py-16 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border-subtle)] shadow-sm">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {onlyRetard ? 'Aucun client en retard.' : 'Aucun résultat pour cette recherche.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border-subtle)] shadow-sm">
            <div className="size-14 rounded-2xl flex items-center justify-center bg-[var(--color-accent-light)] border border-[rgba(0,113,227,0.08)]">
              <ClipboardList size={22} strokeWidth={1.5} className="text-[var(--color-accent)]" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">Aucun client</p>
              <p className="text-sm mt-1 text-[var(--color-text-secondary)] leading-relaxed">
                Commencez par ajouter votre premier client.
              </p>
            </div>
            <button type="button" onClick={handleNewClient} disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              style={{ opacity: creating ? 0.7 : 1 }}
            >
              <Plus size={14} />
              Nouveau client
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
