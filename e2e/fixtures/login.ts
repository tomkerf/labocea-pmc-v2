import type { Page } from '@playwright/test'
import { E2E_TECH_EMAIL, E2E_TECH_PASSWORD } from './seed'

export async function loginAsTech(page: Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill(E2E_TECH_EMAIL)
  await page.locator('#login-password').fill(E2E_TECH_PASSWORD)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.getByText('Tableau de bord').first().waitFor({ timeout: 10_000 })
}
