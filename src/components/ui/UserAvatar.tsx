// Palette des couleurs d'avatar disponibles
export const AVATAR_COLORS = [
  { id: 'blue',    value: '#0071E3', label: 'Bleu'    },
  { id: 'teal',    value: '#30B0C7', label: 'Cyan'    },
  { id: 'green',   value: '#34C759', label: 'Vert'    },
  { id: 'mint',    value: '#00C7BE', label: 'Menthe'  },
  { id: 'indigo',  value: '#5856D6', label: 'Indigo'  },
  { id: 'purple',  value: '#AF52DE', label: 'Violet'  },
  { id: 'pink',    value: '#FF2D55', label: 'Rose'    },
  { id: 'orange',  value: '#FF9F0A', label: 'Orange'  },
  { id: 'red',     value: '#FF3B30', label: 'Rouge'   },
  { id: 'brown',   value: '#A2845E', label: 'Marron'  },
  { id: 'gray',    value: '#636366', label: 'Gris'    },
  { id: 'slate',   value: '#3A6073', label: 'Ardoise' },
]

export const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0].value

export function getAvatarColor(color?: string): string {
  return color ?? DEFAULT_AVATAR_COLOR
}

interface UserAvatarProps {
  initiales?: string
  color?: string
  size?: number   // px
  fontSize?: number
}

export default function UserAvatar({ initiales, color, size = 40, fontSize }: UserAvatarProps) {
  const bg = getAvatarColor(color)
  const fs = fontSize ?? Math.round(size * 0.38)

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
