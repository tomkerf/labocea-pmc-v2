import { describe, it, expect } from 'vitest'
import {
  shiftDateFin, getFrenchHolidays, isVeilleJourFerie, getISOWeek,
  startOfWeek, startOfMonth, addDays, addMonths, toISO, sameDay,
  buildMonthGrid, buildMiniGrid, parseHHMM, normTech, getPeriodLabel,
} from '../planningUtils'

describe('shiftDateFin', () => {
  it('retourne undefined si pas de dateFin (événement jour unique)', () => {
    expect(shiftDateFin('2026-06-29', '2026-07-03', undefined)).toBeUndefined()
  })

  it('décale dateFin du même nombre de jours que le début (préserve la durée)', () => {
    // début 29/06 → 03/07 = +4 jours ; fin 01/07 → 05/07
    expect(shiftDateFin('2026-06-29', '2026-07-03', '2026-07-01')).toBe('2026-07-05')
  })

  it('gère un décalage vers le passé', () => {
    // début 10/06 → 05/06 = -5 jours ; fin 12/06 → 07/06
    expect(shiftDateFin('2026-06-10', '2026-06-05', '2026-06-12')).toBe('2026-06-07')
  })

  it('gère le passage de mois', () => {
    // +3 jours : fin 30/06 → 03/07
    expect(shiftDateFin('2026-06-27', '2026-06-30', '2026-06-30')).toBe('2026-07-03')
  })

  it('conserve dateFin == date pour un événement multi-jours d\'un seul jour de durée', () => {
    expect(shiftDateFin('2026-06-29', '2026-06-29', '2026-06-29')).toBe('2026-06-29')
  })
})

// ── Helpers date ──────────────────────────────────────────────────

