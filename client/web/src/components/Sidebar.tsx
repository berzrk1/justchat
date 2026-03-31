import { useState } from 'react'
import { useUser } from '../contexts/UserContext'

interface Channel {
  id: number
  name: string
}

interface SidebarProps {
  channels: Channel[]
  currentChannelId: number | null
  onChannelSelect?: (channelId: number) => void
  onAddChannel?: () => void
  onLeaveChannel?: (channelId: number) => void
}

export function Sidebar({ channels, currentChannelId, onChannelSelect, onAddChannel, onLeaveChannel }: SidebarProps) {
  const { username, isAuthenticated } = useUser()
  const [hoveredChannel, setHoveredChannel] = useState<number | null>(null)

  return (
    <div style={{
      width: 'var(--sidebar-w)',
      minWidth: 'var(--sidebar-w)',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* User row */}
      <div style={{
        height: 'var(--header-h)',
        padding: '0 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--accent)', fontSize: '12px', lineHeight: 1 }}>●</span>
        <span style={{
          color: 'var(--text-1)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '16px',
        }}>
          {username}
        </span>
        {isAuthenticated && (
          <span style={{
            color: 'var(--accent)',
            fontSize: '12px',
            letterSpacing: '0.06em',
            opacity: 0.6,
            border: '1px solid var(--border-bright)',
            padding: '2px 5px',
          }}>
            auth
          </span>
        )}
      </div>

      {/* Channels header */}
      <div style={{
        padding: '13px 18px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          color: 'var(--text-3)',
          fontSize: '14px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          channels
        </span>
        <button
          onClick={onAddChannel}
          style={{
            background: 'none',
            border: '1px solid var(--border-bright)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            padding: '2px 8px',
            fontSize: '18px',
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
          }}
          title="Join channel"
        >
          +
        </button>
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {channels.length === 0 ? (
          <div style={{ padding: '8px 18px', color: 'var(--text-3)', fontSize: '15px' }}>
            no channels
          </div>
        ) : (
          channels.map((channel) => {
            const isActive = currentChannelId === channel.id
            const isHovered = hoveredChannel === channel.id

            return (
              <div
                key={channel.id}
                onClick={() => onChannelSelect?.(channel.id)}
                onMouseEnter={() => setHoveredChannel(channel.id)}
                onMouseLeave={() => setHoveredChannel(null)}
                style={{
                  padding: '6px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isActive ? 'var(--accent-dim)' : isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                <span style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-3)',
                  fontSize: '15px',
                  userSelect: 'none',
                }}>
                  #
                </span>
                <span style={{
                  color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '16px',
                }}>
                  {channel.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onLeaveChannel?.(channel.id) }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                    fontSize: '15px',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.1s',
                    lineHeight: 1,
                    padding: '0 2px',
                  }}
                  title="Leave"
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
