export const AVATAR_COLORS = [
  { id: 'red',    value: '#DC2626', label: 'Rouge',   accentLight: '#FEF2F2', text: '#991B1B' },
  { id: 'orange', value: '#D97706', label: 'Orange',  accentLight: '#FFFBEB', text: '#92400E' },
  { id: 'yellow', value: '#CA8A04', label: 'Jaune',   accentLight: '#FEFCE8', text: '#854D0E' },
  { id: 'green',  value: '#16A34A', label: 'Vert',    accentLight: '#F0FDF4', text: '#14532D' },
  { id: 'mint',   value: '#059669', label: 'Menthe',  accentLight: '#F0FDF9', text: '#064E3B' },
  { id: 'teal',   value: '#0D9488', label: 'Turquoise', accentLight: '#F0FDFA', text: '#115E59' },
  { id: 'cyan',   value: '#0891B2', label: 'Cyan',    accentLight: '#ECFEFF', text: '#164E63' },
  { id: 'blue',   value: '#2563EB', label: 'Bleu',    accentLight: '#EFF6FF', text: '#1E40AF' },
  { id: 'indigo', value: '#4F46E5', label: 'Indigo',  accentLight: '#EEF2FF', text: '#3730A3' },
  { id: 'purple', value: '#9333EA', label: 'Violet',  accentLight: '#FAF5FF', text: '#6B21A8' },
  { id: 'pink',   value: '#DB2777', label: 'Rose',    accentLight: '#FDF2F8', text: '#9D174D' },
  { id: 'brown',  value: '#9A3412', label: 'Marron',  accentLight: '#FFF7ED', text: '#7C2D12' },
  { id: 'gray',   value: '#4B5563', label: 'Gris',    accentLight: '#F3F4F6', text: '#1F2937' },
  { id: 'slate',  value: '#475569', label: 'Ardoise', accentLight: '#F1F5F9', text: '#334155' },
]

const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0].value

export function getAvatarColor(color?: string): string {
  return color ?? DEFAULT_AVATAR_COLOR
}
