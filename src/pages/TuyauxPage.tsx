import { useState, useMemo } from 'react'
import { Plus, Printer, Pencil, Trash2, FlaskConical } from 'lucide-react'
import { useTuyauxListener, saveTuyau, deleteTuyau } from '@/hooks/useTuyaux'
import { useTuyauxStore } from '@/stores/tuyauxStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import type { Tuyau, MateriauTuyau } from '@/types'

// ── Constantes ──────────────────────────────────────────────

const MATERIAUX: MateriauTuyau[] = ['VINYL (tricoclair)', 'TEFLON', 'SILICONE', 'INOX', 'POLYÉTHYLÈNE', 'AUTRE']

const MAT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'VINYL (tricoclair)': { bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.25)', text: '#be185d' },
  'TEFLON':            { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  text: '#c2410c' },
  'SILICONE':          { bg: 'rgba(14,165,233,0.08)',  border: 'rgba(14,165,233,0.25)',  text: '#0369a1' },
  'INOX':              { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)',  text: '#4338ca' },
  'POLYÉTHYLÈNE':      { bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.25)',   text: '#15803d' },
  'AUTRE':             { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.22)', text: '#374151' },
}

function matColor(m: string) {
  return MAT_COLORS[m] ?? MAT_COLORS['AUTRE']
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const [y, mo, d] = iso.split('-')
  return `${d}/${mo}/${y?.slice(2)}`
}

// ── Impression étiquette 85×55mm ─────────────────────────────

