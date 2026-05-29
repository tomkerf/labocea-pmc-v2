import { User, Key, MapPin, FileText } from 'lucide-react'
import type { TerrainType } from '@/types'

export const TYPE_CONFIG: Record<TerrainType, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  contact: { label: 'Contact',  Icon: User,     color: 'var(--color-accent)',   bg: 'var(--color-accent-light)'  },
  acces:   { label: 'Accès',    Icon: Key,      color: 'var(--color-warning)',  bg: 'var(--color-warning-light)' },
  site:    { label: 'Site',     Icon: MapPin,   color: 'var(--color-success)',  bg: 'var(--color-success-light)' },
  note:    { label: 'Note',     Icon: FileText, color: 'var(--color-neutral)',  bg: 'var(--color-bg-tertiary)'   },
}
