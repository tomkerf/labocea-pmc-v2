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

  const textColor = useMemo(() => {
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

  const style = useMemo<React.CSSProperties>(() => {
    const base = baseColor.startsWith('#') ? baseColor : '#636366'
    
    // Parse RGB
    const r = parseInt(base.slice(1, 3), 16) || 0
    const g = parseInt(base.slice(3, 5), 16) || 0
    const b = parseInt(base.slice(5, 7), 16) || 0
    
    const clamp = (val: number) => Math.min(255, Math.max(0, val))
    const lighten = (val: number) => clamp(Math.round(val + (255 - val) * 0.35))
    const darken = (val: number) => clamp(Math.round(val * 0.55))
    
    const startHex = `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
    const endHex = `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`
    
    // Double gradient gloss effect:
    // Layer 1: A bright, distinct white reflex spot at the top-left (represents the direct light source reflection)
    // Layer 2: A 3D radial sphere representing the body of the glossy candy
    const radialBg = `
      radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 35%),
      radial-gradient(circle at 35% 30%, ${startHex} 0%, ${base} 60%, ${endHex} 100%)
    `.trim().replace(/\s+/g, ' ')

    return {
      width: size,
      height: size,
      borderRadius: '50%',
      background: radialBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: textColor,
      fontWeight: 800, // Chunky printed letter style
      fontSize: fs,
      letterSpacing: '0.01em',
      userSelect: 'none',
      border: '1px solid rgba(0, 0, 0, 0.12)', // Subtle edge definition
      boxShadow: `
        inset 0 3px 4px rgba(255, 255, 255, 0.8), 
        inset 0 -3px 4px rgba(0, 0, 0, 0.45), 
        0 4px 6px -1px rgba(0, 0, 0, 0.2), 
        0 2px 4px -1px rgba(0, 0, 0, 0.15)
      `,
      textShadow: textColor === 'white' 
        ? '0 1.5px 2.5px rgba(0,0,0,0.5)' 
        : '0 1px 1px rgba(255,255,255,0.6)',
    }
  }, [size, baseColor, fs, textColor])

  return (
    <div style={style}>
      {initiales || '?'}
    </div>
  )
}
