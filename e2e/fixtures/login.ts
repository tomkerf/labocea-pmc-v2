import type { Page } from '@playwright/test'
import { E2E_TECH_EMAIL, E2E_TECH_PASSWORD } from './seed'
import { CHANGELOG_VERSION } from '../../src/data/changelog'

export async function loginAsTech(page: Page) {
  // Marque le changelog comme déjà vu : un navigateur E2E frais n'a jamais
  // cette clé, la modale "Nouveautés" s'ouvrirait au premier login et
  // intercepterait tous les clics suivants (overlay plein écran).
  await page.addInitScript((version) => {
    localStorage.setItem('pmc_changelog_seen', version)
  }, CHANGELOG_VERSION)

  await page.goto('/login')
  await page.locator('#login-email').fill(E2E_TECH_EMAIL)
  await page.locator('#login-password').fill(E2E_TECH_PASSWORD)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.getByText('Tableau de bord').first().waitFor({ timeout: 10_000 })
}
