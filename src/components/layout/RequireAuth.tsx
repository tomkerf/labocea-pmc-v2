import { useState, useReducer } from 'react'
import { Navigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { COLLECTIONS, COLORS } from '@/lib/constants'

type ProfileFormState = {
  prenom: string
  nom: string
  initiales: string
}

type ProfileFormAction = { type: 'field'; name: keyof ProfileFormState; value: string }

function profileFormReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  return { ...state, [action.name]: action.value }
}

/** Bloque l'accès à l'app tant que le profil n'est pas complété (initiales vides). */
function CompleteProfileModal() {
  const appUser   = useAuthStore(selectAppUser)
  const setAppUser = useAuthStore((s) => s.setAppUser)

  const [form, dispatch] = useReducer(profileFormReducer, {
    prenom:    appUser?.prenom    ?? '',
    nom:       appUser?.nom       ?? '',
    initiales: appUser?.initiales ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const { prenom, nom, initiales } = form

  async function handleSave() {
    const init = initiales.trim().toUpperCase()
    const pre  = prenom.trim()
    const no   = nom.trim()

    if (!init || !pre || !no) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    if (!/^[A-Z]{2,4}$/.test(init)) {
      setError('Les initiales doivent contenir 2 à 4 lettres majuscules (ex: THK).')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (!appUser) return
      const ref = doc(db, COLLECTIONS.USERS, appUser.uid)
      await setDoc(ref, { prenom: pre, nom: no, initiales: init, lastLoginAt: serverTimestamp() }, { merge: true })
      setAppUser({ ...appUser, prenom: pre, nom: no, initiales: init })
    } catch {
      setError('Erreur lors de la sauvegarde. Réessaie.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-modal)' }}>

        <h2 className="text-lg font-semibold mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>
          Complète ton profil
        </h2>
        <p className="text-sm mb-6" style={{ color: COLORS.TEXT_SECONDARY }}>
          Ces informations apparaissent dans les prélèvements et le planning.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="ra-prenom" className="text-xs font-medium block mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Prénom
            </label>
            <input
              id="ra-prenom"
              value={prenom}
              onChange={(e) => dispatch({ type: 'field', name: 'prenom', value: e.target.value })}
              className="field-input w-full"
              placeholder="Thomas"

            />
          </div>
          <div>
            <label htmlFor="ra-nom" className="text-xs font-medium block mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Nom
            </label>
            <input
              id="ra-nom"
              value={nom}
              onChange={(e) => dispatch({ type: 'field', name: 'nom', value: e.target.value })}
              className="field-input w-full"
              placeholder="Kerfendal"
            />
          </div>
          <div>
            <label htmlFor="ra-initiales" className="text-xs font-medium block mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Initiales <span style={{ color: 'var(--color-text-tertiary)' }}>(2 à 4 lettres, ex: THK)</span>
            </label>
            <input
              id="ra-initiales"
              value={initiales}
              onChange={(e) => dispatch({ type: 'field', name: 'initiales', value: e.target.value.toUpperCase() })}
              className="field-input w-full"
              placeholder="THK"
              maxLength={4}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: COLORS.DANGER }}>{error}</p>
          )}

          <button type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-2 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: COLORS.ACCENT,
              color: 'white',
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Sauvegarde…' : 'Enregistrer et continuer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { initialized, firebaseUser } = useAuthStore()
  const appUser = useAuthStore(selectAppUser)

  // Attendre que Firebase Auth soit initialisé
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.BG_PRIMARY }}>
        <div className="size-6 rounded-full border-2 animate-spin"
          style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
      </div>
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />
  }

  const profileIncomplete = !appUser?.initiales?.trim()

  return (
    <>
      {profileIncomplete && <CompleteProfileModal />}
      {children}
    </>
  )
}
