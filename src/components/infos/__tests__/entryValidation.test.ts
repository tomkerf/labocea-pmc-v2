import { describe, it, expect } from 'vitest'
import { validationHint } from '../entryValidation'

// Champs vides par défaut — chaque test ne renseigne que ce qui l'intéresse.
const empty = {
  type: 'contact' as const, clientId: 'c1', nom: '', role: '',
  tel: '', tel2: '', email: '', libelle: '', code: '', contenu: '', notes: '',
}

describe('validationHint', () => {
  describe('type acces', () => {
    const acces = { ...empty, type: 'acces' as const }

    it('signale les deux champs quand tout est vide', () => {
      expect(validationHint(acces)).toBe('Renseigne le libellé et le code pour pouvoir créer cet accès.')
    })

    // Cas signalé en prod le 2026-08-06 : libellé saisi, code vide, bouton grisé
    // sans aucune explication à l'écran.
    it('signale le code seul quand seul le libellé est saisi', () => {
      expect(validationHint({ ...acces, libelle: '0209a' })).toBe('Renseigne le code pour pouvoir créer cet accès.')
    })

    it('signale le libellé seul quand seul le code est saisi', () => {
      expect(validationHint({ ...acces, code: '1234' })).toBe('Renseigne le libellé pour pouvoir créer cet accès.')
    })

    it('ne signale rien quand les deux sont saisis', () => {
      expect(validationHint({ ...acces, libelle: 'Portail nord', code: '1234' })).toBeNull()
    })

    it('ignore les espaces seuls', () => {
      expect(validationHint({ ...acces, libelle: '  ', code: '  ' }))
        .toBe('Renseigne le libellé et le code pour pouvoir créer cet accès.')
    })
  })

  describe('autres types', () => {
    it('exige le nom pour un contact', () => {
      expect(validationHint(empty)).toBe('Renseigne le nom pour pouvoir créer cette entrée.')
      expect(validationHint({ ...empty, nom: 'Jean Dupont' })).toBeNull()
    })

    it('accepte un titre OU une description pour un site', () => {
      const site = { ...empty, type: 'site' as const }
      expect(validationHint(site)).toBe('Renseigne un titre ou une description.')
      expect(validationHint({ ...site, libelle: 'Portail' })).toBeNull()
      expect(validationHint({ ...site, contenu: 'Accès par la D5' })).toBeNull()
    })

    it('exige un contenu pour une note', () => {
      const note = { ...empty, type: 'note' as const }
      expect(validationHint(note)).toBe('Saisis le contenu de la note.')
      expect(validationHint({ ...note, contenu: 'Prévenir avant 8h' })).toBeNull()
    })
  })
})
