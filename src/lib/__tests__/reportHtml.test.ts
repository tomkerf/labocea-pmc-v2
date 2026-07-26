import { describe, it, expect } from 'vitest'
import { buildReportHtml } from '../reportHtml'
import type { AppUser, Client, Plan, Sampling } from '@/types'

const sampling = (over: Partial<Sampling> = {}): Sampling => ({
  id: 's1', num: 1, plannedMonth: 2, plannedDay: 0, status: 'planned',
  doneDate: '', comment: '', nappe: '' as never, rapportPrevu: false, rapportDate: '',
  tente: false, reportHistory: [], doneBy: '',
  ...over,
} as unknown as Sampling)

const plan = (samplings: Sampling[]): Plan => ({
  id: 'p1', nom: 'Point aval', siteNom: 'Station Nord',
  frequence: 'Mensuel', methode: 'Ponctuel', samplings,
} as unknown as Plan)

const client = { id: 'c1', nom: 'Plounerin' } as unknown as Client
const users: AppUser[] = [
  { uid: 'u1', prenom: 'Thomas', nom: 'Kerfendal' } as unknown as AppUser,
]

describe('buildReportHtml', () => {
  it('inclut le nom du client, du point, le site, la fréquence et la méthode', () => {
    const html = buildReportHtml(client, plan([sampling()]), users)
    expect(html).toContain('Plounerin')
    expect(html).toContain('Point aval')
    expect(html).toContain('Station Nord')
    expect(html).toContain('Mensuel')
    expect(html).toContain('Ponctuel')
  })

  it('résout le technicien via son uid dans users', () => {
    const html = buildReportHtml(client, plan([sampling({ status: 'done', doneBy: 'u1', doneDate: '2026-03-25' })]), users)
    expect(html).toContain('Thomas Kerfendal')
  })

  it('affiche le mois prévu et "Date à définir" pour dateUndefined', () => {
    const html = buildReportHtml(client, plan([sampling({ dateUndefined: true })]), users)
    expect(html).toContain('Date à définir')
  })

  it('compte correctement les statuts dans les KPIs', () => {
    const html = buildReportHtml(client, plan([
      sampling({ status: 'done' }),
      sampling({ status: 'overdue' }),
      sampling({ status: 'non_effectue' }),
    ]), users)
    // total = 3
    expect(html).toContain('>3</strong><span>Total</span>')
  })

  it('affiche la section historique uniquement s\'il y a des reports', () => {
    const withoutHistory = buildReportHtml(client, plan([sampling()]), users)
    expect(withoutHistory).not.toContain('Historique des reports')

    const withHistory = buildReportHtml(client, plan([sampling({
      reportHistory: [{ from: '2026-03-01', to: '2026-04-01', by: 'u1', reason: 'Crue', at: '2026-02-01T10:00:00Z' }] as never,
    })]), users)
    expect(withHistory).toContain('Historique des reports')
    expect(withHistory).toContain('Crue')
  })

  it('échappe le HTML pour prévenir l\'injection', () => {
    const html = buildReportHtml({ ...client, nom: '<script>x</script>' } as never, plan([sampling()]), users)
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('injecte le script d\'impression seulement si withPrintScript=true', () => {
    expect(buildReportHtml(client, plan([sampling()]), users, false)).not.toContain('window.print()')
    expect(buildReportHtml(client, plan([sampling()]), users, true)).toContain('window.print()')
  })
})
