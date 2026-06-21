import { useMemo } from 'react'
import { AVATAR_COLORS } from './avatarColors'

interface UserAvatarProps {
  initiales?: string
  color?: string
  size?: number   // px
  fontSize?: number
}

function hexLuminance(hex: string): number {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return 0
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255)
  const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255)
  const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export default function UserAvatar({ initiales, color, size = 40, fontSize }: UserAvatarProps) {
  const bg = useMemo(() => {
    if (!color) {
      return '#4B5563' // Tailwind Gray-600 fallback
    }
    
    // Look up in predefined colors
    const normalizedColor = color.toLowerCase()
    const match = AVATAR_COLORS.find(
      c => c.value.toLowerCase() === normalizedColor || 
           c.accentLight.toLowerCase() === normalizedColor ||
           c.text?.toLowerCase() === normalizedColor ||
           c.id.toLowerCase() === normalizedColor
    )
    
    return match ? match.value : color
  }, [color])

  const textColor = useMemo(() => {
    // Curated vibrant palette is designed for white text
    // Custom colors fallback to dynamic luminance contrast
    return hexLuminance(bg) > 0.45 ? '#1C1C1E' : 'white'
  }, [bg])

  // Handle font size dynamically to prevent overflow of multi-letter initials
  const fs = useMemo(() => {
    if (fontSize) return fontSize
    const len = initiales?.length ?? 0
    if (len > 3) return Math.round(size * 0.24)
    if (len > 2) return Math.round(size * 0.32)
    return Math.round(size * 0.38)
  }, [fontSize, initiales, size])

  const style = useMemo<React.CSSProperties>(() => ({
    width: size,
    height: size,
    borderRadius: '50%',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: textColor,
    fontWeight: 600,
    fontSize: fs,
    letterSpacing: '0.02em',
    userSelect: 'none',
  }), [size, bg, fs, textColor])

  return (
    <div style={style}>
      {initiales || '?'}
    </div>
  )
}