function printLabel(tuyau: Tuyau) {
  const mc = matColor(tuyau.materiau)
  const ds = fmtDate(tuyau.dateCreation)
  const rows: [string, string][] = [
    tuyau.materiau    ? ['Matériau', tuyau.materiau]    : null,
    tuyau.objet       ? ['Objet',    tuyau.objet]       : null,
    tuyau.materiel    ? ['Matériel', tuyau.materiel]    : null,
    ds                ? ['Créé le',  ds]                : null,
    tuyau.fournisseur ? ['Fourn.',   tuyau.fournisseur] : null,
    tuyau.marque      ? ['Marque',   tuyau.marque]      : null,
    tuyau.numSerie    ? ['N° série', tuyau.numSerie]    : null,
    tuyau.type        ? ['Type',     tuyau.type]        : null,
    tuyau.notes       ? ['Notes',    tuyau.notes]       : null,
  ].filter(Boolean) as [string, string][]

  const rowsHtml = rows.map(([l, v]) =>
    `<tr><td class="lbl">${l}</td><td class="val">${v}</td></tr>`,
  ).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Étiquette — ${tuyau.refLabo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:85mm 55mm;margin:0}
body{width:85mm;height:55mm;font-family:Arial,sans-serif;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.top{background:${mc.text};padding:5px 8px 4px;display:flex;align-items:center;justify-content:space-between}
.ref{font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1}
.badge{font-size:8px;font-weight:700;color:${mc.text};background:#fff;border-radius:10px;padding:2px 7px;text-transform:uppercase;letter-spacing:.04em}
.body{flex:1;padding:4px 8px;display:flex;flex-direction:column;justify-content:space-between}
table{width:100%;border-collapse:collapse}
td{font-size:8.5px;padding:1.5px 0;vertical-align:top;line-height:1.3}
.lbl{color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.04em;width:44px;padding-right:4px}
.val{color:#111;font-weight:500}
.footer{font-size:7px;color:#bbb;text-align:right;padding:0 8px 3px;letter-spacing:.03em}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="top"><span class="ref">${tuyau.refLabo}</span><span class="badge">${tuyau.annee || ''}</span></div>
<div class="body"><table>${rowsHtml}</table></div>
<div class="footer">Labocea · Tuyaux de prélèvement</div>
<script>window.onload=()=>{window.focus();window.print()}<\/script>
</body></html>`

  const w = window.open('', '_blank', 'width=340,height=240')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

// ── Formulaire tuyau ─────────────────────────────────────────

interface TuyauFormProps {
  tuyau?: Partial<Tuyau>
  onSave: (t: Omit<Tuyau, 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
}

function TuyauForm({ tuyau = {}, onSave, onClose }: TuyauFormProps) {
  const [refLabo,      setRefLabo]      = useState(tuyau.refLabo      ?? '')
  const [materiau,     setMateriau]     = useState<MateriauTuyau>(tuyau.materiau ?? 'TEFLON')
  const [objet,        setObjet]        = useState(tuyau.objet        ?? '')
  const [materiel,     setMateriel]     = useState(tuyau.materiel     ?? '')
  const [dateCreation, setDateCreation] = useState(tuyau.dateCreation ?? '')
  const [marque,       setMarque]       = useState(tuyau.marque       ?? '')
  const [numSerie,     setNumSerie]     = useState(tuyau.numSerie     ?? '')
  const [type,         setType]         = useState(tuyau.type         ?? '')
  const [fournisseur,  setFournisseur]  = useState(tuyau.fournisseur  ?? 'SEFI Quimper')
  const [notes,        setNotes]        = useState(tuyau.notes        ?? '')

  const canSave = refLabo.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const ref = refLabo.trim().toUpperCase()
    const yr = parseInt('20' + ref.slice(1, 3))
    const annee = isNaN(yr) || yr < 2020 || yr > 2040 ? new Date().getFullYear() : yr
    onSave({
      id: tuyau.id ?? crypto.randomUUID(),
      refLabo: ref, materiau, annee, objet: objet.trim(),
      materiel: materiel.trim(), dateCreation,
      marque: marque.trim(), numSerie: numSerie.trim(),
      type: type.trim(), fournisseur: fournisseur.trim(),
      notes: notes.trim(), createdBy: tuyau.createdBy ?? '',
    })
  }

  const fieldCls = 'w-full px-3 py-2 rounded-lg text-sm field-input'
  const fieldBox = 'rounded-lg px-3 py-2 text-sm'
  const fieldStyle = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    width: '100%',
  } as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl overflow-y-auto max-h-[90vh]"
        style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {tuyau.id ? 'Modifier le tuyau' : 'Nouveau tuyau'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Ligne 1 : Réf + Matériau + Objet */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Réf Labo <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input value={refLabo} onChange={e => setRefLabo(e.target.value.toUpperCase())}
                placeholder="Q25TFE1" className={`${fieldCls} font-bold tracking-widest`}
                style={fieldStyle} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Matériau</label>
              <select value={materiau} onChange={e => setMateriau(e.target.value as MateriauTuyau)}
                className={fieldBox} style={fieldStyle}>
                {MATERIAUX.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Objet</label>
              <input value={objet} onChange={e => setObjet(e.target.value)}
                placeholder="RSDE DZ, SRA…" className={fieldCls} style={fieldStyle} />
            </div>
          </div>

          {/* Ligne 2 : Code matériel + Date création */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Code matériel</label>
              <input value={materiel} onChange={e => setMateriel(e.target.value)}
                placeholder="PLV07 / FLC22" className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date création</label>
              <input type="date" value={dateCreation} onChange={e => setDateCreation(e.target.value)}
                className={fieldCls} style={fieldStyle} />
            </div>
          </div>

          {/* Ligne 3 : Marque + N° série + Type */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Marque</label>
              <input value={marque} onChange={e => setMarque(e.target.value)} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>N° de série</label>
              <input value={numSerie} onChange={e => setNumSerie(e.target.value)} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
              <input value={type} onChange={e => setType(e.target.value)} className={fieldCls} style={fieldStyle} />
            </div>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Fournisseur</label>
            <input value={fournisseur} onChange={e => setFournisseur(e.target.value)}
              placeholder="SEFI Quimper" className={fieldCls} style={fieldStyle} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Observations, lot de campagne…"
              className={`${fieldCls} resize-y`} style={fieldStyle} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={!canSave}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: canSave ? 'var(--color-accent)' : 'var(--color-bg-tertiary)', color: canSave ? 'white' : 'var(--color-text-tertiary)', cursor: canSave ? 'pointer' : 'not-allowed' }}>
              {tuyau.id ? 'Enregistrer' : 'Créer le tuyau'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────

export default function TuyauxPage() {
  useTuyauxListener()
  const { tuyaux, loading } = useTuyauxStore()
  const uid = useAuthStore(selectUid)

  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterMat,  setFilterMat]  = useState<string>('all')
  const [editing,    setEditing]    = useState<Partial<Tuyau> | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const allYears = useMemo(() => {
    const s = new Set<number>()
    tuyaux.forEach(t => { if (t.annee) s.add(t.annee) })
    return [...s].sort((a, b) => b - a)
  }, [tuyaux])

  const allMats = useMemo(() => {
    const s = new Set<string>()
    tuyaux.forEach(t => s.add(t.materiau || 'AUTRE'))
    return [...s].sort()
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

  const chipStyle = (active: boolean, color?: string) => ({
    display: 'inline-flex', alignItems: 'center', padding: '5px 12px',
    borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', border: `1.5px solid ${active ? (color ?? 'var(--color-accent)') : 'var(--color-border)'}`,
    background: active ? (color ?? 'var(--color-accent)') : 'transparent',
    color: active ? 'white' : 'var(--color-text-secondary)',
    whiteSpace: 'nowrap' as const,
    transition: 'all .15s',
  })

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl">
      {/* En-tête + stats */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <FlaskConical size={20} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} />
            Tuyaux de prélèvement
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {tuyaux.length} lot{tuyaux.length !== 1 ? 's' : ''} · {allMats.length} matériau{allMats.length !== 1 ? 'x' : ''} · {allYears.length} campagne{allYears.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setEditing({})}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: 'white' }}>
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
              <button style={chipStyle(filterYear === 'all')} onClick={() => setFilterYear('all')}>Toutes</button>
              {allYears.map(y => (
                <button key={y} style={chipStyle(filterYear === String(y))} onClick={() => setFilterYear(String(y))}>
                  {y}
                </button>
              ))}
            </div>
          )}
          {allMats.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider shrink-0 w-16"
                style={{ color: 'var(--color-text-tertiary)' }}>Matériau</span>
              <button style={chipStyle(filterMat === 'all')} onClick={() => setFilterMat('all')}>Tous</button>
              {allMats.map(m => {
                const mc = matColor(m)
                return (
                  <button key={m}
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
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
          <div className="text-5xl mb-4">🧪</div>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Aucun tuyau enregistré</p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Ajoutez un lot de tubes pour gérer vos tuyaux de prélèvement.
          </p>
          <button onClick={() => setEditing({})}
            className="px-5 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'white' }}>
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
            {/* Header matériau */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: mc.text }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{mat}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}>
                {items.length} lot{items.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Grille des cartes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(t => {
                const ds = fmtDate(t.dateCreation)
                return (
                  <div key={t.id} className="rounded-xl overflow-hidden flex flex-col"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                    {/* Header carte */}
                    <div className="px-4 pt-4 pb-3 relative" style={{ background: mc.bg, borderBottom: `1px solid ${mc.border}` }}>
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ background: mc.text }} />
                      <div className="flex items-start justify-between gap-2 pl-2">
                        <div>
                          <p className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            {t.refLabo || '—'}
                          </p>
                          {t.objet && (
                            <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.objet}</p>
                          )}
                        </div>
                        {t.annee && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: mc.border, color: mc.text }}>
                            {t.annee}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Corps */}
                    <div className="px-4 py-3 flex flex-col gap-1.5 flex-1">
                      {t.materiel && <Row label="Matériel" value={t.materiel} mono />}
                      {ds         && <Row label="Créé"     value={ds} />}
                      {t.fournisseur && <Row label="Fourn."  value={t.fournisseur} />}
                      {(t.marque || t.numSerie || t.type) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.marque   && <Tag>{t.marque}</Tag>}
                          {t.numSerie && <Tag>S/N {t.numSerie}</Tag>}
                          {t.type     && <Tag>{t.type}</Tag>}
                        </div>
                      )}
                      {t.notes && (
                        <p className="text-xs italic mt-1 pt-2" style={{ color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
                          {t.notes}
                        </p>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-2 px-4 py-2.5"
                      style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
                      <button onClick={() => setEditing(t)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        <Pencil size={12} /> Modifier
                      </button>
                      <button onClick={() => printLabel(t)} title="Imprimer étiquette"
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        <Printer size={12} /> Étiquette
                      </button>
                      <button onClick={() => setConfirmDel(t.id)}
                        className="flex items-center justify-center px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Confirmation suppression inline */}
                    {confirmDel === t.id && (
                      <div className="px-4 py-3 flex items-center gap-3"
                        style={{ background: 'var(--color-danger-light)', borderTop: '1px solid var(--color-danger)' }}>
                        <p className="text-xs flex-1 font-medium" style={{ color: 'var(--color-danger)' }}>
                          Supprimer {t.refLabo} ?
                        </p>
                        <button onClick={() => handleDelete(t.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--color-danger)', color: 'white' }}>
                          Supprimer
                        </button>
                        <button onClick={() => setConfirmDel(null)}
                          className="px-3 py-1 rounded-lg text-xs"
                          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
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

      {/* Modale formulaire */}
      {editing !== null && (
        <TuyauForm tuyau={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

// ── Micro-composants ─────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0 w-14"
        style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg-tertiary)', padding: '1px 6px', borderRadius: 4 }}>
        {value}
      </span>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
      {children}
    </span>
  )
}
