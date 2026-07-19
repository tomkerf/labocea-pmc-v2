import { useState, useEffect } from 'react'
import { useAuthStore, selectRole } from '@/stores/authStore'
import type { UserRole } from '@/types'
import { ParOuCommencerSection, StatutsSection } from '@/components/aide/IntroSections'
import { PlanningSection, ValidationSection, Bilan24hSection } from '@/components/aide/PlanningSections'
import { MissionClientSection, VisitePreliminaireSection } from '@/components/aide/MissionsSections'
import { MaterielSection, MetrologieSection } from '@/components/aide/MaterielSections'
import { DashboardSection, SignalerProblemeSection } from '@/components/aide/DashboardSections'
import { COLORS } from '@/lib/constants'
import { AnimatePresence, m } from 'framer-motion'
import {
  Compass,
  ClipboardList,
  Calendar,
  CheckCircle2,
  Briefcase,
  Eye,
  Clock,
  Wrench,
  Activity,
  LayoutDashboard,
  AlertCircle,
  Search,
  Check,
  ChevronRight,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ChevronDown
} from 'lucide-react'

type RoleFilter = UserRole | 'tous'

const ROLES: { value: RoleFilter; label: string; desc: string }[] = [
  { value: 'tous',           label: 'Tout afficher',      desc: 'Tous les modules' },
  { value: 'technicien',     label: 'Technicien terrain', desc: 'Planning, terrain, matériel' },
  { value: 'charge_mission', label: 'Chargé de mission',  desc: 'Missions, clients, rapports' },
  { value: 'admin',          label: 'Admin',              desc: 'Gestion complète' },
]

interface SectionMeta {
  key: string
  title: string
  subtitle: string
  category: string
  icon: React.ElementType
  component: React.ComponentType
  roles: UserRole[]
  keywords: string[]
}

const SECTIONS: SectionMeta[] = [
  {
    key: 'debut',
    title: 'Par où commencer',
    subtitle: 'Les étapes de démarrage et routine quotidienne.',
    category: 'Démarrage & Généralités',
    icon: Compass,
    component: ParOuCommencerSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['premiere', 'connexion', 'mot de passe', 'profil', 'initiales', 'routine', 'quotidienne', 'sauvegarde', 'debut', 'démarrage', 'commencer', 'routine']
  },
  {
    key: 'dashboard',
    title: 'Tableau de bord',
    subtitle: 'Ta vue quotidienne et alertes de la page d’accueil.',
    category: 'Démarrage & Généralités',
    icon: LayoutDashboard,
    component: DashboardSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['accueil', 'kpi', 'planning', 'jour', 'tournee', 'alertes', 'activite', 'compteur', 'dashboard']
  },
  {
    key: 'statuts',
    title: 'Statuts des prélèvements',
    subtitle: 'Signification et couleur des différents statuts.',
    category: 'Démarrage & Généralités',
    icon: ClipboardList,
    component: StatutsSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['planifie', 'realise', 'retard', 'non effectue', 'motif', 'nappe', 'rapport', 'couleur', 'legendes', 'statuts']
  },
  {
    key: 'planning',
    title: 'Le Planning au quotidien',
    subtitle: 'Naviguer, filtrer et modifier le calendrier commun.',
    category: 'Planification & Terrain',
    icon: Calendar,
    component: PlanningSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['planning', 'calendrier', 'semaine', 'mois', 'carte', 'filtre', 'evenement', 'conge', 'rtt', 'temps de pluie', 'glisser-deposer']
  },
  {
    key: 'validation',
    title: 'Valider un prélèvement',
    subtitle: 'Le mode tournée et la validation de fiches.',
    category: 'Planification & Terrain',
    icon: CheckCircle2,
    component: ValidationSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['validation', 'prelevement', 'tournee', 'photo', 'motif', 'decaler', 'terrain', 'realise', 'checklist', 'valider']
  },
  {
    key: 'bilan24h',
    title: 'Bilans 24h (J1 & J2)',
    subtitle: 'Spécificités des poses et récupérations de préleveurs.',
    category: 'Planification & Terrain',
    icon: Clock,
    component: Bilan24hSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['pose', 'recuperation', 'flacon', 'bilan 24h', 'j1', 'j2', 'preleveur', 'automatique']
  },
  {
    key: 'missions',
    title: 'Missions & Clients',
    subtitle: 'Fiche client, plan de prélèvement et configuration.',
    category: 'Missions & Clients',
    icon: Briefcase,
    component: MissionClientSection,
    roles: ['charge_mission', 'admin'],
    keywords: ['client', 'mission', 'plan de prelevement', 'frequence', 'nature', 'methode', 'gps', 'devis', 'contrat', 'sous-traitance', 'commercial']
  },
  {
    key: 'visite',
    title: 'Visites Préliminaires',
    subtitle: 'Préparer et documenter les visites d’accès.',
    category: 'Missions & Clients',
    icon: Eye,
    component: VisitePreliminaireSection,
    roles: ['charge_mission', 'admin'],
    keywords: ['visite', 'preliminaire', 'vp', 'acces', 'photo', 'securite', 'consigne', 'fiche']
  },
  {
    key: 'materiel',
    title: 'Gestion du matériel',
    subtitle: 'Suivi du parc d’équipements et états de service.',
    category: 'Matériel & Support',
    icon: Wrench,
    component: MaterielSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['materiel', 'equipement', 'fiche', 'inventaire', 'categorie', 'etat', 'localisation', 'notice', 'panne']
  },
  {
    key: 'metrologie',
    title: 'Métrologie & Étalonnage',
    subtitle: 'Vérifications périodiques et conformités COFRAC.',
    category: 'Matériel & Support',
    icon: Activity,
    component: MetrologieSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['metrologie', 'etalonnage', 'verification', 'controle', 'cofrac', 'certificat', 'conforme', 'non-conforme', 'prochain']
  },
  {
    key: 'signaler',
    title: 'Signaler un problème',
    subtitle: 'Bug in-app, erreur de données ou assistance.',
    category: 'Matériel & Support',
    icon: AlertCircle,
    component: SignalerProblemeSection,
    roles: ['technicien', 'charge_mission', 'admin'],
    keywords: ['bug', 'erreur', 'signalement', 'assistance', 'admin', 'formulaire', 'bloque', 'bugreport']
  }
]

