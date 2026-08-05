import { test, expect } from '@playwright/test'
import { loginAsTech } from './fixtures/login'

// Parcours : marquer un prélèvement planifié comme réalisé ("Terminer la
// mission" sur la fiche détail), et vérifier que le statut persiste.
//
// BUG RÉEL DÉCOUVERT PAR CE TEST (2026-08-05, non corrigé) : quand la page est
// atteinte par navigation directe (deep-link — ce qui est le cas ici via
// page.goto, mais aussi en usage réel via une notification push, cf DEV_LOG),
// handleTerminer() (MissionDetailPage.tsx) appelle triggerSave() — debounce
// 800ms, useClientData.ts — puis navigate(-1) *synchrone*. Sans entrée
// d'historique SPA à dépiler, navigate(-1) sort du document React (navigation
// navigateur dure), tuant le setTimeout en attente AVANT les 800ms : la
// sauvegarde ne part jamais, silencieusement (pas d'erreur, pas de toast).
// Vérifié empiriquement : le document Firestore reste `status: 'planned'`
// même après 3s d'attente. Reste ouvert — décision produit à prendre avant
// fix (flush immédiat sans debounce sur cette action terminale ? attendre la
// sauvegarde avant de naviguer ?), voir DEV_LOG session 200.
test.fail('créer un prélèvement — marquer un point planifié comme réalisé', async ({ page }) => {
  await loginAsTech(page)

  await page.goto('/missions/e2e-client-1/plan/e2e-plan-ponctuel/sampling/e2e-sampling-ponctuel')
  await expect(page.getByText('Client E2E')).toBeVisible()

  await page.getByRole('button', { name: 'Terminer la mission' }).click()

  // Retour à la page précédente après validation
  await page.waitForURL((url) => !url.pathname.includes('/sampling/'), { timeout: 10_000 })

  // Laisse le temps au debounce de 800ms de se déclencher — n'empêche pas le
  // bug ci-dessus (le timer est déjà mort au moment du navigate(-1)).
  await page.waitForTimeout(1_500)

  // Rouvrir la fiche pour vérifier la persistance du statut
  await page.goto('/missions/e2e-client-1/plan/e2e-plan-ponctuel/sampling/e2e-sampling-ponctuel')
  await expect(page.getByText('Réalisé').first()).toBeVisible()
})
