import { useMemo } from 'react'
import { getAvatarColor } from './avatarColors'

interface UserAvatarProps {
  initiales?: string
  color?: string
  size?: number   // px
  fontSize?: number
}

function hexLuminance(hex: string): number {
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255)
  const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255)
  const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export default function UserAvatar({ initiales, color, size = 40, fontSize }: UserAvatarProps) {
  const bg = getAvatarColor(color)
  const fs = fontSize ?? Math.round(size * 0.38)
  const textColor = hexLuminance(bg) > 0.35 ? '#1C1C1E' : 'white'
  const style = useMemo<React.CSSProperties>(() => ({
    width: size, height: size, borderRadius: '50%', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, color: textColor, fontWeight: 600, fontSize: fs,
    letterSpacing: '0.02em', userSelect: 'none',
  }), [size, bg, fs, textColor])

  return (
    <div style={style}>
      {initiales || '?'}
    </div>
  )
}
