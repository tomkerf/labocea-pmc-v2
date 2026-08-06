import type { TerrainType } from '@/types'

export type FormState = {
  type: TerrainType; clientId: string; nom: string; role: string
  tel: string; tel2: string; email: string; libelle: string
  code: string; contenu: string; notes: string
}

/**
 * Explique ce qui empêche de valider — `null` si le formulaire est complet.
 * Sert à la fois de règle de validation (canSave) et de message affiché : sans
 * ça, le bouton reste grisé sans que rien n'indique le champ manquant.
 */
export function validationHint(form: FormState): string | null {
  const { type, nom, libelle, code, contenu } = form
  if (type === 'contact') {
    return nom.trim() ? null : 'Renseigne le nom pour pouvoir créer cette entrée.'
  }
  if (type === 'acces') {
    const manquants = [!libelle.trim() && 'le libellé', !code.trim() && 'le code'].filter(Boolean).join(' et ')
    return manquants ? `Renseigne ${manquants} pour pouvoir créer cet accès.` : null
  }
  if (type === 'site') {
    return libelle.trim() || contenu.trim() ? null : 'Renseigne un titre ou une description.'
  }
  return contenu.trim() || libelle.trim() ? null : 'Saisis le contenu de la note.'
}
