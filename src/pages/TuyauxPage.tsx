import { useState, useMemo } from 'react'
import { Plus, Printer, Pencil, Trash2, FlaskConical } from 'lucide-react'
import { useTuyauxListener, saveTuyau, deleteTuyau } from '@/hooks/useTuyaux'
import { useTuyauxStore } from '@/stores/tuyauxStore'
import { useAuthStore, selectUid, selectRole } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { matColor, fmtDate, printLabel } from '@/lib/tuyauxUtils'
import TuyauForm, { Row, Tag } from '@/components/tuyaux/TuyauForm'
import type { Tuyau } from '@/types'
import { COLORS } from '@/lib/constants'


const chipStyle = (active: boolean, color?: string) => ({
  display: 'inline-flex', alignItems: 'center', padding: '5px 12px',
  borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
  cursor: 'pointer', border: `1.5px solid ${active ? (color ?? COLORS.ACCENT) : COLORS.BORDER}`,
  background: active ? (color ?? COLORS.ACCENT) : 'transparent',
  color: active ? 'white' : COLORS.TEXT_SECONDARY,
  whiteSpace: 'nowrap' as const,
  transition: 'all .15s',
})

export default function TuyauxPage() {
  useTuyauxListener()
  const { tuyaux, loading } = useTuyauxStore()
  const uid  = useAuthStore(selectUid)
  const role = useAuthStore(selectRole)

  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterMat,  setFilterMat]  = useState<string>('all')
  const [editing,    setEditing]    = useState<Partial<Tuyau> | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const allYears = useMemo(() => {
    const s = new Set<number>()
    tuyaux.forEach(t => { if (t.annee) s.add(t.annee) })
    return [...s].toSorted((a, b) => b - a)
  }, [tuyaux])

  const allMats = useMemo(() => {
    const s = new Set<string>()
    tuyaux.forEach(t => s.add(t.materiau || 'AUTRE'))
    return [...s].toSorted()
  }, [tuyaux])

  const filtered = useMemo(() => tuyaux.filter(t => {
    if (filterYear !== 'all' && String(t.annee) !== filterYear) return false
    if (filterMat !== 'all' && t.materiau !== filterMat) return false
    return true
  }), [tuyaux, filterYear, filterMat])

  const grouped = useMemo(() => {
    const g: Record<string, Tuyau[]> = {}
    filtered.forEach(t => {
      const m = t.materiau || 'AUTRE'
      if (!g[m]) g[m] = []
      g[m].push(t)
    })
    Object.values(g).forEach(arr =>
      arr.sort((a, b) => (b.annee - a.annee) || a.refLabo.localeCompare(b.refLabo))
    )
    return g
  }, [filtered])

  async function handleSave(data: Omit<Tuyau, 'createdAt' | 'updatedAt'>) {
    if (!uid) return
    try {
      await saveTuyau(data as Tuyau, uid)
      setEditing(null)
      toast.success('Tuyau enregistré')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTuyau(id)
      setConfirmDel(null)
      toast.success('Tuyau supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }


  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="size-6 rounded-full border-2 animate-spin"
        style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl">
      {/* En-tête + stats */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: COLORS.TEXT_PRIMARY }}>
            <FlaskConical size={20} strokeWidth={1.8} style={{ color: COLORS.ACCENT }} />
            Tuyaux de prélèvement
          </h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {tuyaux.length} lot{tuyaux.length !== 1 ? 's' : ''} · {allMats.length} matériau{allMats.length !== 1 ? 'x' : ''} · {allYears.length} campagne{allYears.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" onClick={() => setEditing({})}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
          style={{ background: COLORS.ACCENT, color: 'white', borderRadius: 'var(--radius-sm)' }}>
          <Plus size={15} /> Nouveau tuyau
        </button>
      </div>

      {/* Filtres */}
      {tuyaux.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {allYears.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider shrink-0 w-16"
                style={{ color: 'var(--color-text-tertiary)' }}>Année</span>
              <button type="button" style={chipStyle(filterYear === 'all')} onClick={() => setFilterYear('all')}>Toutes</button>
              {allYears.map(y => (
                <button type="button" key={y} style={chipStyle(filterYear === String(y))} onClick={() => setFilterYear(String(y))}>
                  {y}
                </button>
              ))}
            </div>
          )}
          {allMats.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider shrink-0 w-16"
                style={{ color: 'var(--color-text-tertiary)' }}>Matériau</span>
              <button type="button" style={chipStyle(filterMat === 'all')} onClick={() => setFilterMat('all')}>Tous</button>
              {allMats.map(m => {
                const mc = matColor(m)
                return (
                  <button type="button" key={m}
                    style={filterMat === m ? chipStyle(true, mc.text) : { ...chipStyle(false), borderColor: mc.border, color: mc.text }}
                    onClick={() => setFilterMat(filterMat === m ? 'all' : m)}>
                    {m}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* État vide */}
      {tuyaux.length === 0 && (
        <div className="text-center py-20 rounded-2xl"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          <div className="text-5xl mb-4">🧪</div>
          <p className="text-base font-semibold mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>Aucun tuyau enregistré</p>
          <p className="text-sm mb-6" style={{ color: COLORS.TEXT_SECONDARY }}>
            Ajoutez un lot de tubes pour gérer vos tuyaux de prélèvement.
          </p>
          <button type="button" onClick={() => setEditing({})}
            className="px-5 py-2 text-sm font-medium"
            style={{ background: COLORS.ACCENT, color: 'white', borderRadius: 'var(--radius-sm)' }}>
            + Ajouter un premier tuyau
          </button>
        </div>
      )}

      {/* Grille groupée par matériau */}
      {Object.keys(grouped).sort().map(mat => {
        const items = grouped[mat]
        const mc = matColor(mat)
        return (
          <div key={mat} className="mb-8">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-2.5 rounded-sm shrink-0" style={{ background: mc.text }} />
              <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{mat}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}>
                {items.length} lot{items.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(t => {
                const ds = fmtDate(t.dateCreation)
                return (
                  <div key={t.id} className="flex flex-col"
                    style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>

                    <div className="px-4 pt-4 pb-3"
                      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-bold tracking-tight truncate"
                            style={{ color: COLORS.TEXT_PRIMARY }}>
                            {t.refLabo || '—'}
                          </p>
                          {t.objet && (
                            <p className="text-xs mt-0.5 truncate"
                              style={{ color: COLORS.TEXT_SECONDARY }}>
                              {t.objet}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {t.annee && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
                              {t.annee}
                            </span>
                          )}
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}>
                            {mat}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-1.5 flex-1">
                      {t.materiel    && <Row label="Matériel" value={t.materiel} mono />}
                      {ds            && <Row label="Créé"     value={ds} />}
                      {t.fournisseur && <Row label="Fourn."   value={t.fournisseur} />}
                      {(t.marque || t.numSerie || t.type) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.marque   && <Tag>{t.marque}</Tag>}
                          {t.numSerie && <Tag>S/N {t.numSerie}</Tag>}
                          {t.type     && <Tag>{t.type}</Tag>}
                        </div>
                      )}
                      {t.notes && (
                        <p className="text-xs italic mt-1 pt-2"
                          style={{ color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
                          {t.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 px-4 py-2.5"
                      style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                      <button type="button" onClick={() => setEditing(t)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium"
                        style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_SECONDARY, borderRadius: 'var(--radius-sm)' }}>
                        <Pencil size={12} /> Modifier
                      </button>
                      <button type="button" onClick={() => printLabel(t)} title="Imprimer étiquette"
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                        style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_SECONDARY, borderRadius: 'var(--radius-sm)' }}>
                        <Printer size={12} /> Étiquette
                      </button>
                      {role === 'admin' && (
                        <button type="button" onClick={() => setConfirmDel(t.id)}
                          className="flex items-center justify-center px-2.5 py-1.5"
                          style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {confirmDel === t.id && (
                      <div className="px-4 py-3 flex items-center gap-3"
                        style={{ background: 'var(--color-danger-light)', borderTop: '1px solid var(--color-danger)' }}>
                        <p className="text-xs flex-1 font-medium" style={{ color: COLORS.DANGER }}>
                          Supprimer {t.refLabo} ?
                        </p>
                        <button type="button" onClick={() => handleDelete(t.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: COLORS.DANGER, color: 'white' }}>
                          Supprimer
                        </button>
                        <button type="button" onClick={() => setConfirmDel(null)}
                          className="px-3 py-1 rounded-lg text-xs"
                          style={{ background: COLORS.BG_SECONDARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {editing !== null && (
        <TuyauForm tuyau={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
