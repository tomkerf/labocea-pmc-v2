import { useMemo } from 'react'
import { getAvatarColor } from './avatarColors'

interface UserAvatarProps {
  initiales?: string
  color?: string
  size?: number   // px
  fontSize?: number
}

export default function UserAvatar({ initiales, color, size = 40, fontSize }: UserAvatarProps) {
  const bg = getAvatarColor(color)
  const fs = fontSize ?? Math.round(size * 0.38)
  const style = useMemo<React.CSSProperties>(() => ({
    width: size, height: size, borderRadius: '50%', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, color: 'white', fontWeight: 600, fontSize: fs,
    letterSpacing: '0.02em', userSelect: 'none',
  }), [size, bg, fs])

  return (
    <div style={style}>
      {initiales || '?'}
    </div>
  )
}
