export const AVATAR_COLORS = [
  { id: 'red',    value: '#FF3B30', label: 'Rouge',   accentLight: '#FFECEB', text: '#C91D13', gradient: 'linear-gradient(135deg, #FF6B6B, #FF3B30)' },
  { id: 'orange', value: '#FF9500', label: 'Orange',  accentLight: '#FFF3E0', text: '#B35900', gradient: 'linear-gradient(135deg, #FFB340, #FF9500)' },
  { id: 'yellow', value: '#FFCC00', label: 'Jaune',   accentLight: '#FFFDE6', text: '#806600', gradient: 'linear-gradient(135deg, #FFE066, #FFCC00)' },
  { id: 'green',  value: '#34C759', label: 'Vert',    accentLight: '#EAF8EE', text: '#1A8035', gradient: 'linear-gradient(135deg, #66E085, #34C759)' },
  { id: 'mint',   value: '#00C7B7', label: 'Menthe',  accentLight: '#E6FCFA', text: '#008A7E', gradient: 'linear-gradient(135deg, #4DE0D5, #00C7B7)' },
  { id: 'teal',   value: '#30B0C7', label: 'Turquoise', accentLight: '#E6F8FC', text: '#00788C', gradient: 'linear-gradient(135deg, #6CD0E0, #30B0C7)' },
  { id: 'cyan',   value: '#32ADE6', label: 'Cyan',    accentLight: '#E6F7FD', text: '#0077A8', gradient: 'linear-gradient(135deg, #6CDEF5, #32ADE6)' },
  { id: 'blue',   value: '#007AFF', label: 'Bleu',    accentLight: '#E6F0FA', text: '#004B9B', gradient: 'linear-gradient(135deg, #4DA3FF, #007AFF)' },
  { id: 'indigo', value: '#5856D6', label: 'Indigo',  accentLight: '#EEF2FF', text: '#3730A3', gradient: 'linear-gradient(135deg, #8C8AFF, #5856D6)' },
  { id: 'purple', value: '#AF52DE', label: 'Violet',  accentLight: '#F6ECFC', text: '#7A1FA8', gradient: 'linear-gradient(135deg, #D48CFF, #AF52DE)' },
  { id: 'pink',   value: '#FF2D55', label: 'Rose',    accentLight: '#FFEBEF', text: '#9D174D', gradient: 'linear-gradient(135deg, #FF6685, #FF2D55)' },
  { id: 'brown',  value: '#A2845E', label: 'Marron',  accentLight: '#F6F2EE', text: '#6E5538', gradient: 'linear-gradient(135deg, #C2A47E, #A2845E)' },
  { id: 'gray',   value: '#8E8E93', label: 'Gris',    accentLight: '#F2F2F7', text: '#48484A', gradient: 'linear-gradient(135deg, #AEAEB2, #8E8E93)' },
  { id: 'slate',  value: '#5A738E', label: 'Ardoise', accentLight: '#F1F5F9', text: '#334155', gradient: 'linear-gradient(135deg, #7A93AE, #5A738E)' },
]

const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0].value

export function getAvatarColor(color?: string): string {
  return color ?? DEFAULT_AVATAR_COLOR
}
