import { useClientsListener } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useUsersListener } from '@/hooks/useUsers'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useEvenementsListener } from '@/hooks/useEvenements'
import { useTodosListener } from '@/hooks/useTodos'
import { useChatNotificationListener } from '@/hooks/useChatNotification'

/**
 * Monte une seule fois les listeners Firestore des collections globales
 * (partagées par plusieurs pages). Rendu sous <RequireAuth> dans AppLayout :
 * les listeners restent actifs pendant toute la session et ne se démontent
 * qu'au logout. Les pages lisent les données depuis les stores Zustand.
 *
 * But : éviter le remontage des listeners à chaque navigation, qui refacturait
 * une relecture complète de chaque collection (voir project_firebase_plan_costs).
 *
 * Les listeners mono-page (demandes, tuyaux, pointsRejet, preleveurs) et scopés
 * par id (visites, clientData) restent volontairement locaux à leur page.
 */
export default function GlobalListeners() {
  useClientsListener()
  useEquipementsListener()
  useUsersListener()
  useVerificationsListener()
  useMaintenancesListener()
  useEvenementsListener()
  useTodosListener()
  useChatNotificationListener()
  return null
}
