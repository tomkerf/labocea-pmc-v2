import DayView           from '@/components/planning/DayView'
import WeekView          from '@/components/planning/WeekView'
import MonthView         from '@/components/planning/MonthView'
import MapView           from '@/components/planning/MapView'
import YearMatrixView    from '@/components/planning/YearMatrixView'
import PeriodListView    from '@/components/planning/PeriodListView'
import WorkloadMatrixView from '@/components/planning/WorkloadMatrixView'
import {
  type PlanningEvent, type ViewMode,
  type BilanGroup, type AllDayItem,
} from '@/lib/planningUtils'
import type { Client } from '@/types/index'
import type { Preleveur } from '@/stores/preleveursStore'

interface PlanningViewRendererProps {
  viewMode:     ViewMode
  selectedDate: Date
  today:        Date
  eventsByDate: Record<string, PlanningEvent[]>
  filterTech:   string
  allowedTechs: string[]
  filterRetard: boolean
  showRain:     boolean
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
  // DayView
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchEnd:   (e: React.TouchEvent) => void
  setSelectedDay:   (v: string | null) => void
  // MapView
  preleveurs:   Preleveur[]
  // YearMatrixView
  filterSite:   string
  clients:      Client[]
  // WeekView / MonthView
  weekDays:     Date[]
  monthGrid:    (Date | null)[]
  holidays:     Record<string, string>
  bilanBand:    BilanGroup[][]
  allDayItems:  AllDayItem[]
  isDragging:   boolean
  dragStart:    string | null
  dragEnd:      string | null
  handleDragMouseDown:  (e: React.MouseEvent, dateStr: string) => void
  handleDragMouseEnter: (dateStr: string) => void
  handleDragMouseUp:    (e: React.MouseEvent) => void
  setIsDragging:  (v: boolean) => void
  setDragStart:   (v: string | null) => void
  setDragEnd:     (v: string | null) => void
  goToDay:        (dateStr: string) => void
  setCtxMenu:     (v: { dateStr: string; x: number; y: number } | null) => void
  prev:           () => void
  next:           () => void
  // PeriodListView
  periodList:     { date: Date; dateStr: string; events: PlanningEvent[] }[]
  goToday:        () => void
}

export default function PlanningViewRenderer({
  viewMode, selectedDate, today, eventsByDate,
  filterTech, allowedTechs, filterRetard, showRain, handleSelectEvent,
  handleTouchStart, handleTouchEnd, setSelectedDay,
  preleveurs, filterSite, clients,
  weekDays, monthGrid, holidays, bilanBand, allDayItems,
  isDragging, dragStart, dragEnd,
  handleDragMouseDown, handleDragMouseEnter, handleDragMouseUp,
  setIsDragging, setDragStart, setDragEnd,
  goToDay, setCtxMenu, prev, next,
  periodList, goToday,
}: PlanningViewRendererProps) {
  return (
    <>
      {viewMode === 'jour' && (
        <DayView
          selectedDate={selectedDate}
          today={today}
          eventsByDate={eventsByDate}
          filterTech={filterTech}
          allowedTechs={allowedTechs}
          filterRetard={filterRetard}
          showRain={showRain}
          handleTouchStart={handleTouchStart}
          handleTouchEnd={handleTouchEnd}
          handleSelectEvent={handleSelectEvent}
          setSelectedDay={setSelectedDay}
        />
      )}

      {viewMode === 'carte' && (
        <MapView
          selectedDate={selectedDate}
          today={today}
          eventsByDate={eventsByDate}
          filterTech={filterTech}
          allowedTechs={allowedTechs}
          filterRetard={filterRetard}
          preleveurs={preleveurs}
          handleSelectEvent={handleSelectEvent}
        />
      )}

      {viewMode === 'annee' && (
        <YearMatrixView
          clients={clients}
          year={selectedDate.getFullYear()}
          filterTech={filterTech}
          filterSite={filterSite}
          preleveurs={preleveurs}
        />
      )}

      {viewMode === 'charge' && (
        <WorkloadMatrixView
          clients={clients}
          year={selectedDate.getFullYear()}
          filterTech={filterTech}
          filterSite={filterSite}
          preleveurs={preleveurs}
        />
      )}

      {(viewMode === 'semaine' || viewMode === 'mois') && (
        <>
          {/* Desktop : grille calendrier */}
          <div className="hidden md:flex flex-col flex-1 overflow-hidden">
            {viewMode === 'semaine' && (
              <WeekView
                weekDays={weekDays}
                today={today}
                holidays={holidays}
                eventsByDate={eventsByDate}
                bilanBand={bilanBand}
                allDayItems={allDayItems}
                filterTech={filterTech}
                allowedTechs={allowedTechs}
                filterRetard={filterRetard}
                showRain={showRain}
                isDragging={isDragging}
                dragStart={dragStart}
                dragEnd={dragEnd}
                handleDragMouseDown={handleDragMouseDown}
                handleDragMouseEnter={handleDragMouseEnter}
                handleDragMouseUp={handleDragMouseUp}
                setIsDragging={setIsDragging}
                setDragStart={setDragStart}
                setDragEnd={setDragEnd}
                handleSelectEvent={handleSelectEvent}
                goToDay={goToDay}
                setCtxMenu={setCtxMenu}
              />
            )}
            {viewMode === 'mois' && (
              <MonthView
                monthGrid={monthGrid}
                today={today}
                holidays={holidays}
                eventsByDate={eventsByDate}
                filterTech={filterTech}
                allowedTechs={allowedTechs}
                filterRetard={filterRetard}
                showRain={showRain}
                isDragging={isDragging}
                dragStart={dragStart}
                dragEnd={dragEnd}
                handleDragMouseDown={handleDragMouseDown}
                handleDragMouseEnter={handleDragMouseEnter}
                handleDragMouseUp={handleDragMouseUp}
                setIsDragging={setIsDragging}
                setDragStart={setDragStart}
                setDragEnd={setDragEnd}
                handleSelectEvent={handleSelectEvent}
                goToDay={goToDay}
                setCtxMenu={setCtxMenu}
                prev={prev}
                next={next}
              />
            )}
          </div>

          {/* Mobile : liste verticale */}
          <div className="md:hidden flex-1 overflow-y-auto">
            <PeriodListView
              periodList={periodList}
              today={today}
              filterRetard={filterRetard}
              goToday={goToday}
              goToDay={goToDay}
              handleSelectEvent={handleSelectEvent}
            />
          </div>
        </>
      )}
    </>
  )
}
