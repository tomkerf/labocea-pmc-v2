import { test, expect } from '@playwright/test'
import { loginAsTech } from './fixtures/login'

// Régression sur le bug corrigé en session 197 (badge J1/J2 erroné) : un
// Bilan 24h planifié aujourd'hui doit afficher le badge "J1" (jour de pose)
// sur le widget "Planning du jour" du Dashboard.
test('planifier/afficher un Bilan 24h — badge J1 visible le jour de pose', async ({ page }) => {
  await loginAsTech(page)

  await page.goto('/')
  await expect(page.getByText('Planning du jour')).toBeVisible()
  await expect(page.getByText('Client E2E').first()).toBeVisible()
  await expect(page.getByTitle('Bilan 24h — pose (J1)')).toBeVisible()
})
