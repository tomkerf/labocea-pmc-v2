# Simplification UX Estimation volume — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'outil Estimation volume évident : un écran à deux onglets « Estimer » (épuré, par défaut) et « Données » (gestion + import), avec libellés clairs.

**Architecture:** Réorganisation UI pure de la page existante via un état local `view`. Aucun changement de logique, de données, de service ni de tests. On réutilise `estimateVolume`, `nearestBilans`, `EstimationChart`, `BilanImportModal`, `PointRejetManager`.

**Tech Stack:** React + TypeScript, Tailwind + tokens `COLORS`, composant `Stepper` réutilisé.

Spec : `docs/superpowers/specs/2026-06-29-estimation-volume-simplification-design.md`.

---

## File Structure

**Modifiés :**
- `src/components/estimation/PointRejetManager.tsx` — libellés visibles, textes d'aide, bouton « Importer un CSV » (callback `onImport`)
- `src/pages/EstimationVolumePage.tsx` — toggle `view` Estimer/Données, phrase d'explication, état vide, retrait de l'icône import du header, `PointRejetManager` déplacé sous l'onglet Données

Aucun autre fichier touché. Tests existants inchangés (logique non modifiée).

---

## Task 1: PointRejetManager — libellés clairs + bouton import

**Files:**
- Modify: `src/components/estimation/PointRejetManager.tsx`

- [ ] **Step 1: Remplacer le contenu du fichier**

Remplacer **tout** le contenu de `src/components/estimation/PointRejetManager.tsx` par :

