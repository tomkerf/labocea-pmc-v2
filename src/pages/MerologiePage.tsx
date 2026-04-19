import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useVerificationsListener, createVerification } from '@/hooks/useVerifications'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useAuthStore } from '@/stores/authStore'
import type { Verification, Equipement } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  etalonnage_interne: 'Étalonnage interne',
  verification_externe: 'Vérification externe',
  controle_terrain: 'Contrôle terrain',
}

const RESULTAT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  conforme:      { label: 'Conforme',      bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  non_conforme:  { label: 'Non conforme',  bg: 'var(--color-danger-light)',  color: 'var(--color-danger)'  },
  a_reprendre:   { label: 'À reprendre',   bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
}

/** Statut calculé selon la date du prochain contrôle */
function calcStatut(prochainDate: string): { key: string; label: string; bg: string; color: string } {
  if (!prochainDate) return { key: 'none', label: 'Non planifié', bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }
  const now = Date.now()
  const next = new Date(prochainDate).getTime()
  const diff = next - now
  const days30 = 30 * 24 * 60 * 60 * 1000
  if (diff < 0)      return { key: 'late', label: 'En retard',   bg: 'var(--color-danger-light)',  color: 'var(--color-danger)'  }
  if (diff < days30) return { key: 'soon', label: 'À prévoir',   bg: 'var(--color-warning-light)', color: 'var(--color-warning)' }
  return                    { key: 'ok',   label: 'À jour',       bg: 'var(--color-success-light)', color: 'var(--color-success)' }
}

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'ok', label: 'À jour' },
  { value: 'soon', label: 'À prévoir' },
  { value: 'late', label: 'En retard' },
]

// Unified row type for the table
type MetroRow =
  | { kind: 'verification'; data: Verification }
  | { kind: 'equipement'; data: Equipement }

export default function MerologiePage() {
  useVerificationsListener()
  useEquipementsListener()
  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.uid())
  const prenom = useAuthStore((s) => s.prenom())
  const initiales = useAuthStore((s) => s.initiales())
  const { verifications, loading: loadingVerif } = useMetrologieStore()
  const { equipements, loading: loadingEq } = useEquipementsStore()
  const [filterStatut, setFilterStatut] = useState('')
  const [creating, setCreating] = useState(false)

  const loading = loadingVerif || loadingEq
  const technicienNom = [prenom, initiales].filter(Boolean).join(' ')

  // Equipment with prochainEtalonnage but no verification record
  const equipementsWithoutVerif = equipements.filter((eq: Equipement) => {
    if (!eq.prochainEtalonnage) return false
    return !verifications.some((v: Verification) => v.equipementId === eq.id)
  })

  // Build unified rows
  const allRows: MetroRow[] = [
    ...verifications.map((v): MetroRow => ({ kind: 'verification', data: v })),
    ...equipementsWithoutVerif.map((eq): MetroRow => ({ kind: 'equipement', data: eq })),
  ]

  // Sort: en retard first, then à prévoir, then à jour, then non planifié
  const statutOrder = { late: 0, soon: 1, ok: 2, none: 3 }
  allRows.sort((a, b) => {
    const dateA = a.kind === 'verification' ? a.data.prochainControle : a.data.prochainEtalonnage
    const dateB = b.kind === 'verification' ? b.data.prochainControle : b.data.prochainEtalonnage
    const keyA = calcStatut(dateA).key
    const keyB = calcStatut(dateB).key
    const orderDiff = (statutOrder[keyA as keyof typeof statutOrder] ?? 3) - (statutOrder[keyB as keyof typeof statutOrder] ?? 3)
    if (orderDiff !== 0) return orderDiff
    // Within same status: sort by date ascending
    if (!dateA) return 1
    if (!dateB) return -1
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })

  const filtered = allRows.filter((row) => {
    if (!filterStatut) return true
    const date = row.kind === 'verification' ? row.data.prochainControle : row.data.prochainEtalonnage
    const statut = calcStatut(date)
    return statut.key === filterStatut
  })

  async function handleCreate() {
    if (!uid || creating) return
    setCreating(true)
    try {
      const id = await createVerification(uid, technicienNom)
      navigate(`/metrologie/${id}`)
    } finally {
      setCreating(false)
    }
  }

  const lateCount = allRows.filter((r) => {
    const d = r.kind === 'verification' ? r.data.prochainControle : r.data.prochainEtalonnage
    return calcStatut(d).key === 'late'
  }).length

  return (
    <div className="p-6 max-w-2xl">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Métrologie</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {allRows.length} instrument{allRows.length !== 1 ? 's' : ''} suivis
            {lateCount > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                {lateCount} en retard
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg"
          style={{ background: 'var(--color-accent)', color: 'white', opacity: creating ? 0.6 : 1 }}
        >
          <Plus size={16} />
          Nouvelle vérification
        </button>
      </div>

      {/* Filtres statut */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button key={f.value}
            onClick={() => setFilterStatut(f.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: filterStatut === f.value ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
              color: filterStatut === f.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {allRows.length === 0
              ? 'Aucun instrument suivi — ajoutez un équipement ou une vérification.'
              : 'Aucun résultat pour ce filtre.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>

          {/* Header tableau */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5"
            style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
            {['Équipement', 'Type', 'Prochain contrôle', 'Statut'].map((h) => (
              <span key={h} className="text-xs font-semibold uppercase"
                style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {/* Lignes */}
          {filtered.map((row, i) => {
            if (row.kind === 'verification') {
              const v = row.data
              const statut = calcStatut(v.prochainControle)
              const resultatCfg = RESULTAT_CONFIG[v.resultat]
              return (
                <button key={v.id}
                  onClick={() => navigate(`/metrologie/${v.id}`)}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 text-left transition-colors"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {v.equipementNom || <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {v.date ? new Date(v.date).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <span className="text-xs self-center" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {TYPE_LABELS[v.type] ?? v.type}
                  </span>
                  <span className="text-xs self-center" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {v.prochainControle ? new Date(v.prochainControle).toLocaleDateString('fr-FR') : '—'}
                  </span>
                  <div className="flex flex-col gap-1 items-end self-center">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: statut.bg, color: statut.color, whiteSpace: 'nowrap' }}>
                      {statut.label}
                    </span>
                    {resultatCfg && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: resultatCfg.bg, color: resultatCfg.color, whiteSpace: 'nowrap' }}>
                        {resultatCfg.label}
                      </span>
                    )}
                  </div>
                </button>
              )
            }

            // Equipement row (no verification record)
            const eq = row.data
            const statut = calcStatut(eq.prochainEtalonnage)
            return (
              <button key={eq.id}
                onClick={() => navigate(`/materiel/${eq.id}`)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 text-left transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {eq.nom || <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {[eq.marque, eq.modele].filter(Boolean).join(' ') || 'Aucune vérification enregistrée'}
                  </p>
                </div>
                <span className="text-xs self-center" style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>—</span>
                <span className="text-xs self-center" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(eq.prochainEtalonnage).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex flex-col gap-1 items-end self-center">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: statut.bg, color: statut.color, whiteSpace: 'nowrap' }}>
                    {statut.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
