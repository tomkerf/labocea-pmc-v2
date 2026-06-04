import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useAuthStore, selectInitiales, selectUid, selectRole } from '@/stores/authStore'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { saveClient } from '@/services/clientService'
import { localISO } from '@/lib/dashboardUtils'
import type { Client, Plan, Sampling, NappeType } from '@/types'

import { TourneeItem } from '@/components/tournee/TourneeItem'
import type { TourneeItemData } from '@/components/tournee/TourneeItem'
import { SaisieRapideModal } from '@/components/tournee/SaisieRapideModal'
import type { SaisieRapideData } from '@/components/tournee/SaisieRapideModal'
import { TourneeFinEcran } from '@/components/tournee/TourneeFinEcran'
import type { TourneeFinItem } from '@/components/tournee/TourneeFinEcran'

type LocalStatus = 'todo' | 'done' | 'non_effectue' | 'reporte'

interface ModalState {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  nature: string
  initialStatus: 'done' | 'non_effectue' | 'reporte'
  hideRealise?: boolean
}

export default function TourneePage() {
  const navigate    = useNavigate()
  const initiales   = useAuthStore(selectInitiales)
  const uid         = useAuthStore(selectUid)
  const role        = useAuthStore(selectRole)
  const isGeneraliste = role === 'charge_mission' || role === 'admin'

  const { clients }       = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { verifications } = useMetrologieStore()
  const { evenements }    = useEvenementsStore()
  const { maintenances }  = useMaintenancesStore()

  const { jourItems } = useDashboardStats({
    clients, verifications, equipements, evenements, maintenances,
    todos: [], uid, initiales, isGeneraliste,
  })

  // Construire TourneeItemData depuis jourItems (sampling uniquement)
  const tourneeItems = useMemo((): TourneeItemData[] => {
    return jourItems
      .flatMap(i => i.kind === 'sampling' ? [i] : [])
      .map(i => {
        const ev = i.modalEvent
        const client = clients.find((c: Client) => c.id === ev.clientId)
        const plan   = client?.plans.find((p: Plan) => p.id === ev.planId)
        const s      = plan?.samplings.find((sa: Sampling) => sa.id === ev.samplingId)
        return {
          samplingId: ev.samplingId ?? '',
          clientId:   ev.clientId  ?? '',
          planId:     ev.planId    ?? '',
          clientNom:  i.title,
          siteNom:    plan?.siteNom ?? '',
          planNom:    plan?.nom     ?? '',
          time:       i.time,
          meteo:      'meteo' in i ? (i.meteo as string) : '',
          nature:     plan?.nature  ?? '',
          lat:        plan?.lat     ?? '',
          lng:        plan?.lng     ?? '',
          status:     (s?.status === 'done' ? 'done' : s?.status === 'non_effectue' ? 'non_effectue' : 'todo') as TourneeItemData['status'],
          motif:      s?.motif ?? '',
          isJ1Bilan24: i.isJ1Bilan24,
        }
      })
      .sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time)
        if (a.time) return -1
        if (b.time) return 1
        return 0
      })
  }, [jourItems, clients])

  const [localStatuses, setLocalStatuses] = useState<Map<string, LocalStatus>>(() => {
    const m = new Map<string, LocalStatus>()
    tourneeItems.forEach(i => m.set(i.samplingId, i.status))
    return m
  })

  const [modal, setModal] = useState<ModalState | null>(null)

  const allDone = tourneeItems.length > 0 && tourneeItems.every(i => {
    const s = localStatuses.get(i.samplingId) ?? i.status
    return s === 'done' || s === 'non_effectue' || s === 'reporte'
  })

  const doneCount = tourneeItems.filter(i => {
    const s = localStatuses.get(i.samplingId) ?? i.status
    return s === 'done' || s === 'non_effectue' || s === 'reporte'
  }).length

  function handleAction(samplingId: string, action: 'done' | 'non_effectue' | 'reporter') {
    const item = tourneeItems.find(i => i.samplingId === samplingId)
    if (!item) return
    if (action === 'reporter') {
      setModal({
        samplingId,
        clientId: item.clientId,
        planId:   item.planId,
        clientNom: item.clientNom,
        siteNom:  item.siteNom,
        nature:   item.nature,
        initialStatus: 'reporte',
        hideRealise: true,
      })
      return
    }
    setModal({
      samplingId,
      clientId: item.clientId,
      planId:   item.planId,
      clientNom: item.clientNom,
      siteNom:  item.siteNom,
      nature:   item.nature,
      initialStatus: action,
      hideRealise: item.isJ1Bilan24 ? true : undefined,
    })
  }

  const handleConfirm = useCallback(async (data: SaisieRapideData) => {
    if (!modal || !uid) return
    const client = clients.find((c: Client) => c.id === modal.clientId)
    if (!client) return

    const d = new Date(data.doneDate + 'T12:00:00')
    const updatedClient: Client = {
      ...client,
      plans: client.plans.map((plan: Plan) => plan.id !== modal.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) => {
          if (s.id !== modal.samplingId) return s
          if (data.status === 'done') {
            return {
              ...s,
              status:   'done',
              doneDate: localISO(d),
              nappe:    data.nappe as NappeType,
              comment:  data.commentaire,
            }
          }
          if (data.status === 'reporte') {
            const nd = new Date(data.newPlannedDate + 'T12:00:00')
            return {
              ...s,
              status:       'planned',
              plannedMonth: nd.getMonth(),
              plannedDay:   nd.getDate(),
            }
          }
          return {
            ...s,
            status: 'non_effectue',
            motif:  data.motif,
          }
        }),
      }),
    }
    try {
      await saveClient(updatedClient, uid)
      setLocalStatuses(prev => new Map(prev).set(modal.samplingId, data.status))
      setModal(null)
    } catch {
      // Fail silencieux — Firestore a son propre retry, l'utilisateur peut réessayer
      setModal(null)
    }
  }, [modal, uid, clients])

  // Construire les items pour l'écran de fin
  const finItems: TourneeFinItem[] = tourneeItems.map(i => ({
    samplingId: i.samplingId,
    clientNom:  i.clientNom,
    siteNom:    i.siteNom,
    status:     (localStatuses.get(i.samplingId) ?? i.status) as 'done' | 'non_effectue',
    motif:      i.motif,
  }))

  const today = new Date()
  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (allDone) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <TourneeFinEcran items={finItems} onRetour={() => navigate('/')} />
      </div>
    )
  }

  return (
    <div className="p-6 pb-10 max-w-xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(-1)} className="p-1 -ml-1" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Tournée du jour</h1>
          <p className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
            {dateLabel} · {tourneeItems.length} site{tourneeItems.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{doneCount}/{tourneeItems.length} traité{doneCount > 1 ? 's' : ''}</span>
          <span>{Math.round((doneCount / Math.max(tourneeItems.length, 1)) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--color-border)' }}>
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${(doneCount / Math.max(tourneeItems.length, 1)) * 100}%`, background: 'var(--color-accent)' }} />
        </div>
      </div>

      {/* Liste */}
      {tourneeItems.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun prélèvement prévu aujourd'hui.
        </p>
      ) : (
        tourneeItems.map(item => (
          <TourneeItem
            key={item.samplingId}
            item={{ ...item, status: localStatuses.get(item.samplingId) ?? item.status }}
            onAction={handleAction}
          />
        ))
      )}

      {/* Modale */}
      {modal && (
        <SaisieRapideModal
          clientNom={modal.clientNom}
          siteNom={modal.siteNom}
          nature={modal.nature}
          initialStatus={modal.initialStatus}
          hideRealise={modal.hideRealise}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
