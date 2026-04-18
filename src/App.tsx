import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from '@/hooks/useAuth'
import RequireAuth from '@/components/layout/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import MissionsPage from '@/pages/MissionsPage'
import ClientPage from '@/pages/ClientPage'
import PlanPage from '@/pages/PlanPage'
import ComptePage from '@/pages/ComptePage'
import MaterielPage from '@/pages/MaterielPage'
import EquipementPage from '@/pages/EquipementPage'
import MerologiePage from '@/pages/MerologiePage'
import VerificationPage from '@/pages/VerificationPage'
import MaintenancesPage from '@/pages/MaintenancesPage'
import MaintenancePage from '@/pages/MaintenancePage'
import PlanningPage from '@/pages/PlanningPage'

function AppRoutes() {
  useAuthInit()

  return (
    <Routes>
      {/* Publique */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protégées */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/"                                  element={<DashboardPage />} />
        <Route path="/missions"                          element={<MissionsPage />} />
        <Route path="/missions/:clientId"                element={<ClientPage />} />
        <Route path="/missions/:clientId/plan/:planId"   element={<PlanPage />} />
        <Route path="/materiel"                          element={<MaterielPage />} />
        <Route path="/materiel/:equipementId"            element={<EquipementPage />} />
        <Route path="/metrologie"                        element={<MerologiePage />} />
        <Route path="/metrologie/:verificationId"        element={<VerificationPage />} />
        <Route path="/maintenances"                      element={<MaintenancesPage />} />
        <Route path="/maintenances/:maintenanceId"       element={<MaintenancePage />} />
        <Route path="/planning"                          element={<PlanningPage />} />
        <Route path="/compte"                            element={<ComptePage />} />
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
