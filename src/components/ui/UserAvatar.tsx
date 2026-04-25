// Palette des couleurs d'avatar disponibles.
// Orange (#FF9F0A), rouge (#FF3B30) et vert (#34C759) sont exclus intentionnellement :
// ils entrent en conflit avec les tokens de statut --color-warning, --color-danger, --color-success.
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

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/notionists/svg'

export function dicebearUrl(seed: string): string {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,f4d9bb`
}

interface UserAvatarProps {
  initiales?: string
  color?: string
  avatarSeed?: string
  size?: number   // px
  fontSize?: number
}

export default function UserAvatar({ initiales, color, avatarSeed, size = 40, fontSize }: UserAvatarProps) {
  const bg = getAvatarColor(color)
  const fs = fontSize ?? Math.round(size * 0.38)

  if (avatarSeed) {
    return (
      <img
        src={dicebearUrl(avatarSeed)}
        alt="avatar"
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
          flexShrink: 0,
          userSelect: 'none',
          display: 'block',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'white',
        fontWeight: 600,
        fontSize: fs,
        letterSpacing: '0.02em',
        userSelect: 'none',
      }}
    >
      {initiales || '?'}
    </div>
  )
}
