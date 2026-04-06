import { useState } from 'react'

const EMOJIS = ['👍', '😍', '🔥', '😂', '😭']

interface ReactionPickerProps {
  onSelect: (emote: string) => void
  onClose: () => void
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleSelect = (emote: string) => {
    onSelect(emote)
    setIsOpen(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => { setIsOpen(false); onClose() }} />
      <div
        className="popup-appear"
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: 0,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-bright)',
          padding: '8px',
          display: 'flex',
          gap: '2px',
          zIndex: 50,
        }}
      >
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px 5px',
              borderRadius: '2px',
              lineHeight: 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  )
}
