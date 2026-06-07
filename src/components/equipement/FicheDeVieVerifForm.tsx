import { useReducer, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import type { Verification } from '@/types'
import { COLORS } from '@/lib/constants'

interface FormState {
  verifDate:      string
  verifType:      'etalonnage_interne' | 'verification_externe' | 'controle_terrain'
  verifResultat:  'conforme' | 'non_conforme' | 'a_reprendre'
  verifRemarques: string
  verifProchain:  string
}

type FormAction = { type: 'field'; name: keyof FormState; value: string }

function formReducer(state: FormState, action: FormAction): FormState {
  return { ...state, [action.name]: action.value }
}

const initialFormState: FormState = {
  verifDate:      new Date().toISOString().slice(0, 10),
  verifType:      'etalonnage_interne',
  verifResultat:  'conforme',
  verifRemarques: '',
  verifProchain:  '',
}

interface FicheDeVieVerifFormProps {
  equipementId: string
  equipementNom: string
  uid: string
  initiales: string
  onSave: (v: Verification) => Promise<void>
  onCancel: () => void
}

export function FicheDeVieVerifForm({ equipementId, equipementNom, uid, initiales, onSave, onCancel }: FicheDeVieVerifFormProps) {
  const [form, dispatch] = useReducer(formReducer, initialFormState)
  const [saving, setSaving] = useState(false)

  const { verifDate, verifType, verifResultat, verifRemarques, verifProchain } = form

  async function handleSubmit() {
    if (!verifDate || saving) return
    setSaving(true)
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
    await onSave(verif)
    dispatch({ type: 'field', name: 'verifRemarques', value: '' })
    dispatch({ type: 'field', name: 'verifProchain', value: '' })
    setSaving(false)
    onCancel()
  }

  return (
    <div className="rounded-xl p-4 mb-3"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-success)', boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-semibold mb-3" style={{ color: COLORS.SUCCESS }}>Nouvelle vérification</p>
      <div className="flex gap-3 mb-2 flex-wrap">
        <div>
          <label htmlFor="fdv-verif-type" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Type</label>
          <select id="fdv-verif-type" value={verifType} onChange={e => dispatch({ type: 'field', name: 'verifType', value: e.target.value })} className="field-input">
            <option value="etalonnage_interne">Étalonnage interne</option>
            <option value="verification_externe">Vérification externe</option>
            <option value="controle_terrain">Contrôle terrain</option>
          </select>
        </div>
        <div>
          <label htmlFor="fdv-verif-date" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Date</label>
          <input id="fdv-verif-date" type="date" value={verifDate} onChange={e => dispatch({ type: 'field', name: 'verifDate', value: e.target.value })} className="field-input" />
        </div>
        <div>
          <label htmlFor="fdv-verif-resultat" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Résultat</label>
          <select id="fdv-verif-resultat" value={verifResultat} onChange={e => dispatch({ type: 'field', name: 'verifResultat', value: e.target.value })} className="field-input">
            <option value="conforme">Conforme</option>
            <option value="non_conforme">Non conforme</option>
            <option value="a_reprendre">À reprendre</option>
          </select>
        </div>
        <div>
          <label htmlFor="fdv-verif-prochain" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Prochain contrôle</label>
          <input id="fdv-verif-prochain" type="date" value={verifProchain} onChange={e => dispatch({ type: 'field', name: 'verifProchain', value: e.target.value })} className="field-input" />
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor="fdv-verif-remarques" className="text-xs mb-1 block" style={{ color: COLORS.TEXT_SECONDARY }}>Remarques (optionnel)</label>
        <textarea id="fdv-verif-remarques" value={verifRemarques} onChange={e => dispatch({ type: 'field', name: 'verifRemarques', value: e.target.value })} rows={2}
          placeholder="Observations, dérives constatées…" className="field-input w-full resize-none" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          Annuler
        </button>
        <button type="button" onClick={handleSubmit} disabled={!verifDate || saving} className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: COLORS.SUCCESS, color: 'white', opacity: !verifDate || saving ? 0.5 : 1 }}>
          {saving ? '…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
