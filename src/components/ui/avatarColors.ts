export const AVATAR_COLORS = [
  { id: 'red',    value: '#FF3B30', label: 'Rouge',   accentLight: '#FFEEED' },
  { id: 'orange', value: '#FF9F0A', label: 'Orange',  accentLight: '#FFF4E3' },
  { id: 'yellow', value: '#FFCC00', label: 'Jaune',   accentLight: '#FFFBE6' },
  { id: 'green',  value: '#34C759', label: 'Vert',    accentLight: '#EAF8EE' },
  { id: 'mint',   value: '#00C7BE', label: 'Menthe',  accentLight: '#E0F7F5' },
  { id: 'teal',   value: '#30B0C7', label: 'Turquoise', accentLight: '#E3F5F8' },
  { id: 'cyan',   value: '#32ADE6', label: 'Cyan',    accentLight: '#E5F5FD' },
  { id: 'blue',   value: '#0071E3', label: 'Bleu',    accentLight: '#E8F1FB' },
  { id: 'indigo', value: '#5856D6', label: 'Indigo',  accentLight: '#EEEEF9' },
  { id: 'purple', value: '#AF52DE', label: 'Violet',  accentLight: '#F4EEFF' },
  { id: 'pink',   value: '#FF2D55', label: 'Rose',    accentLight: '#FFE0EA' },
  { id: 'brown',  value: '#A2845E', label: 'Marron',  accentLight: '#F5EDE4' },
  { id: 'gray',   value: '#636366', label: 'Gris',    accentLight: '#EEEEEF' },
  { id: 'slate',  value: '#3A6073', label: 'Ardoise', accentLight: '#E6EDF1' },
]

export const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0].value

export function getAvatarColor(color?: string): string {
  return color ?? DEFAULT_AVATAR_COLOR
}