interface ShortcutFAQ {
  question: string
  sectionKey: string
}

const FAQS: ShortcutFAQ[] = [
  { question: '🚙 Lancer la tournée terrain', sectionKey: 'validation' },
  { question: '🌧️ Activer le temps de pluie', sectionKey: 'planning' },
  { question: '📐 Enregistrer un étalonnage', sectionKey: 'metrologie' },
  { question: '🐞 Signaler un bug/problème', sectionKey: 'signaler' },
]

// Helper sub-components to keep AidePage under the 300-line warning limit
function AideHeader({
  searchQuery,
  setSearchQuery
}: {
  searchQuery: string
  setSearchQuery: (val: string) => void
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="size-6 text-[var(--color-accent)]" />
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            Guide & Mode d'emploi
          </h1>
        </div>
        <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
          Tout ce qu'il faut savoir pour utiliser l'application terrain & bureau Labocea PMC.
        </p>
      </div>

      <div className="relative w-full md:w-80 shrink-0">
        <Search className="absolute left-3 top-2.5 size-4 text-[var(--color-text-tertiary)]" />
        <input
          id="search-aide"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher (ex: métrologie, tournée)..."
          className="w-full pl-9 pr-10 py-2 text-sm rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          style={{ color: COLORS.TEXT_PRIMARY }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            Effacer
          </button>
        )}
        {!searchQuery && (
          <span className="absolute right-3 top-2.5 px-1.5 py-0.5 text-[9px] font-mono rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)] pointer-events-none">
            /
          </span>
        )}
      </div>
    </div>
  )
}

