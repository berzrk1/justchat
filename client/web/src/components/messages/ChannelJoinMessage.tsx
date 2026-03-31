import type { ChannelJoinMessageServerToClient } from '../../types/messages'

interface ChannelJoinMessageProps {
  message: ChannelJoinMessageServerToClient
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function ChannelJoinMessage({ message }: ChannelJoinMessageProps) {
  const { payload, timestamp } = message
  const username = payload.user?.username || 'someone'

  return (
    <div className="msg-appear" style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '6px 20px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-bright)',
        padding: '4px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
      }}>
        <span style={{ color: 'var(--accent)', fontSize: '9px' }}>●</span>
        <span style={{ color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--text-1)' }}>{username}</span>
          {' joined'}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}
