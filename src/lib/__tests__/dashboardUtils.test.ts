import { describe, it, expect, vi, afterEach } from 'vitest'
import { getGreeting, isThisMonth, localISO, isToday, daysDiff } from '../dashboardUtils'

afterEach(() => {
  vi.useRealTimers()
})

function freeze(y: number, mo: number, d: number, h = 9): void {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(y, mo, d, h, 0, 0)) // heure locale
}

describe('getGreeting', () => {
  it('renvoie "Bonjour" avant midi', () => {
    freeze(2026, 6, 1, 9)
    expect(getGreeting()).toBe('Bonjour')
  })
  it('renvoie "Bon après-midi" entre 12h et 18h', () => {
    freeze(2026, 6, 1, 14)
    expect(getGreeting()).toBe('Bon après-midi')
  })
  it('renvoie "Bonsoir" à partir de 18h', () => {
    freeze(2026, 6, 1, 20)
    expect(getGreeting()).toBe('Bonsoir')
  })
})

describe('localISO', () => {
  it('formate en YYYY-MM-DD avec padding', () => {
    expect(localISO(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(localISO(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
  it('utilise la date locale (pas UTC)', () => {
    // 1er juillet à 00h30 locale doit rester le 1er, jamais basculer au 30 juin
    expect(localISO(new Date(2026, 6, 1, 0, 30))).toBe('2026-07-01')
  })
})

describe('isToday', () => {
  it('vrai pour la date du jour', () => {
    freeze(2026, 6, 1)
    expect(isToday('2026-07-01')).toBe(true)
  })
  it('faux pour une autre date', () => {
    freeze(2026, 6, 1)
    expect(isToday('2026-06-30')).toBe(false)
  })
  it('faux pour une chaîne vide', () => {
    expect(isToday('')).toBe(false)
  })
})

describe('isThisMonth', () => {
  it('vrai pour une date du mois courant', () => {
    freeze(2026, 6, 15)
    expect(isThisMonth('2026-07-01')).toBe(true)
    expect(isThisMonth('2026-07-31')).toBe(true)
  })
  it('faux pour un autre mois', () => {
    freeze(2026, 6, 15)
    expect(isThisMonth('2026-08-01')).toBe(false)
    expect(isThisMonth('2026-06-30')).toBe(false)
  })
  it('faux pour une chaîne vide', () => {
    expect(isThisMonth('')).toBe(false)
  })
  it('ne bascule pas de mois à cause d\'UTC (bord de mois)', () => {
    freeze(2026, 6, 1)
    // '2026-07-01' interprété à midi local → reste juillet, jamais 30 juin UTC
    expect(isThisMonth('2026-07-01')).toBe(true)
  })
})

describe('daysDiff', () => {
  it('renvoie 0 pour aujourd\'hui', () => {
    freeze(2026, 6, 1, 9)
    expect(daysDiff('2026-07-01')).toBe(0)
  })
  it('renvoie un nombre positif dans le futur', () => {
    freeze(2026, 6, 1, 9)
    expect(daysDiff('2026-07-04')).toBe(3)
  })
  it('renvoie un nombre négatif dans le passé', () => {
    freeze(2026, 6, 1, 9)
    expect(daysDiff('2026-06-28')).toBe(-3)
  })
  it('ne subit pas de décalage UTC en début de journée', () => {
    // Bug historique : new Date("2026-07-01") en UTC donnait -1 avant 2h du matin en Europe.
    // Avec le suffixe T12:00:00, le résultat doit rester 0.
    freeze(2026, 6, 1, 1) // 1h du matin
    expect(daysDiff('2026-07-01')).toBe(0)
  })
  it('ne subit pas de décalage en fin de journée', () => {
    // Symétrique du cas 1h : à 23h le même jour doit rester 0 (pas +1).
    freeze(2026, 6, 1, 23)
    // Math.abs neutralise le -0 que Math.round peut produire ; fonctionnellement = 0.
    expect(Math.abs(daysDiff('2026-07-01'))).toBe(0)
  })
  it('accepte une chaîne ISO complète avec heure', () => {
    // Les call sites passent parfois un datetime complet (prochainControle, datePrevue) :
    // la branche else doit rester cohérente.
    freeze(2026, 6, 1, 9)
    expect(daysDiff('2026-07-04T12:00:00')).toBe(3)
  })
})
