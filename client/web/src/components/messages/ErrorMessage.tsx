import type { ErrorMessage as ErrorMessageType } from '../../types/messages'

interface ErrorMessageProps {
  message: ErrorMessageType
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  const { payload, timestamp } = message

  return (
    <div className="msg-appear" style={{
      display: 'flex',
      padding: '3px 20px',
      gap: '0',
      alignItems: 'baseline',
      background: 'rgba(255, 68, 102, 0.04)',
      borderLeft: '2px solid rgba(255, 68, 102, 0.3)',
    }}>
      <span style={{ width: '56px', minWidth: '56px', color: 'var(--text-3)', fontSize: '15px', userSelect: 'none', flexShrink: 0 }}>
        {formatTime(timestamp)}
      </span>
      <span style={{ width: '125px', minWidth: '125px', color: 'var(--text-error)', fontSize: '16px', flexShrink: 0, fontWeight: '500' }}>
        error
      </span>
      <span style={{ color: 'var(--text-error)', fontSize: '16px', opacity: 0.85 }}>
        {payload.detail}
      </span>
    </div>
  )
}
