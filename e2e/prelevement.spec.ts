import { test, expect } from '@playwright/test'
import { loginAsTech } from './fixtures/login'

// Parcours : marquer un prélèvement planifié comme réalisé ("Terminer la
// mission" sur la fiche détail), et vérifier que le statut persiste.
//
// Ce test a découvert un vrai bug (2026-08-05, corrigé) : handleTerminer()
// programmait une sauvegarde debouncée (800ms) puis appelait navigate(-1)
// synchrone. Sans historique SPA à dépiler (deep-link, notification push),
// navigate(-1) sortait du document React et tuait le debounce avant qu'il se
// déclenche — sauvegarde perdue silencieusement. Fix : useClientData expose
// désormais saveNow(), une écriture immédiate et attendue, utilisée par les
// actions terminales en un clic avant toute navigation.
test('créer un prélèvement — marquer un point planifié comme réalisé', async ({ page }) => {
  await loginAsTech(page)

  await page.goto('/missions/e2e-client-1/plan/e2e-plan-ponctuel/sampling/e2e-sampling-ponctuel')
  await expect(page.getByText('Client E2E')).toBeVisible()

  await page.getByRole('button', { name: 'Terminer la mission' }).click()

  // Retour à la page précédente après validation
  await page.waitForURL((url) => !url.pathname.includes('/sampling/'), { timeout: 10_000 })

  // Rouvrir la fiche pour vérifier la persistance du statut
  await page.goto('/missions/e2e-client-1/plan/e2e-plan-ponctuel/sampling/e2e-sampling-ponctuel')
  await expect(page.getByText('Réalisé').first()).toBeVisible()
})
