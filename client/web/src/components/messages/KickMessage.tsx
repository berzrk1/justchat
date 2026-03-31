import type { ChatKickMessageServerToClient } from '../../types/messages'

interface KickMessageProps {
  message: ChatKickMessageServerToClient
  currentUsername?: string
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function KickMessage({ message, currentUsername }: KickMessageProps) {
  const { payload, timestamp } = message
  const { target, reason } = payload
  const isOwn = currentUsername === target

  return (
    <div className="msg-appear" style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '6px 20px',
    }}>
      <div style={{
        background: isOwn ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isOwn ? 'rgba(248, 113, 113, 0.3)' : 'var(--border-bright)'}`,
        padding: '4px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
      }}>
        <span style={{ color: 'var(--text-error)', fontSize: '11px' }}>✕</span>
        {isOwn ? (
          <span style={{ color: 'var(--text-error)' }}>
            you were kicked{reason ? <span style={{ color: 'rgba(248,113,113,0.6)' }}> — {reason}</span> : ''}
          </span>
        ) : (
          <span style={{ color: 'var(--text-2)' }}>
            <span style={{ color: 'var(--text-1)' }}>{target}</span>
            {' was kicked'}
            {reason && <span style={{ color: 'var(--text-3)' }}> — {reason}</span>}
          </span>
        )}
        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}
