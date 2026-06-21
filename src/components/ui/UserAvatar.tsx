import { useMemo } from 'react'
import { AVATAR_COLORS } from './avatarColors'
import { getTechColor } from '@/lib/planningUtils'

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

function getDynamicGradient(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return 'linear-gradient(135deg, #8E8E93, #5E5E62)'
  }
  
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  const clamp = (val: number) => Math.min(255, Math.max(0, val))
  const lighten = (val: number) => clamp(Math.round(val + (255 - val) * 0.35))
  
  const startHex = `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
  return `linear-gradient(135deg, ${startHex}, ${hex})`
}

export default function UserAvatar({ initiales, color, size = 40, fontSize }: UserAvatarProps) {
  const baseColor = useMemo(() => {
    if (!color) return '#4B5563'
    const normalizedColor = color.toLowerCase()
    
    // 1. Look up in predefined colors
    const match = AVATAR_COLORS.find(
      c => c.value.toLowerCase() === normalizedColor || 
           c.accentLight.toLowerCase() === normalizedColor ||
           c.text?.toLowerCase() === normalizedColor ||
           c.id.toLowerCase() === normalizedColor
    )
    if (match) return match.value
    
    // 2. Look up in static tech colors
    if (initiales) {
      const tech = getTechColor(initiales)
      if (tech.color.toLowerCase() === normalizedColor || tech.bg.toLowerCase() === normalizedColor) {
        return tech.color
      }
    }
    return color
  }, [color, initiales])

  const bg = useMemo(() => {
    if (!color) {
      return 'linear-gradient(135deg, #8E8E93, #5E5E62)'
    }
    
    const normalizedColor = color.toLowerCase()
    
    // 1. Look up in predefined colors
    const match = AVATAR_COLORS.find(
      c => c.value.toLowerCase() === normalizedColor || 
           c.accentLight.toLowerCase() === normalizedColor ||
           c.text?.toLowerCase() === normalizedColor ||
           c.id.toLowerCase() === normalizedColor
    )
    if (match && match.gradient) return match.gradient
    
    // 2. Look up in static tech colors
    if (initiales) {
      const tech = getTechColor(initiales)
      if (tech.gradient && (tech.color.toLowerCase() === normalizedColor || tech.bg.toLowerCase() === normalizedColor)) {
        return tech.gradient
      }
    }
    
    // 3. Dynamic fallback for arbitrary hex
    return getDynamicGradient(color)
  }, [color, initiales])

  const textColor = useMemo(() => {
    // Curated vibrant gradients are designed for white text
    // Custom colors fallback to dynamic luminance contrast of the base color
    return hexLuminance(baseColor) > 0.45 ? '#1C1C1E' : 'white'
  }, [baseColor])

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
