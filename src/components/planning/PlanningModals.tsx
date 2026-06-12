import DayModal          from '@/components/planning/DayModal'
import CellContextMenu   from '@/components/planning/CellContextMenu'
import GhostDetailModal  from '@/components/planning/GhostDetailModal'
import EventDetailModal  from '@/components/planning/EventDetailModal'
import DragCreateModal   from '@/components/planning/DragCreateModal'
import BilanMoisModal    from '@/components/planning/BilanMoisModal'
import {
  type PlanningEvent, type TechOption,
} from '@/lib/planningUtils'
import type { PoolItem } from '@/lib/planningUtils'
import type { Client, EvenementPersonnel, TypeEvenement } from '@/types/index'

interface PlanningModalsProps {
  // DayModal
  selectedDay:          string | null
  dayModalInitialTab:   'pool' | 'evt'
  poolSamplings:        PoolItem[]
  overduePool:          PoolItem[]
  uid:                  string | null
  initiales:            string
  holidays:             Record<string, string>
  handleValidatePool:   (item: PoolItem, date: string) => Promise<void>
  setSelectedDay:       (v: string | null) => void
  // CellContextMenu
  ctxMenu:              { dateStr: string; x: number; y: number } | null
  evenements:           EvenementPersonnel[]
  toggleRainDay:        (dateStr: string) => void
  setDayModalInitialTab:(v: 'pool' | 'evt') => void
  setCtxMenu:           (v: { dateStr: string; x: number; y: number } | null) => void
  // EventDetailModal
  eventDetail:          { event: PlanningEvent; dateStr: string } | null
  assignedEqIdsForDate: string[]
  techOptions:          TechOption[]
  handleCancelSampling: (event: PlanningEvent, reason: string) => Promise<void>
  handleMoveEvent:      (event: PlanningEvent, newDate: string, reason: string) => Promise<void>
  handleDeleteEvent:    (event: PlanningEvent) => void
  handleChangeTechnicien:   (event: PlanningEvent, initiales: string) => Promise<void>
  handleChangeEquipements:  (event: PlanningEvent, eqIds: string[]) => Promise<void>
  setEventDetail:       (v: { event: PlanningEvent; dateStr: string } | null) => void
  // GhostDetailModal
  ghostDetail:          { event: PlanningEvent; dateStr: string } | null
  setGhostDetail:       (v: { event: PlanningEvent; dateStr: string } | null) => void
  // DragCreateModal
  dragModal:            { dateDebut: string; dateFin: string } | null
  handleSaveEvenement:  (titre: string, type: TypeEvenement, dateDebut: string, dateFin: string, heure: string, notes: string) => Promise<void>
  setDragModal:         (v: { dateDebut: string; dateFin: string } | null) => void
  // BilanMoisModal
  showBilanMois:        boolean
  selectedDate:         Date
  clients:              Client[]
  setShowBilanMois:     (v: boolean) => void
}

export default function PlanningModals({
  selectedDay, dayModalInitialTab, poolSamplings, overduePool, uid, initiales,
  holidays, handleValidatePool, setSelectedDay,
  ctxMenu, evenements, toggleRainDay, setDayModalInitialTab, setCtxMenu,
  eventDetail, assignedEqIdsForDate, techOptions,
  handleCancelSampling, handleMoveEvent, handleDeleteEvent,
  handleChangeTechnicien, handleChangeEquipements, setEventDetail,
  ghostDetail, setGhostDetail,
  dragModal, handleSaveEvenement, setDragModal,
  showBilanMois, selectedDate, clients, setShowBilanMois,
}: PlanningModalsProps) {
  return (
    <>
      {selectedDay && (
        <DayModal
          key={selectedDay + dayModalInitialTab}
          dateStr={selectedDay}
          onClose={() => setSelectedDay(null)}
          pool={poolSamplings}
          overduePool={overduePool}
          uid={uid}
          initiales={initiales}
          onValidatePool={handleValidatePool}
          initialTab={dayModalInitialTab}
          holidays={holidays}
        />
      )}

      {ctxMenu && (
        <CellContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          holidayName={holidays[ctxMenu.dateStr]}
          hasRain={evenements.some(e => e.type === 'meteo' && e.date === ctxMenu.dateStr)}
          onToggleRain={() => toggleRainDay(ctxMenu.dateStr)}
          onPlanifier={() => { setDayModalInitialTab('pool'); setSelectedDay(ctxMenu.dateStr) }}
          onEvenement={() => { setDayModalInitialTab('evt'); setSelectedDay(ctxMenu.dateStr) }}
        />
      )}

      {eventDetail && (
        <EventDetailModal
          key={eventDetail.event.id}
          event={eventDetail.event}
          dateStr={eventDetail.dateStr}
          assignedEqIdsForDate={assignedEqIdsForDate}
          onClose={() => setEventDetail(null)}
          onCancel={handleCancelSampling}
          onMove={handleMoveEvent}
          onDelete={handleDeleteEvent}
          onChangeTech={handleChangeTechnicien}
          onChangeEquipements={handleChangeEquipements}
          techOptions={techOptions}
        />
      )}

      {ghostDetail && (
        <GhostDetailModal
          event={ghostDetail.event}
          onClose={() => setGhostDetail(null)}
        />
      )}

      {dragModal && (
        <DragCreateModal
          dateDebut={dragModal.dateDebut}
          dateFin={dragModal.dateFin}
          onClose={() => setDragModal(null)}
          onSave={handleSaveEvenement}
        />
      )}

      {showBilanMois && (
        <BilanMoisModal
          onClose={() => setShowBilanMois(false)}
          month={selectedDate.getMonth()}
          year={selectedDate.getFullYear()}
          clients={clients}
        />
      )}
    </>
  )
}
