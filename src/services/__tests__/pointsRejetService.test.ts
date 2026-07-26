import { vi, describe, it, expect, beforeEach } from 'vitest'
import {
  createPointRejet, updatePointRejet, deletePointRejet, importBilans,
} from '../pointsRejetService'
import { useSyncStore } from '@/stores/syncStore'
import { addDoc, updateDoc, deleteDoc, doc, collection, writeBatch } from 'firebase/firestore'
import type { BilanRejet, PointRejet } from '@/types'

const batch = {
  update: vi.fn(),
  set: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ path: 'points-rejet' })),
  doc: vi.fn(() => ({ path: 'points-rejet/p1' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-point' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  writeBatch: vi.fn(() => batch),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

const bilan = (date: string): BilanRejet => ({ date } as unknown as BilanRejet)

describe('pointsRejetService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    batch.commit.mockResolvedValue(undefined)
  })

  describe('createPointRejet', () => {
    it('crée un point avec bilans vide et retourne son id', async () => {
      const id = await createPointRejet('Station A', 'STA', 'user-1')

      expect(id).toBe('new-point')
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'points-rejet')
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nom: 'Station A',
          code: 'STA',
          bilans: [],
          createdBy: 'user-1',
          updatedBy: 'user-1',
        }),
      )
    })
  })

  describe('updatePointRejet', () => {
    it('met à jour les champs fournis avec updatedBy/updatedAt', async () => {
      await updatePointRejet('p1', { nom: 'Station B' }, 'user-1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'points-rejet', 'p1')
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ nom: 'Station B', updatedBy: 'user-1', updatedAt: 'SERVER_TS' }),
      )
    })
  })

  describe('deletePointRejet', () => {
    it('supprime le document ciblé', async () => {
      await deletePointRejet('p1')

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'points-rejet', 'p1')
      expect(deleteDoc).toHaveBeenCalled()
    })
  })

  describe('importBilans', () => {
    it('crée un nouveau point quand le nom est inconnu', async () => {
      const res = await importBilans(
        [{ point: 'Station Neuve', bilan: bilan('2026-01-01') }],
        [],
        'user-1',
      )

      expect(res).toEqual({ created: 1, updated: 0, added: 1 })
      expect(batch.set).toHaveBeenCalledTimes(1)
      expect(batch.update).not.toHaveBeenCalled()
      expect(batch.commit).toHaveBeenCalled()
    })

    it('enrichit un point existant et ignore les bilans en doublon de date', async () => {
      const existing: PointRejet[] = [
        { id: 'p1', nom: 'Station A', code: '', bilans: [bilan('2026-01-01')] } as unknown as PointRejet,
      ]
      const res = await importBilans(
        [
          { point: 'Station A', bilan: bilan('2026-01-01') }, // doublon → ignoré
          { point: 'Station A', bilan: bilan('2026-01-02') }, // nouveau
        ],
        existing,
        'user-1',
      )

      expect(res).toEqual({ created: 0, updated: 1, added: 1 })
      expect(batch.update).toHaveBeenCalledTimes(1)
      const [, payload] = batch.update.mock.calls[0] as [unknown, { bilans: BilanRejet[] }]
      expect(payload.bilans).toHaveLength(2)
    })

    it('matche le point par nom insensible à la casse et aux espaces', async () => {
      const existing: PointRejet[] = [
        { id: 'p1', nom: 'Station A', code: '', bilans: [] } as unknown as PointRejet,
      ]
      const res = await importBilans(
        [{ point: '  station a  ', bilan: bilan('2026-01-02') }],
        existing,
        'user-1',
      )

      expect(res.updated).toBe(1)
      expect(res.created).toBe(0)
    })

    it('déduplique les dates dupliquées au sein d\'un nouveau point', async () => {
      const res = await importBilans(
        [
          { point: 'Station Neuve', bilan: bilan('2026-01-01') },
          { point: 'Station Neuve', bilan: bilan('2026-01-01') },
        ],
        [],
        'user-1',
      )

      expect(res).toEqual({ created: 1, updated: 0, added: 1 })
      const [, payload] = batch.set.mock.calls[0] as [unknown, { bilans: BilanRejet[] }]
      expect(payload.bilans).toHaveLength(1)
    })

    it('n\'incrémente pas updated si tous les bilans sont des doublons', async () => {
      const existing: PointRejet[] = [
        { id: 'p1', nom: 'Station A', code: '', bilans: [bilan('2026-01-01')] } as unknown as PointRejet,
      ]
      const res = await importBilans(
        [{ point: 'Station A', bilan: bilan('2026-01-01') }],
        existing,
        'user-1',
      )

      expect(res).toEqual({ created: 0, updated: 0, added: 0 })
      expect(batch.update).not.toHaveBeenCalled()
    })

    it('laisse pendingWrites à 0 après commit (trackWrite)', async () => {
      await importBilans([{ point: 'Station Neuve', bilan: bilan('2026-01-01') }], [], 'user-1')
      expect(useSyncStore.getState().pendingWrites).toBe(0)
    })
  })

  it('writeBatch est appelé une seule fois par import', async () => {
    await importBilans([{ point: 'X', bilan: bilan('2026-01-01') }], [], 'user-1')
    expect(writeBatch).toHaveBeenCalledTimes(1)
  })
})