function AideShortcuts({
  onShortcutClick
}: {
  onShortcutClick: (key: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
        <HelpCircle className="size-3.5" /> Accès rapide :
      </span>
      {FAQS.map(faq => (
        <button
          key={faq.sectionKey}
          type="button"
          onClick={() => onShortcutClick(faq.sectionKey)}
          className="px-2.5 py-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all cursor-pointer"
        >
          {faq.question}
        </button>
      ))}
    </div>
  )
}

function AideProfileSelector({
  filter,
  setFilter,
  defaultFilter
}: {
  filter: RoleFilter
  setFilter: (val: RoleFilter) => void
  defaultFilter: RoleFilter
}) {
  return (
    <div className="rounded-xl p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--color-text-tertiary)]" style={{ letterSpacing: '0.06em' }}>
        Mon Profil d'affichage
      </p>
      <div className="flex flex-col gap-1.5">
        {ROLES.map(({ value, label, desc }) => {
          const active = filter === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className="flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all w-full cursor-pointer"
              style={{
                background: active ? COLORS.ACCENT : 'transparent',
                color: active ? 'white' : COLORS.TEXT_PRIMARY,
              }}
            >
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[10px]" style={{ color: active ? 'rgba(255,255,255,0.75)' : 'var(--color-text-tertiary)' }}>
                {desc}
              </span>
            </button>
          )
        })}
      </div>
      {filter !== 'tous' && filter !== defaultFilter && (
        <p className="text-xs mt-3 pt-3 border-t border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">
          Ton profil réel est <strong>{defaultFilter}</strong> —{' '}
          <button type="button" onClick={() => setFilter(defaultFilter)}
            className="underline text-[var(--color-accent)] cursor-pointer">
            rétablir
          </button>
        </p>
      )}
    </div>
  )
}

function AideProgress({
  progressPercent,
  readVisibleCount,
  totalVisibleCount,
  onReset
}: {
  progressPercent: number
  readVisibleCount: number
  totalVisibleCount: number
  onReset: () => void
}) {
  return (
    <div className="rounded-xl p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Lecture du guide</span>
        {readVisibleCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            title="Réinitialiser la progression"
            className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors"
          >
            <RotateCcw className="size-3" />
          </button>
        )}
      </div>
      
      <div className="flex justify-between items-end mt-1">
        <span className="text-sm font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
          {progressPercent}% <span className="text-xs font-normal text-[var(--color-text-secondary)]">({readVisibleCount}/{totalVisibleCount})</span>
        </span>
        {progressPercent === 100 && (
          <span className="text-[10px] font-semibold bg-[var(--color-success-light)] text-[var(--color-success)] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Sparkles className="size-2.5" /> Lu !
          </span>
        )}
      </div>

      <div className="w-full h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
        <m.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progressPercent / 100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full origin-left"
          style={{ background: progressPercent === 100 ? COLORS.SUCCESS : COLORS.ACCENT, width: '100%' }}
        />
      </div>
    </div>
  )
}

