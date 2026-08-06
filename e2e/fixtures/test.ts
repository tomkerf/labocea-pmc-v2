import { test as base, expect } from '@playwright/test'
import { seedE2eData } from './seed'

// Reseed avant CHAQUE test (pas juste une fois via globalSetup) pour isoler
// les specs entre elles. seedE2eData() fait un reset complet (delete puis
// recreate), donc l'appeler N fois est sûr. Sans ça, un test qui mute les
// données de seed (ex: marquer un prélèvement "réalisé") fausse les
// suivants — cf tournee.spec.ts qui échouait après prelevement.spec.ts,
// cible un item différent une fois le prélèvement ponctuel déjà "fait".
export const test = base.extend<{ seeded: void }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright exige {} littéral pour repérer les fixtures utilisées
  seeded: [async ({}, use) => {
    await seedE2eData()
    await use()
  }, { auto: true }],
})

export { expect }
