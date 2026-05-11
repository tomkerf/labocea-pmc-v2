import { useState } from 'react'
import { Clock, FileText, Gauge, Wrench, Package, Plus, StickyNote, Trash2 } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Equipement, Verification, Maintenance, FicheDeVieNote } from '@/types'

type TimelineEntry =
  | { kind: 'acquisition'; date: string }
  | { kind: 'verification'; date: string; data: Verification }
  | { kind: 'maintenance';  date: string; data: Maintenance }
  | { kind: 'note';         date: string; data: FicheDeVieNote }

const VERIF_TYPE: Record<string, string> = {
  etalonnage_interne: 'Étalonnage interne',
  verification_externe: 'Vérification externe',
  controle_terrain: 'Contrôle terrain',
}
const MAINT_TYPE: Record<string, string> = {
  preventive: 'Maintenance préventive',
  corrective: 'Maintenance corrective',
  panne: 'Panne',
}

function exportFicheDeViePDF(equipement: Equipement, entries: TimelineEntry[]) {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const rows = entries.map((e) => {
    if (e.kind === 'acquisition') {
      return `<tr><td>${fmt(e.date)}</td><td>Acquisition</td><td>—</td><td>—</td><td>—</td></tr>`
    }
    if (e.kind === 'verification') {
      const v = e.data
      const resultat = v.resultat === 'conforme' ? '✓ Conforme' : v.resultat === 'non_conforme' ? '✗ Non conforme' : '↻ À reprendre'
      return `<tr><td>${fmt(v.date)}</td><td>Métrologie</td><td>${VERIF_TYPE[v.type] ?? v.type}</td><td>${resultat}</td><td>${[v.technicienNom, v.remarques].filter(Boolean).join(' · ')}</td></tr>`
    }
    if (e.kind === 'maintenance') {
      const m = e.data
      return `<tr><td>${fmt(m.dateRealisee || m.datePrevue)}</td><td>Maintenance</td><td>${MAINT_TYPE[m.type] ?? m.type}</td><td>${m.statut}</td><td>${[m.technicienNom, m.travauxRealises || m.description].filter(Boolean).join(' · ')}</td></tr>`
    }
    const n = e.data
    return `<tr><td>${fmt(n.date)}</td><td>Note</td><td>${n.titre}</td><td>—</td><td>${[n.auteur, n.notes].filter(Boolean).join(' · ')}</td></tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Fiche de vie — ${equipement.nom}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 13px; color: #1D1D1F; margin: 40px; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .meta { color: #6E6E73; font-size: 13px; margin-bottom: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #F5F5F7; border-radius: 10px; padding: 16px; margin-bottom: 28px; font-size: 12px; }
  .info-grid dt { color: #6E6E73; }
  .info-grid dd { font-weight: 500; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 10px; background: #F5F5F7; font-weight: 600; color: #6E6E73; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; border-bottom: 1px solid #D2D2D7; }
  td { padding: 10px 10px; border-bottom: 1px solid #E5E5EA; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 32px; font-size: 11px; color: #AEAEB2; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${equipement.nom || 'Équipement'}</h1>
<div class="meta">${[equipement.marque, equipement.modele].filter(Boolean).join(' ')} — N° série : ${equipement.numSerie || '—'}</div>
<dl class="info-grid">
  <dt>Catégorie</dt><dd>${equipement.categorie}</dd>
  <dt>État</dt><dd>${equipement.etat}</dd>
  <dt>Localisation</dt><dd>${equipement.localisation}</dd>
  <dt>Date acquisition</dt><dd>${equipement.dateAcquisition ? fmt(equipement.dateAcquisition) : '—'}</dd>
  <dt>Prochain étalonnage</dt><dd>${equipement.prochainEtalonnage ? fmt(equipement.prochainEtalonnage) : '—'}</dd>
  <dt>Notes</dt><dd>${equipement.notes || '—'}</dd>
</dl>
<table>
  <thead><tr><th>Date</th><th>Catégorie</th><th>Type / Titre</th><th>Résultat</th><th>Détails</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" style="color:#AEAEB2;text-align:center">Aucun événement</td></tr>'}</tbody>
</table>
<div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR')} · Labocea PMC</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

function TimelineRow({ icon, iconBg, iconColor, date, title, subtitle, badge, isLast, onDelete }: {
  icon: React.ReactNode
  iconBg: string; iconColor: string
  date: string
  title: string
  subtitle?: string
  badge: { label: string; bg: string; color: string } | null
  isLast: boolean
  onDelete?: () => void
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 group"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{date}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
        {badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: 'var(--color-danger)' }}
            title="Supprimer cette note"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export function FicheDeVie({ equipement, verifications, maintenances, onAddNote, onDeleteNote, onAddVerification, initiales, uid, equipementId, equipementNom }: {
  equipement: Equipement
  verifications: Verification[]
  maintenances: Maintenance[]
  onAddNote: (note: FicheDeVieNote) => void
  onDeleteNote: (id: string) => void
  onAddVerification: (v: Verification) => Promise<void>
  initiales: string
  uid: string
  equipementId: string
  equipementNom: string
}) {
  const [showForm,  setShowForm]  = useState(false)
  const [showVerif, setShowVerif] = useState(false)
  const [formDate,  setFormDate]  = useState(() => new Date().toISOString().slice(0, 10))
  const [formTitre, setFormTitre] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [verifDate,      setVerifDate]      = useState(() => new Date().toISOString().slice(0, 10))
  const [verifType,      setVerifType]      = useState<'etalonnage_interne'|'verification_externe'|'controle_terrain'>('etalonnage_interne')
  const [verifResultat,  setVerifResultat]  = useState<'conforme'|'non_conforme'|'a_reprendre'>('conforme')
  const [verifRemarques, setVerifRemarques] = useState('')
  const [verifProchain,  setVerifProchain]  = useState('')
  const [verifSaving,    setVerifSaving]    = useState(false)

  function handleAddNote() {
    if (!formTitre.trim()) return
    const note: FicheDeVieNote = {
      id: crypto.randomUUID(),
      date: formDate,
      titre: formTitre.trim(),
      notes: formNotes.trim(),
      auteur: initiales,
    }
    onAddNote(note)
    setFormTitre(''); setFormNotes(''); setShowForm(false)
  }

  async function handleAddVerification() {
    if (!verifDate || verifSaving) return
    setVerifSaving(true)
    const verif: Verification = {
      id: crypto.randomUUID(),
      equipementId,
      equipementNom,
      type: verifType,
      date: verifDate,
      resultat: verifResultat,
      remarques: verifRemarques.trim(),
      prochainControle: verifProchain,
      technicienUid: uid,
      technicienNom: initiales,
      documentUrl: '',
      createdAt: Timestamp.now(),
    }
    await onAddVerification(verif)
    setVerifRemarques(''); setVerifProchain(''); setShowVerif(false)
    setVerifSaving(false)
  }

  const anciennete = (() => {
    if (!equipement.dateAcquisition) return null
    const ms = Date.now() - new Date(equipement.dateAcquisition).getTime()
    const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
    const years  = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    if (years === 0) return `${months} mois`
    if (months === 0) return `${years} an${years > 1 ? 's' : ''}`
    return `${years} an${years > 1 ? 's' : ''} ${months} mois`
  })()

  const entries: TimelineEntry[] = [
    ...(equipement.dateAcquisition
      ? [{ kind: 'acquisition' as const, date: equipement.dateAcquisition }]
      : []),
    ...verifications.map((v) => ({ kind: 'verification' as const, date: v.date, data: v })),
    ...maintenances
      .filter((m) => m.dateRealisee || m.datePrevue)
      .map((m) => ({ kind: 'maintenance' as const, date: (m.dateRealisee || m.datePrevue) as string, data: m })),
    ...(equipement.ficheDeVieNotes ?? []).map((n) => ({ kind: 'note' as const, date: n.date, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Fiche de vie
          </h2>
          {anciennete && (
            <span className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}>
              <Clock size={11} />
              {anciennete}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFicheDeViePDF(equipement, entries)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
          >
            <FileText size={12} /> Exporter PDF
          </button>
          <button
            onClick={() => { setShowVerif(v => !v); setShowForm(false) }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: showVerif ? 'var(--color-success-light)' : 'var(--color-bg-tertiary)', color: showVerif ? 'var(--color-success)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
          >
            <Gauge size={12} /> Vérification
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setShowVerif(false) }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: showForm ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)', color: showForm ? 'var(--color-accent)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
          >
            <Plus size={12} /> Note
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl p-4 mb-3"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-accent)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>Nouvelle note</p>
          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Titre</label>
              <input value={formTitre} onChange={(e) => setFormTitre(e.target.value)}
                placeholder="Ex : Inspection terrain, Réglage, Nettoyage…" className="field-input w-full" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="field-input" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Détails (optionnel)</label>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
              placeholder="Observations, actions effectuées…" className="field-input w-full resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              Annuler
            </button>
            <button onClick={handleAddNote} disabled={!formTitre.trim()} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-accent)', color: 'white', opacity: formTitre.trim() ? 1 : 0.5 }}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {showVerif && (
        <div className="rounded-xl p-4 mb-3"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-success)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-success)' }}>Nouvelle vérification</p>
          <div className="flex gap-3 mb-2 flex-wrap">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
              <select value={verifType} onChange={e => setVerifType(e.target.value as typeof verifType)} className="field-input">
                <option value="etalonnage_interne">Étalonnage interne</option>
                <option value="verification_externe">Vérification externe</option>
                <option value="controle_terrain">Contrôle terrain</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
              <input type="date" value={verifDate} onChange={e => setVerifDate(e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Résultat</label>
              <select value={verifResultat} onChange={e => setVerifResultat(e.target.value as typeof verifResultat)} className="field-input">
                <option value="conforme">Conforme</option>
                <option value="non_conforme">Non conforme</option>
                <option value="a_reprendre">À reprendre</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Prochain contrôle</label>
              <input type="date" value={verifProchain} onChange={e => setVerifProchain(e.target.value)} className="field-input" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Remarques (optionnel)</label>
            <textarea value={verifRemarques} onChange={e => setVerifRemarques(e.target.value)} rows={2}
              placeholder="Observations, dérives constatées…" className="field-input w-full resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowVerif(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              Annuler
            </button>
            <button onClick={handleAddVerification} disabled={!verifDate || verifSaving} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-success)', color: 'white', opacity: !verifDate || verifSaving ? 0.5 : 1 }}>
              {verifSaving ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-xl px-5 py-6 text-sm text-center"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-tertiary)' }}>
          Aucun événement enregistré. Ajoutez une note ou saisissez une vérification métrologique.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1
            const dateLabel = new Date(entry.date + 'T12:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            })

            if (entry.kind === 'acquisition') {
              return (
                <TimelineRow key="acquisition" isLast={isLast}
                  icon={<Package size={14} />}
                  iconBg="var(--color-bg-tertiary)" iconColor="var(--color-text-secondary)"
                  date={dateLabel} title="Acquisition de l'équipement" badge={null}
                />
              )
            }

            if (entry.kind === 'verification') {
              const v = entry.data
              const isOk = v.resultat === 'conforme'
              const isNok = v.resultat === 'non_conforme'
              return (
                <TimelineRow key={v.id} isLast={isLast}
                  icon={<Gauge size={14} />}
                  iconBg={isOk ? 'var(--color-success-light)' : isNok ? 'var(--color-danger-light)' : 'var(--color-warning-light)'}
                  iconColor={isOk ? 'var(--color-success)' : isNok ? 'var(--color-danger)' : 'var(--color-warning)'}
                  date={dateLabel}
                  title={VERIF_TYPE[v.type] ?? v.type}
                  subtitle={[v.technicienNom, v.remarques].filter(Boolean).join(' · ')}
                  badge={
                    isOk  ? { label: 'Conforme',     bg: 'var(--color-success-light)', color: 'var(--color-success)' } :
                    isNok ? { label: 'Non conforme',  bg: 'var(--color-danger-light)',  color: 'var(--color-danger)'  } :
                            { label: 'À reprendre',   bg: 'var(--color-warning-light)', color: 'var(--color-warning)' }
                  }
                />
              )
            }

            if (entry.kind === 'note') {
              const n = entry.data
              return (
                <TimelineRow key={n.id} isLast={isLast}
                  icon={<StickyNote size={14} />}
                  iconBg="var(--color-accent-light)" iconColor="var(--color-accent)"
                  date={dateLabel}
                  title={n.titre}
                  subtitle={[n.auteur, n.notes].filter(Boolean).join(' · ')}
                  badge={null}
                  onDelete={() => onDeleteNote(n.id)}
                />
              )
            }

            const m = entry.data
            const isDone = m.statut === 'realisee'
            return (
              <TimelineRow key={m.id} isLast={isLast}
                icon={<Wrench size={14} />}
                iconBg={isDone ? 'var(--color-bg-tertiary)' : 'var(--color-warning-light)'}
                iconColor={isDone ? 'var(--color-text-secondary)' : 'var(--color-warning)'}
                date={dateLabel}
                title={MAINT_TYPE[m.type] ?? m.type}
                subtitle={[m.technicienNom, m.travauxRealises || m.description].filter(Boolean).join(' · ')}
                badge={
                  isDone
                    ? { label: 'Réalisée',  bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' }
                    : { label: 'Planifiée', bg: 'var(--color-warning-light)', color: 'var(--color-warning)'        }
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