function AideSidebarNav({
  categories,
  sectionsByCategory,
  activeSectionKey,
  setActiveSectionKey,
  readSections
}: {
  categories: string[]
  sectionsByCategory: Record<string, SectionMeta[]>
  activeSectionKey: string
  setActiveSectionKey: (key: string) => void
  readSections: Set<string>
}) {
  return (
    <div className="hidden md:flex flex-col gap-4">
      {categories.map(cat => (
        <div key={cat} className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] px-3 mb-1">
            {cat}
          </span>
          {(sectionsByCategory[cat] || []).map(sec => {
            const active = activeSectionKey === sec.key
            const isRead = readSections.has(sec.key)
            const Icon = sec.icon
            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveSectionKey(sec.key)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all w-full group cursor-pointer"
                style={{
                  background: active ? 'var(--color-accent-light)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={16}
                    className="shrink-0"
                    style={{ color: active ? COLORS.ACCENT : isRead ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY }}
                  />
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: active ? COLORS.ACCENT : COLORS.TEXT_PRIMARY }}
                  >
                    {sec.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isRead && (
                    <Check className="size-3.5 text-[var(--color-success)]" />
                  )}
                  {!active && (
                    <ChevronRight className="size-3.5 opacity-0 group-hover:opacity-100 text-[var(--color-text-tertiary)] transition-opacity" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function AideDesktopPane({
  activeSection,
  isRead,
  onToggleRead,
  nextSection,
  onNextSectionClick
}: {
  activeSection: SectionMeta | undefined
  isRead: boolean
  onToggleRead: () => void
  nextSection: SectionMeta | null
  onNextSectionClick: () => void
}) {
  if (!activeSection) return null
  return (
    <div className="hidden md:block">
      <AnimatePresence mode="wait">
        <m.div
          key={activeSection.key}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] flex flex-col overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]/30 flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] block mb-1">
                {activeSection.category}
              </span>
              <h2 className="text-lg font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                {activeSection.title}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {activeSection.subtitle}
              </p>
            </div>
            
            <button
              type="button"
              onClick={onToggleRead}
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              style={{
                background: isRead ? 'var(--color-success-light)' : 'transparent',
                color: isRead ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY,
                border: `1px solid ${isRead ? 'transparent' : 'var(--color-border)'}`,
              }}
            >
              {isRead ? (
                <>
                  <Check className="size-3.5 shrink-0" /> Section lue
                </>
              ) : (
                <>
                  Marquer comme lu
                </>
              )}
            </button>
          </div>

          <div className="p-6">
            <activeSection.component />
          </div>

          <div className="px-6 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]/10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onToggleRead}
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className={`size-4 rounded-full border flex items-center justify-center transition-colors ${isRead ? 'bg-[var(--color-success)] border-transparent text-white' : 'border-[var(--color-border)]'}`}>
                {isRead && <Check className="size-2.5" />}
              </span>
              {isRead ? 'Marquée comme lue' : 'Marquer cette section comme lue'}
            </button>

            {nextSection && (
              <button
                type="button"
                onClick={onNextSectionClick}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] transition-colors cursor-pointer flex items-center gap-1"
              >
                Suivant : {nextSection.title} <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        </m.div>
      </AnimatePresence>
    </div>
  )
}

function AideMobileAccordion({
  filteredSections,
  mobileExpandedKey,
  setMobileExpandedKey,
  readSections,
  onToggleRead
}: {
  filteredSections: SectionMeta[]
  mobileExpandedKey: string | null
  setMobileExpandedKey: (key: string | null) => void
  readSections: Set<string>
  onToggleRead: (key: string) => void
}) {
  return (
    <div className="md:hidden flex flex-col gap-3">
      {filteredSections.map(sec => {
        const isExpanded = mobileExpandedKey === sec.key
        const isRead = readSections.has(sec.key)
        const Icon = sec.icon
        return (
          <div
            key={sec.key}
            id={`accordion-${sec.key}`}
            className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden transition-all duration-200"
          >
            <button
              type="button"
              onClick={() => setMobileExpandedKey(isExpanded ? null : sec.key)}
              className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: isExpanded ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)' }}
                >
                  <Icon size={16} style={{ color: isExpanded ? COLORS.ACCENT : COLORS.TEXT_SECONDARY }} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] block">
                    {sec.category}
                  </span>
                  <span className="text-sm font-semibold block text-[var(--color-text-primary)] truncate">
                    {sec.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {isRead && (
                  <Check className="size-4 text-[var(--color-success)]" />
                )}
                <ChevronDown
                  className="size-4 text-[var(--color-text-tertiary)] transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  <div className="px-4 pb-4 border-t border-[var(--color-border-subtle)] pt-4">
                    <sec.component />
                    
                    <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onToggleRead(sec.key)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                        style={{
                          background: isRead ? 'var(--color-success-light)' : 'var(--color-bg-tertiary)',
                          color: isRead ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY,
                        }}
                      >
                        {isRead ? (
                          <>
                            <Check className="size-3.5" /> Lu !
                          </>
                        ) : (
                          "Marquer comme lu"
                        )}
                      </button>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

export default function AidePage() {
  const userRole = useAuthStore(selectRole)
  const defaultFilter: RoleFilter = userRole ?? 'tous'
  
  const [filter, setFilter] = useState<RoleFilter>(defaultFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSectionKey, setActiveSectionKey] = useState<string>('debut')
  const [mobileExpandedKey, setMobileExpandedKey] = useState<string | null>('debut')
  
  const [readSections, setReadSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pmc_v2_read_aide_sections')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Keyboard shortcut for focusing search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        document.getElementById('search-aide')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Sync mobile expanded key with active section key
  useEffect(() => {
    if (activeSectionKey) {
      setMobileExpandedKey(activeSectionKey)
    }
  }, [activeSectionKey])

  const toggleRead = (key: string) => {
    const updated = readSections.includes(key)
      ? readSections.filter(k => k !== key)
      : [...readSections, key]
    setReadSections(updated)
    localStorage.setItem('pmc_v2_read_aide_sections', JSON.stringify(updated))
  }

  const resetProgress = () => {
    if (window.confirm('Réinitialiser ta progression de lecture ?')) {
      setReadSections([])
      localStorage.removeItem('pmc_v2_read_aide_sections')
    }
  }

  // Filter sections based on search query and role filter
  const normalizedQuery = searchQuery.toLowerCase().trim()
  const filteredSections = SECTIONS.filter(sec => {
    if (filter !== 'tous' && !sec.roles.includes(filter)) {
      return false
    }
    if (normalizedQuery) {
      const matchTitle = sec.title.toLowerCase().includes(normalizedQuery)
      const matchSubtitle = sec.subtitle.toLowerCase().includes(normalizedQuery)
      const matchKeywords = sec.keywords.some(kw => kw.includes(normalizedQuery))
      return matchTitle || matchSubtitle || matchKeywords
    }
    return true
  })

  // Find active section or default to first filtered
  const activeSection = filteredSections.find(s => s.key === activeSectionKey) || filteredSections[0]

  // Calculate progress stats using a single pass reduce and O(1) Set lookups to avoid performance bottlenecks
  const visibleKeys = SECTIONS.reduce<string[]>((acc, s) => {
    if (filter === 'tous' || s.roles.includes(filter)) {
      acc.push(s.key)
    }
    return acc
  }, [])
  const visibleKeysSet = new Set(visibleKeys)
  const readVisibleCount = readSections.filter(k => visibleKeysSet.has(k)).length
  const totalVisibleCount = visibleKeys.length
  const progressPercent = totalVisibleCount > 0 ? Math.round((readVisibleCount / totalVisibleCount) * 100) : 0

  // Categories in filtered sections
  const categories = Array.from(new Set(filteredSections.map(s => s.category)))

  // Pre-group filtered sections by category to avoid double loop iterations inside JSX
  const sectionsByCategory = filteredSections.reduce<Record<string, SectionMeta[]>>((acc, sec) => {
    if (!acc[sec.category]) acc[sec.category] = []
    acc[sec.category].push(sec)
    return acc
  }, {})

  // Set lookup for read status to ensure O(1) checks in list renders
  const readSectionsSet = new Set(readSections)

  // Get index of active section in filtered list for Next Section button
  const activeIndex = filteredSections.findIndex(s => s.key === (activeSection?.key ?? ''))
  const nextSection = activeIndex !== -1 && activeIndex < filteredSections.length - 1 ? filteredSections[activeIndex + 1] : null

  const handleShortcutClick = (sectionKey: string) => {
    setSearchQuery('')
    setActiveSectionKey(sectionKey)
    setMobileExpandedKey(sectionKey)
    // Scroll to section details on mobile
    if (window.innerWidth < 768) {
      setTimeout(() => {
        document.getElementById(`accordion-${sectionKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      <AideHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <AideShortcuts onShortcutClick={handleShortcutClick} />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
        
        {/* Left Column (Sidebar) */}
        <div className="flex flex-col gap-6 md:sticky md:top-6">
          <AideProfileSelector filter={filter} setFilter={setFilter} defaultFilter={defaultFilter} />
          
          <AideProgress
            progressPercent={progressPercent}
            readVisibleCount={readVisibleCount}
            totalVisibleCount={totalVisibleCount}
            onReset={resetProgress}
          />

          <AideSidebarNav
            categories={categories}
            sectionsByCategory={sectionsByCategory}
            activeSectionKey={activeSection?.key ?? ''}
            setActiveSectionKey={setActiveSectionKey}
            readSections={readSectionsSet}
          />
        </div>

        {/* Right Column (Content or Mobile Accordion) */}
        <div className="flex flex-col gap-4">
          {filteredSections.length === 0 ? (
            <div className="rounded-xl p-8 text-center bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] flex flex-col items-center gap-3">
              <Search className="size-8 text-[var(--color-text-tertiary)]" />
              <div>
                <p className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Aucun résultat trouvé</p>
                <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
                  Aucun guide ne correspond à ta recherche « {searchQuery} » avec le filtre de profil actuel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setFilter('tous'); }}
                className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                style={{ color: COLORS.TEXT_PRIMARY }}
              >
                Réinitialiser la recherche et les filtres
              </button>
            </div>
          ) : (
            <>
              <AideDesktopPane
                activeSection={activeSection}
                isRead={readSectionsSet.has(activeSection?.key ?? '')}
                onToggleRead={() => activeSection && toggleRead(activeSection.key)}
                nextSection={nextSection}
                onNextSectionClick={() => nextSection && setActiveSectionKey(nextSection.key)}
              />

              <AideMobileAccordion
                filteredSections={filteredSections}
                mobileExpandedKey={mobileExpandedKey}
                setMobileExpandedKey={setMobileExpandedKey}
                readSections={readSectionsSet}
                onToggleRead={toggleRead}
              />
            </>
          )}
        </div>

      </div>
    </div>
  )
}
