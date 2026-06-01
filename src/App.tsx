import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from '@/hooks/useAuth'
import RequireAuth from '@/components/layout/RequireAuth'
import RequireAdmin from '@/components/layout/RequireAdmin'
import AppLayout from '@/components/layout/AppLayout'

// ── Chargement différé des pages (code-splitting) ───────────
// LoginPage reste eager — elle est la première page affichée sans auth
import LoginPage from '@/pages/LoginPage'

const DashboardPage     = lazy(() => import('@/pages/DashboardPage'))
const MissionsPage      = lazy(() => import('@/pages/MissionsPage'))
const ClientPage        = lazy(() => import('@/pages/ClientPage'))
const PlanPage          = lazy(() => import('@/pages/PlanPage'))
const PointMesureFichePage = lazy(() => import('@/pages/PointMesureFichePage'))
const MissionDetailPage = lazy(() => import('@/pages/MissionDetailPage'))
const MaterielPage      = lazy(() => import('@/pages/MaterielPage'))
const EquipementPage    = lazy(() => import('@/pages/EquipementPage'))
const MetrologiePage    = lazy(() => import('@/pages/MetrologiePage'))
const VerificationPage  = lazy(() => import('@/pages/VerificationPage'))
const MaintenancesPage  = lazy(() => import('@/pages/MaintenancesPage'))
const MaintenancePage   = lazy(() => import('@/pages/MaintenancePage'))
const RapportsPage      = lazy(() => import('@/pages/RapportsPage'))
const PlanningPage       = lazy(() => import('@/pages/PlanningPage'))
const TourneePage        = lazy(() => import('@/pages/TourneePage'))
const DemandesPage      = lazy(() => import('@/pages/DemandesPage'))
const ComptePage        = lazy(() => import('@/pages/ComptePage'))
const AdminPage             = lazy(() => import('@/pages/AdminPage'))
const AsservissementPage    = lazy(() => import('@/pages/AsservissementPage'))
const InfosPage             = lazy(() => import('@/pages/InfosPage'))
const TuyauxPage            = lazy(() => import('@/pages/TuyauxPage'))
const AidePage              = lazy(() => import('@/pages/AidePage'))
const VisiteFormPage        = lazy(() => import('@/pages/VisiteFormPage'))
const TodosPage             = lazy(() => import('@/pages/TodosPage'))

/** Spinner affiché pendant le chargement d'un chunk */
function PageSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="size-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
    </div>
  )
}

function AppRoutes() {
  useAuthInit()

  return (
    <Routes>
      {/* Publique */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protégées */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={
          <Suspense fallback={<PageSpinner />}><DashboardPage /></Suspense>
        } />
        <Route path="/missions" element={
          <Suspense fallback={<PageSpinner />}><MissionsPage /></Suspense>
        } />
        <Route path="/missions/:clientId" element={
          <Suspense fallback={<PageSpinner />}><ClientPage /></Suspense>
        } />
        <Route path="/missions/:clientId/plan/:planId" element={
          <Suspense fallback={<PageSpinner />}><PlanPage /></Suspense>
        } />
        <Route path="/missions/:clientId/plan/:planId/fiche" element={
          <Suspense fallback={<PageSpinner />}><PointMesureFichePage /></Suspense>
        } />
        <Route path="/missions/:clientId/plan/:planId/sampling/:samplingId" element={
          <Suspense fallback={<PageSpinner />}><MissionDetailPage /></Suspense>
        } />
        <Route path="/materiel" element={
          <Suspense fallback={<PageSpinner />}><MaterielPage /></Suspense>
        } />
        <Route path="/materiel/:equipementId" element={
          <Suspense fallback={<PageSpinner />}><EquipementPage /></Suspense>
        } />
        <Route path="/metrologie" element={
          <Suspense fallback={<PageSpinner />}><MetrologiePage /></Suspense>
        } />
        <Route path="/metrologie/:verificationId" element={
          <Suspense fallback={<PageSpinner />}><VerificationPage /></Suspense>
        } />
        <Route path="/maintenances" element={
          <Suspense fallback={<PageSpinner />}><MaintenancesPage /></Suspense>
        } />
        <Route path="/maintenances/:maintenanceId" element={
          <Suspense fallback={<PageSpinner />}><MaintenancePage /></Suspense>
        } />
        <Route path="/rapports" element={
          <Suspense fallback={<PageSpinner />}><RapportsPage /></Suspense>
        } />
        <Route path="/planning" element={
          <Suspense fallback={<PageSpinner />}><PlanningPage /></Suspense>
        } />
        <Route path="/tournee" element={
          <Suspense fallback={<PageSpinner />}><TourneePage /></Suspense>
        } />
        <Route path="/demandes" element={
          <Suspense fallback={<PageSpinner />}><DemandesPage /></Suspense>
        } />
        <Route path="/visites/nouveau" element={
          <Suspense fallback={<PageSpinner />}><VisiteFormPage /></Suspense>
        } />
        <Route path="/visites/:visiteId" element={
          <Suspense fallback={<PageSpinner />}><VisiteFormPage /></Suspense>
        } />
        <Route path="/compte" element={
          <Suspense fallback={<PageSpinner />}><ComptePage /></Suspense>
        } />
        <Route path="/todos" element={
          <Suspense fallback={<PageSpinner />}><TodosPage /></Suspense>
        } />
        <Route path="/admin" element={
          <RequireAdmin><Suspense fallback={<PageSpinner />}><AdminPage /></Suspense></RequireAdmin>
        } />
        <Route path="/outils/asservissement" element={
          <Suspense fallback={<PageSpinner />}><AsservissementPage /></Suspense>
        } />
        <Route path="/outils/tuyaux" element={
          <Suspense fallback={<PageSpinner />}><TuyauxPage /></Suspense>
        } />
        <Route path="/infos" element={
          <Suspense fallback={<PageSpinner />}><InfosPage /></Suspense>
        } />
        <Route path="/aide" element={
          <Suspense fallback={<PageSpinner />}><AidePage /></Suspense>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
