import { describe, it, expect } from 'vitest'
import { buildIssueListHtml } from '../exportIssueListHtml'
import type { Client, Plan, Sampling } from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'

const FUTURE = 2099 // planYear futur → 'planned' reste 'Planifié' (pas d'overdue)

const sampling = (over: Partial<Sampling> = {}): Sampling => ({
  id: 's1', num: 1, plannedMonth: 6, plannedDay: 0, status: 'planned',
  doneDate: '', comment: '', nappe: '' as never, rapportPrevu: false, rapportDate: '',
  tente: false, reportHistory: [], doneBy: '',
  ...over,
} as unknown as Sampling)

const client = (over: Partial<Client> = {}): Client =>
  ({ id: 'c1', nom: 'Plounerin', preleveur: 'THK', ...over } as unknown as Client)

const plan = (over: Partial<Plan> = {}): Plan =>
  ({ id: 'p1', nom: 'Point aval', siteNom: 'Station Nord', methode: 'Ponctuel', ...over } as unknown as Plan)

const preleveurs: Preleveur[] = [{ code: 'THK', nom: 'Thomas Kerfendal' } as unknown as Preleveur]

const issue = (over: { client?: Partial<Client>; plan?: Partial<Plan>; sampling?: Partial<Sampling> } = {}) => ({
  client: client(over.client), plan: plan(over.plan), sampling: sampling(over.sampling), planYear: FUTURE,
})

describe('buildIssueListHtml', () => {
  it('affiche le titre avec le mois et l\'année', () => {
    const html = buildIssueListHtml([issue()], 'Juillet', 2026, preleveurs)
    expect(html).toContain('Prélèvements — Juillet 2026')
  })

  it('affiche client, point et site dans les lignes', () => {
    const html = buildIssueListHtml([issue()], 'Juillet', 2026, preleveurs)
    expect(html).toContain('Plounerin')
    expect(html).toContain('Point aval')
    expect(html).toContain('Station Nord')
  })

  it('résout le nom du préleveur via son code', () => {
    const html = buildIssueListHtml([issue()], 'Juillet', 2026, preleveurs)
    expect(html).toContain('Thomas Kerfendal')
  })

  it('retombe sur assignedTo du sampling avant client.preleveur', () => {
    const html = buildIssueListHtml(
      [issue({ sampling: { assignedTo: 'THK' }, client: { preleveur: 'XXX' } })],
      'Juillet', 2026, preleveurs,
    )
    expect(html).toContain('Thomas Kerfendal')
  })

  it('calcule les compteurs de statut (fait / planifié)', () => {
    const html = buildIssueListHtml(
      [
        issue({ sampling: { status: 'done' } }),
        issue({ sampling: { status: 'planned' } }),
        issue({ sampling: { status: 'planned' } }),
      ],
      'Juillet', 2026, preleveurs,
    )
    expect(html).toContain('>1</strong><span>Faits</span>')
    expect(html).toContain('>2</strong><span>Planifiés</span>')
    expect(html).toContain('>3</strong><span>Total</span>')
  })

  it('échappe le HTML dans le nom du client', () => {
    const html = buildIssueListHtml([issue({ client: { nom: '<b>x</b>' } })], 'Juillet', 2026, preleveurs)
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;')
  })

  it('n\'injecte le script d\'impression que si withPrintScript=true', () => {
    expect(buildIssueListHtml([issue()], 'Juillet', 2026, preleveurs, false)).not.toContain('window.print()')
    expect(buildIssueListHtml([issue()], 'Juillet', 2026, preleveurs, true)).toContain('window.print()')
  })

  it('gère une liste vide sans planter', () => {
    const html = buildIssueListHtml([], 'Juillet', 2026, preleveurs)
    expect(html).toContain('>0</strong><span>Total</span>')
  })
})