describe('toISO', () => {
  it('formate en YYYY-MM-DD avec padding', () => {
    expect(toISO(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISO(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('sameDay', () => {
  it('vrai pour deux instants du même jour', () => {
    expect(sameDay(new Date(2026, 6, 1, 8), new Date(2026, 6, 1, 22))).toBe(true)
  })
  it('faux pour deux jours différents', () => {
    expect(sameDay(new Date(2026, 6, 1), new Date(2026, 6, 2))).toBe(false)
  })
})

describe('addDays / addMonths', () => {
  it('addDays gère le passage de mois', () => {
    expect(toISO(addDays(new Date(2026, 5, 29), 4))).toBe('2026-07-03')
  })
  it('addDays gère un décalage négatif', () => {
    expect(toISO(addDays(new Date(2026, 6, 1), -1))).toBe('2026-06-30')
  })
  it('addMonths ramène au 1er du mois cible', () => {
    expect(toISO(addMonths(new Date(2026, 6, 15), 1))).toBe('2026-08-01')
    expect(toISO(addMonths(new Date(2026, 0, 20), -1))).toBe('2025-12-01')
  })
})

describe('startOfWeek', () => {
  it('renvoie le lundi de la semaine (mercredi → lundi)', () => {
    // 2026-07-01 est un mercredi → lundi = 2026-06-29
    expect(toISO(startOfWeek(new Date(2026, 6, 1)))).toBe('2026-06-29')
  })
  it('gère le dimanche (rattaché à la semaine précédente)', () => {
    // 2026-07-05 est un dimanche → lundi = 2026-06-29
    expect(toISO(startOfWeek(new Date(2026, 6, 5)))).toBe('2026-06-29')
  })
})

describe('startOfMonth', () => {
  it('renvoie le 1er du mois', () => {
    expect(toISO(startOfMonth(new Date(2026, 6, 23)))).toBe('2026-07-01')
  })
})

// ── Jours fériés ──────────────────────────────────────────────────

describe('getFrenchHolidays', () => {
  it('inclut les fériés fixes 2026', () => {
    const h = getFrenchHolidays(2026)
    expect(h['2026-01-01']).toBe('Jour de l\'an')
    expect(h['2026-05-01']).toBe('Fête du Travail')
    expect(h['2026-07-14']).toBe('Fête Nationale')
    expect(h['2026-12-25']).toBe('Noël')
  })
  it('calcule correctement les fériés mobiles 2026 (Pâques = 5 avril)', () => {
    const h = getFrenchHolidays(2026)
    expect(h['2026-04-06']).toBe('Lundi de Pâques')
    expect(h['2026-05-14']).toBe('Ascension')
    expect(h['2026-05-25']).toBe('Lundi de Pentecôte')
  })
})

describe('isVeilleJourFerie', () => {
  it('détecte la veille de Noël', () => {
    expect(isVeilleJourFerie('2026-12-24')).toBe('Noël')
  })
  it('détecte la veille de la Fête Nationale', () => {
    expect(isVeilleJourFerie('2026-07-13')).toBe('Fête Nationale')
  })
  it('renvoie null un jour ordinaire', () => {
    expect(isVeilleJourFerie('2026-03-15')).toBeNull()
  })
})

// ── Semaine ISO ───────────────────────────────────────────────────

describe('getISOWeek', () => {
  it('semaine 1 pour début janvier', () => {
    expect(getISOWeek(new Date(2026, 0, 1))).toBe(1)
  })
  it('numérote correctement une date de milieu d\'année', () => {
    // 2026-07-01 → semaine ISO 27
    expect(getISOWeek(new Date(2026, 6, 1))).toBe(27)
  })
})

// ── Grilles calendrier ────────────────────────────────────────────

describe('buildMonthGrid', () => {
  it('juillet 2026 : 2 cases vides avant le 1er (mercredi), longueur multiple de 7', () => {
    const grid = buildMonthGrid(new Date(2026, 6, 1))
    expect(grid.length % 7).toBe(0)
    expect(grid[0]).toBeNull()
    expect(grid[1]).toBeNull()
    expect(toISO(grid[2]!)).toBe('2026-07-01')
    // 31 jours présents
    expect(grid.filter(Boolean).length).toBe(31)
  })
})

describe('buildMiniGrid', () => {
  it('produit une grille alignée (multiple de 7) avec tous les jours', () => {
    const grid = buildMiniGrid(new Date(2026, 1, 1)) // février 2026
    expect(grid.length % 7).toBe(0)
    expect(grid.filter(Boolean).length).toBe(28) // 2026 non bissextile
  })
})

// ── Divers helpers ────────────────────────────────────────────────

describe('parseHHMM', () => {
  it('convertit HH:MM en minutes', () => {
    expect(parseHHMM('08:30')).toBe(510)
    expect(parseHHMM('00:00')).toBe(0)
    expect(parseHHMM('23:59')).toBe(1439)
  })
  it('tolère une entrée vide ou partielle', () => {
    expect(parseHHMM('')).toBe(0)
    expect(parseHHMM('9')).toBe(540)
  })
})

describe('normTech', () => {
  it('extrait les initiales (dernier segment)', () => {
    expect(normTech('Thomas THK')).toBe('THK')
    expect(normTech('THK')).toBe('THK')
  })
  it('préserve le placeholder et la chaîne vide', () => {
    expect(normTech('—')).toBe('—')
    expect(normTech('')).toBe('')
  })
})

describe('getPeriodLabel', () => {
  const d = new Date(2026, 6, 1) // mercredi 1 juillet 2026
  it('vue jour', () => {
    expect(getPeriodLabel('jour', d, d, d)).toBe('Mercredi 1 Juillet 2026')
  })
  it('vue semaine dans le même mois', () => {
    const ws = new Date(2026, 6, 6) // lundi 6 juillet
    expect(getPeriodLabel('semaine', d, ws, d)).toBe('6–12 Juillet 2026')
  })
  it('vue année', () => {
    expect(getPeriodLabel('annee', d, d, d)).toBe('Année 2026')
  })
  it('vue mois', () => {
    expect(getPeriodLabel('mois', d, d, new Date(2026, 6, 1))).toBe('Juillet 2026')
  })
})
