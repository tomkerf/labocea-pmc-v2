import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from '@/hooks/useAuth'
import RequireAuth from '@/components/layout/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'

// ── Chargement différé des pages (code-splitting) ───────────
// LoginPage reste eager — elle est la première page affichée sans auth
import LoginPage from '@/pages/LoginPage'

const DashboardPage     = lazy(() => import('@/pages/DashboardPage'))
const MissionsPage      = lazy(() => import('@/pages/MissionsPage'))
const ClientPage        = lazy(() => import('@/pages/ClientPage'))
const PlanPage          = lazy(() => import('@/pages/PlanPage'))
const MissionDetailPage = lazy(() => import('@/pages/MissionDetailPage'))
const MaterielPage      = lazy(() => import('@/pages/MaterielPage'))
const EquipementPage    = lazy(() => import('@/pages/EquipementPage'))
const MerologiePage     = lazy(() => import('@/pages/MerologiePage'))
const VerificationPage  = lazy(() => import('@/pages/VerificationPage'))
const MaintenancesPage  = lazy(() => import('@/pages/MaintenancesPage'))
const MaintenancePage   = lazy(() => import('@/pages/MaintenancePage'))
const PlanningPage      = lazy(() => import('@/pages/PlanningPage'))
const DemandesPage      = lazy(() => import('@/pages/DemandesPage'))
const ComptePage        = lazy(() => import('@/pages/ComptePage'))
const AdminPage         = lazy(() => import('@/pages/AdminPage'))

/** Spinner affiché pendant le chargement d'un chunk */
function PageSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
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
          <Suspense fallback={<PageSpinner />}><MerologiePage /></Suspense>
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
        <Route path="/planning" element={
          <Suspense fallback={<PageSpinner />}><PlanningPage /></Suspense>
        } />
        <Route path="/demandes" element={
          <Suspense fallback={<PageSpinner />}><DemandesPage /></Suspense>
        } />
        <Route path="/compte" element={
          <Suspense fallback={<PageSpinner />}><ComptePage /></Suspense>
        } />
        <Route path="/admin" element={
          <Suspense fallback={<PageSpinner />}><AdminPage /></Suspense>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/missions" replace />} />
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
