export const AVATAR_COLORS = [
  { id: 'blue',   value: '#0071E3', label: 'Bleu',    accentLight: '#E8F1FB' },
  { id: 'teal',   value: '#30B0C7', label: 'Cyan',    accentLight: '#E3F5F8' },
  { id: 'mint',   value: '#00C7BE', label: 'Menthe',  accentLight: '#E0F7F5' },
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
