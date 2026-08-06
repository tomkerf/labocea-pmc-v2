import { test, expect } from './fixtures/test'
import { loginAsTech } from './fixtures/login'

// Parcours : valider une tournée du jour — marquer un point "Réalisé"
// depuis la page Tournée (SaisieRapideModal).
test('valider une tournée — marquer un point du jour réalisé', async ({ page }) => {
  await loginAsTech(page)

  await page.goto('/tournee')
  await expect(page.getByText('Client E2E').first()).toBeVisible()

  await page.getByRole('button', { name: 'Réalisé', exact: true }).first().click()
  await page.getByRole('button', { name: 'Valider' }).click()

  // Le point validé quitte la liste "à faire" / passe en terminé
  await expect(page.getByRole('button', { name: 'Valider' })).not.toBeVisible({ timeout: 10_000 })
})
