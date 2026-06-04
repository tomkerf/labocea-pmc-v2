import { User, Key, MapPin, FileText } from 'lucide-react'
import type { TerrainType } from '@/types'
import { COLORS } from '@/lib/constants'


export const TYPE_CONFIG: Record<TerrainType, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  contact: { label: 'Contact',  Icon: User,     color: COLORS.ACCENT,   bg: 'var(--color-accent-light)'  },
  acces:   { label: 'Accès',    Icon: Key,      color: COLORS.WARNING,  bg: 'var(--color-warning-light)' },
  site:    { label: 'Site',     Icon: MapPin,   color: COLORS.SUCCESS,  bg: 'var(--color-success-light)' },
  note:    { label: 'Note',     Icon: FileText, color: 'var(--color-neutral)',  bg: COLORS.BG_TERTIARY   },
}
