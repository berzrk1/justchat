import type { ChatUnmuteMessageServerToClient } from '../../types/messages'

interface UnmuteMessageProps {
  message: ChatUnmuteMessageServerToClient
  currentUsername?: string
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function UnmuteMessage({ message, currentUsername }: UnmuteMessageProps) {
  const { payload, timestamp } = message
  const { target } = payload
  const isOwn = currentUsername === target

  return (
    <div className="msg-appear" style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '6px 20px',
    }}>
      <div style={{
        background: isOwn ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isOwn ? 'rgba(168, 85, 247, 0.3)' : 'var(--border-bright)'}`,
        padding: '4px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
      }}>
        <span style={{ color: 'var(--accent)', fontSize: '11px' }}>◎</span>
        {isOwn ? (
          <span style={{ color: 'var(--accent)' }}>you were unmuted</span>
        ) : (
          <span style={{ color: 'var(--text-2)' }}>
            <span style={{ color: 'var(--text-1)' }}>{target}</span>
            {' unmuted'}
          </span>
        )}
        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}
