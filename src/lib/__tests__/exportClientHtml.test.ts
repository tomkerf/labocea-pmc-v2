import { describe, it, expect } from 'vitest'
import { buildClientReportHtml } from '../exportClientHtml'
import type { AppUser, Client, Plan, Sampling } from '@/types'

const sampling = (over: Partial<Sampling> = {}): Sampling => ({
  id: 's1', num: 1, plannedMonth: 2, plannedDay: 0, status: 'planned',
  doneDate: '', comment: '', nappe: '' as never, rapportPrevu: false, rapportDate: '',
  tente: false, reportHistory: [], doneBy: '', assignedTo: '',
  ...over,
} as unknown as Sampling)

const plan = (samplings: Sampling[], over: Partial<Plan> = {}): Plan => ({
  id: 'p1', nom: 'Point aval', siteNom: 'Station Nord',
  frequence: 'Mensuel', nature: 'Eau usée', methode: 'Ponctuel', samplings,
  ...over,
} as unknown as Plan)

const client = (plans: Plan[], over: Partial<Client> = {}): Client => ({
  id: 'c1', nom: 'Plounerin', annee: 2026, segment: 'Collectivité',
  interlocuteur: 'M. Dupont', email: 'contact@plounerin.fr', montantTotal: 12000,
  plans,
  ...over,
} as unknown as Client)

const users: AppUser[] = [
  { uid: 'u1', prenom: 'Thomas', nom: 'Kerfendal' } as unknown as AppUser,
]

describe('buildClientReportHtml', () => {
  it('affiche l\'en-tête et les infos administratives du client', () => {
    const html = buildClientReportHtml(client([plan([sampling()])]), users)
    expect(html).toContain('Plounerin')
    expect(html).toContain('M. Dupont')
    expect(html).toContain('contact@plounerin.fr')
    expect(html).toContain('12 000 €') // toLocaleString fr-FR (espace insécable étroit)
  })

  it('agrège les KPIs globaux sur tous les plans', () => {
    const html = buildClientReportHtml(client([
      plan([sampling({ status: 'done' }), sampling({ status: 'overdue' })]),
      plan([sampling({ status: 'non_effectue' })], { nom: 'Point amont' }),
    ]), users)
    expect(html).toContain('>3</strong><span>Total</span>')
  })

  it('résout le technicien via doneBy, sinon assignedTo', () => {
    const html = buildClientReportHtml(client([
      plan([sampling({ status: 'done', doneBy: 'u1' }), sampling({ assignedTo: 'ROM' })]),
    ]), users)
    expect(html).toContain('Thomas Kerfendal')
    expect(html).toContain('ROM')
  })

  it('affiche les sous-lignes d\'historique de report', () => {
    const html = buildClientReportHtml(client([
      plan([sampling({ reportHistory: [{ from: '2026-03-01', to: '2026-04-01', by: 'u1', reason: 'Crue' }] as never })]),
    ]), users)
    expect(html).toContain('Report')
    expect(html).toContain('Crue')
  })

  it('affiche le message "aucun prélèvement" si tous les plans sont vides', () => {
    const html = buildClientReportHtml(client([plan([])]), users)
    expect(html).toContain('Aucun prélèvement enregistré')
  })

  it('échappe le HTML du nom du client partout (corps ET title)', () => {
    const html = buildClientReportHtml(client([plan([sampling()])], { nom: '<img src=x>' }), users)
    expect(html).not.toContain('<img src=x>')
    expect(html).toContain('&lt;img')
  })

  it('n\'injecte le script d\'impression que si withPrintScript=true', () => {
    expect(buildClientReportHtml(client([plan([sampling()])]), users, false)).not.toContain('window.print()')
    expect(buildClientReportHtml(client([plan([sampling()])]), users, true)).toContain('window.print()')
  })
})
