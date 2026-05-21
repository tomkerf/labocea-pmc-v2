import { useState, useCallback, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { addDays } from '@/lib/planningUtils'

interface UsePlanningDragProps {
  setSelectedDate: Dispatch<SetStateAction<Date>>
  goToDay: (dateStr: string) => void
  setDragModal: (v: { dateDebut: string; dateFin: string } | null) => void
}

export function usePlanningDrag({ setSelectedDate, goToDay, setDragModal }: UsePlanningDragProps) {
  // ── Swipe vue Jour (mobile) ─────────────────────────────
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) setSelectedDate(d => addDays(d, 1))
      else        setSelectedDate(d => addDays(d, -1))
    }
    swipeStartX.current = null
    swipeStartY.current = null
  }, [setSelectedDate])

  // ── Drag-to-create ──────────────────────────────────────
  const [dragStart,  setDragStart]  = useState<string | null>(null)
  const [dragEnd,    setDragEnd]    = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function dragRangeMin() { return dragStart && dragEnd ? (dragStart < dragEnd ? dragStart : dragEnd) : null }
  function dragRangeMax() { return dragStart && dragEnd ? (dragStart > dragEnd ? dragStart : dragEnd) : null }

  function isInDrag(dateStr: string): boolean {
    const mn = dragRangeMin(); const mx = dragRangeMax()
    return !!(isDragging && mn && mx && dateStr >= mn && dateStr <= mx)
  }

  function handleDragMouseDown(e: React.MouseEvent, dateStr: string) {
    if (e.button !== 0) return
    e.preventDefault()
    setDragStart(dateStr)
    setDragEnd(dateStr)
    setIsDragging(true)
  }

  function handleDragMouseEnter(dateStr: string) {
    if (isDragging) setDragEnd(dateStr)
  }

  function handleDragMouseUp(e: React.MouseEvent) {
    if (!isDragging || !dragStart || !dragEnd) return
    e.stopPropagation()
    const mn = dragRangeMin()!
    const mx = dragRangeMax()!
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    if (mn === mx) { goToDay(mn); return }
    setDragModal({ dateDebut: mn, dateFin: mx })
  }

  return {
    // Swipe
    handleTouchStart, handleTouchEnd,
    // Drag state
    isDragging, dragStart, dragEnd,
    setIsDragging, setDragStart, setDragEnd,
    // Drag handlers
    isInDrag, handleDragMouseDown, handleDragMouseEnter, handleDragMouseUp,
  }
}
