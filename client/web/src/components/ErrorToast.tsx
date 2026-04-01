import { useEffect, useState } from 'react'

export interface Toast {
  id: string
  detail: string
}

interface ErrorToastProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

const TOAST_DURATION = 5000

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const show = requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 200)
    }, TOAST_DURATION)

    return () => {
      cancelAnimationFrame(show)
      clearTimeout(timer)
    }
  }, [toast.id, onDismiss])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        background: 'var(--surface)',
        border: '1px solid rgba(248,113,113,0.35)',
        borderLeft: '3px solid var(--text-error)',
        padding: '10px 14px',
        maxWidth: '320px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(16px)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        pointerEvents: 'all',
      }}
    >
      <span style={{ color: 'var(--text-error)', fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>✕</span>
      <span style={{ color: 'var(--text-1)', fontSize: '15px', flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>
        {toast.detail}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-3)', fontSize: '14px', lineHeight: 1,
          flexShrink: 0, padding: '0 0 0 4px',
        }}
      >
        ✕
      </button>
    </div>
  )
}

export function ErrorToast({ toasts, onDismiss }: ErrorToastProps) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