```tsx
import { useReducer, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { createPointRejet, updatePointRejet, deletePointRejet } from '@/services/pointsRejetService'
import type { BilanRejet } from '@/types'

// double-confirmation suppression
type ConfirmState = { id: string | null }
type ConfirmAction = { type: 'arm'; id: string } | { type: 'reset' }
function confirmReducer(_s: ConfirmState, a: ConfirmAction): ConfirmState {
  return a.type === 'arm' ? { id: a.id } : { id: null }
}

const labelCls = 'text-[11px] mb-1 block'

export function PointRejetManager({ onImport }: { onImport: () => void }) {
  const uid = useAuthStore(selectUid)
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)
  const [confirm, dispatch] = useReducer(confirmReducer, { id: null })
  const [nom, setNom] = useState('')
  const [selId, setSelId] = useState<string>('')
  const [bilan, setBilan] = useState<BilanRejet>({ date: '', pluieMm: 0, volumeM3: 0 })

  async function addPoint() {
    if (!uid || !nom.trim()) return
    await createPointRejet(nom.trim(), '', uid)
    setNom('')
  }

  async function addBilan() {
    if (!uid || !selId || !bilan.date) return
    const point = pointsRejet.find((p) => p.id === selId)
    if (!point) return
    await updatePointRejet(selId, { bilans: [...point.bilans, bilan] }, uid)
    setBilan({ date: '', pluieMm: 0, volumeM3: 0 })
  }

  async function remove(id: string) {
    if (confirm.id !== id) { dispatch({ type: 'arm', id }); return }
    await deletePointRejet(id)
    dispatch({ type: 'reset' })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* import CSV */}
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Importer des bilans</h2>
        <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Le plus rapide : un fichier CSV au format <code>point,date,pluie_mm,volume_m3</code>.
        </p>
        <button type="button" onClick={onImport}
          className="self-start px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
          style={{ background: COLORS.ACCENT, color: 'white' }}>
          <Upload size={16} /> Importer un CSV
        </button>
      </div>

      {/* points de rejet */}
      <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Points de rejet</h2>

        {/* nouveau point */}
        <div>
          <label htmlFor="pr-nom" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Nouveau point de rejet</label>
          <div className="flex gap-2">
            <input id="pr-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. STEP Quimper - rejet principal"
              aria-label="Nom du point de rejet"
              className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
            <button type="button" onClick={addPoint} aria-label="Ajouter le point" className="px-3 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* liste points */}
        <div className="flex flex-col gap-1">
          {pointsRejet.length === 0 && <p className="text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>Aucun point pour l'instant.</p>}
          {pointsRejet.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
              <span>{p.nom} <span style={{ color: 'var(--color-text-tertiary)' }}>· {p.bilans.length} bilan(s)</span></span>
              <button type="button" onClick={() => remove(p.id)} aria-label={confirm.id === p.id ? 'Confirmer la suppression' : 'Supprimer le point'}
                className="px-2 py-1 rounded text-[12px] font-semibold"
                style={{ background: confirm.id === p.id ? COLORS.DANGER : 'transparent', color: confirm.id === p.id ? 'white' : COLORS.DANGER }}>
                {confirm.id === p.id ? 'Confirmer' : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ajouter un bilan */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Ajouter un bilan passé</h2>
        <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Un bilan = un épisode pluvieux passé : sa pluviométrie sur 24h et le volume réellement mesuré.
        </p>

        <div>
          <label htmlFor="pr-sel" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Point concerné</label>
          <select id="pr-sel" value={selId} onChange={(e) => setSelId(e.target.value)}
            aria-label="Point de rejet à enrichir"
            className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
            <option value="">Choisir un point…</option>
            {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label htmlFor="pr-date" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Date</label>
            <input id="pr-date" type="date" value={bilan.date} onChange={(e) => setBilan({ ...bilan, date: e.target.value })}
              aria-label="Date du bilan"
              className="w-full px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          </div>
          <div className="w-24">
            <label htmlFor="pr-pluie" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Pluie (mm)</label>
            <input id="pr-pluie" type="number" value={bilan.pluieMm} onChange={(e) => setBilan({ ...bilan, pluieMm: Number(e.target.value) })}
              aria-label="Pluviométrie en mm"
              className="w-full px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          </div>
          <div className="w-28">
            <label htmlFor="pr-vol" className={labelCls} style={{ color: 'var(--color-text-tertiary)' }}>Volume (m³)</label>
            <input id="pr-vol" type="number" value={bilan.volumeM3} onChange={(e) => setBilan({ ...bilan, volumeM3: Number(e.target.value) })}
              aria-label="Volume en m³"
              className="w-full px-2 py-2 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }} />
          </div>
          <button type="button" onClick={addBilan} aria-label="Ajouter le bilan" className="px-3 py-2 rounded-lg" style={{ background: COLORS.ACCENT, color: 'white' }}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build OK. (Erreur attendue tant que Task 2 n'est pas faite : `PointRejetManager` est appelé sans prop `onImport` dans `EstimationVolumePage`. C'est corrigé en Task 2 — enchaîner les deux avant de conclure le build.)

---

## Task 2: EstimationVolumePage — deux onglets Estimer / Données

**Files:**
- Modify: `src/pages/EstimationVolumePage.tsx`

- [ ] **Step 1: Remplacer le contenu du fichier**

Remplacer **tout** le contenu de `src/pages/EstimationVolumePage.tsx` par :

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ArrowRight, BarChart3, Settings2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { Stepper } from '@/components/asservissement/AsservissementStepper'
import { usePointsRejetListener } from '@/hooks/usePointsRejet'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { estimateVolume, nearestBilans } from '@/lib/estimationVolume'
import { EstimationChart } from '@/components/estimation/EstimationChart'
import { PointRejetManager } from '@/components/estimation/PointRejetManager'
import { BilanImportModal } from '@/components/estimation/BilanImportModal'

const WARN_LABEL: Record<string, string> = {
  correlation_faible: 'Corrélation faible entre pluie et volume — estimation peu fiable.',
  extrapolation: 'Pluviométrie hors de la plage des bilans connus — extrapolation.',
  peu_de_points: 'Pas assez de bilans pour une estimation fiable.',
}

export default function EstimationVolumePage() {
  usePointsRejetListener()
  const navigate = useNavigate()
  const pointsRejet = usePointsRejetStore((s) => s.pointsRejet)

  const [view, setView] = useState<'estimer' | 'donnees'>('estimer')
  const [selId, setSelId] = useState('')
  const [pluie, setPluie] = useState('10')
  const [showImport, setShowImport] = useState(false)

  const point = pointsRejet.find((p) => p.id === selId)
  const pluieMm = Number(pluie) || 0
  const res = point ? estimateVolume(point.bilans, pluieMm) : null
  const degraded = point && !res ? nearestBilans(point.bilans, pluieMm) : []

  function useInAsservissement() {
    if (!res) return
    navigate(`/outils/asservissement?v24h=${Math.round(res.volumeEstime)}`)
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: COLORS.BG_PRIMARY }}>
      {/* header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(245,245,247,0.92)', backdropFilter: 'var(--glass-panel)', WebkitBackdropFilter: 'var(--glass-panel)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate" style={{ color: COLORS.TEXT_PRIMARY }}>Estimation volume 24h</h1>
          <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Temps de pluie · à partir de l'historique</p>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        {/* toggle Estimer / Données */}
        <div className="flex gap-1.5 p-1.5 rounded-xl"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
          {([['estimer', 'Estimer', BarChart3], ['donnees', 'Données', Settings2]] as const).map(([v, label, Icon]) => (
            <button type="button" key={v} onClick={() => setView(v)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: view === v ? COLORS.ACCENT : 'transparent', color: view === v ? 'white' : COLORS.TEXT_SECONDARY }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {view === 'estimer' && (
          <>
            <p className="text-[12px] px-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Estime le volume qui passera sur un point de rejet pendant 24h selon la pluie annoncée, à partir de vos bilans passés.
            </p>

            {pointsRejet.length === 0 ? (
              <div className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
                <p className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Aucun bilan enregistré pour l'instant. Pour estimer un volume, ajoutez d'abord vos bilans passés.
                </p>
                <button type="button" onClick={() => setView('donnees')}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                  style={{ background: COLORS.ACCENT, color: 'white' }}>
                  Aller dans Données <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                {/* sélection point */}
                <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
                  <label htmlFor="est-point" className="text-[11px] mb-1 block" style={{ color: 'var(--color-text-tertiary)' }}>Point de rejet</label>
                  <select id="est-point" value={selId} onChange={(e) => setSelId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}>
                    <option value="">Choisir un point de rejet…</option>
                    {pointsRejet.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.bilans.length})</option>)}
                  </select>
                </div>

                {/* saisie pluie */}
                {point && (
                  <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
                    <Stepper label="Pluie annoncée" hint="Cumul sur 24h" value={pluie} onChange={setPluie} unit="mm" step={1} min={0} max={500} />
                  </div>
                )}

                {/* résultat */}
                {res && (
                  <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                    <div>
                      <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>Volume 24h estimé</p>
                      <p className="text-2xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>~ {Math.round(res.volumeEstime).toLocaleString('fr-FR')} m³</p>
                      <p className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                        entre {Math.round(res.fourchetteBasse).toLocaleString('fr-FR')} et {Math.round(res.fourchetteHaute).toLocaleString('fr-FR')} m³
                        <span style={{ color: 'var(--color-text-tertiary)' }}> · R² {res.r2.toFixed(2)}</span>
                      </p>
                    </div>

                    {res.warnings.map((w) => (
                      <p key={w.type} className="text-[12px] px-3 py-2 rounded-lg"
                        style={{ background: 'var(--color-warning-light, rgba(255,149,0,0.12))', color: COLORS.WARNING }}>
                        {WARN_LABEL[w.type]}
                      </p>
                    ))}

                    <EstimationChart bilans={point!.bilans} base={res.base} coef={res.coef} pluieMm={pluieMm} volumeEstime={res.volumeEstime} />

                    <button type="button" onClick={useInAsservissement}
                      className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      style={{ background: COLORS.ACCENT, color: 'white' }}>
                      Utiliser dans l'asservissement <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* mode dégradé < 3 bilans */}
                {point && !res && (
                  <div className="rounded-xl p-4" style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
                    <p className="text-[13px] mb-2" style={{ color: COLORS.WARNING }}>{WARN_LABEL.peu_de_points} Bilans les plus proches :</p>
                    {degraded.length === 0 && <p className="text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>Aucun bilan enregistré.</p>}
                    {degraded.map((bz, i) => (
                      <div key={i} className="flex justify-between text-[13px] py-1" style={{ color: COLORS.TEXT_PRIMARY }}>
                        <span>{bz.date}</span>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{bz.pluieMm} mm → {bz.volumeM3} m³</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === 'donnees' && <PointRejetManager onImport={() => setShowImport(true)} />}
      </div>

      {showImport && <BilanImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier build + lint**

Run: `npm run build && npm run lint`
Expected: build OK, pas d'erreur de lint introduite.

- [ ] **Step 3: Lancer la suite de tests (non-régression)**

Run: `npx vitest run --project unit`
Expected: 163 tests passés (logique inchangée).

- [ ] **Step 4: Commit**

```bash
git add src/pages/EstimationVolumePage.tsx src/components/estimation/PointRejetManager.tsx
git commit -m "feat(rejet): outil estimation simplifié — onglets Estimer/Données + libellés clairs"
```

---

## Task 3: Vérification manuelle & déploiement staging

- [ ] **Step 1: Vérifier en local**

Run: `npm run dev`
- Ouvrir `/outils/estimation-volume` → l'onglet **Estimer** est actif, montre l'explication + (état vide si aucun point).
- Cliquer **Données** → création de point, ajout de bilan (champs étiquetés Date / Pluie (mm) / Volume (m³)), bouton « Importer un CSV ».
- Créer un point + 3 bilans (ou importer le CSV), revenir sur **Estimer**, sélectionner le point, saisir une pluie → volume + fourchette + graphe.
- Cliquer « Utiliser dans l'asservissement » → page asservissement pré-remplie.

- [ ] **Step 2: Déployer sur staging**

Run: `bash deploy-dev.sh`
Expected: build + déploiement réussis (URL labocea-pmc-v2-dev). Les règles Firestore sont déjà déployées — rien à refaire de ce côté.

---

## Self-Review (auteur du plan)

**Couverture spec :**
- §3.1 toggle deux onglets → Task 2 ✅
- §3.2 onglet Estimer (explication, état vide, sélecteur, pluie, résultat, dégradé) → Task 2 ✅
- §3.3 onglet Données (libellés clairs, aide, bouton import) → Task 1 ✅
- §3.4 header sans icône import → Task 2 (l'icône `Upload` n'est plus importée ni rendue dans la page) ✅
- §6 critères d'acceptation → Task 3 ✅

**Cohérence des types :** `PointRejetManager` reçoit désormais `{ onImport: () => void }` (Task 1) ; appelé avec `onImport={() => setShowImport(true)}` (Task 2). `BilanImportModal` conserve sa signature `{ onClose }`. `EstimationChart` reçoit `bilans/base/coef/pluieMm/volumeEstime` (inchangé). Cohérent.

**Pas de placeholder :** code complet dans chaque étape. Tasks 1 et 2 sont interdépendantes (prop `onImport`) — les exécuter ensemble avant de valider le build, comme noté dans Task 1 Step 2.
