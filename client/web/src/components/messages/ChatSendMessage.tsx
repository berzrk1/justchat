import { useState } from 'react'
import type { ChatSendMessageServerToClient } from '../../types/messages'
import { useReactions } from '../../contexts/ReactionsContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { MessageBuilder } from '../../services/messageBuilder'
import { ReactionPicker } from '../ReactionPicker'

interface ChatSendMessageProps {
  message: ChatSendMessageServerToClient
  currentUsername?: string
}

function getUserColor(username: string): string {
  const palette = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#facc15', '#22d3ee', '#f87171']
  const hash = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function ChatSendMessageComponent({ message, currentUsername }: ChatSendMessageProps) {
  const { payload, timestamp, id } = message
  const sender = payload.sender?.username || 'unknown'
  const isOwn = !!currentUsername && sender === currentUsername
  const { getMessageReactions } = useReactions()
  const { sendMessage } = useWebSocket()
  const [showPicker, setShowPicker] = useState(false)
  const [hovered, setHovered] = useState(false)

  const reactions = id ? getMessageReactions(id) : new Map<string, number>()
  const userColor = isOwn ? 'var(--text-own)' : getUserColor(sender)

  const handleReact = (emote: string) => {
    if (!id) return
    sendMessage(MessageBuilder.react(payload.channel_id, id, emote))
  }

  return (
    <div
      className="msg-appear"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        padding: '3px 20px',
        background: isOwn ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
        borderLeft: `2px solid ${isOwn ? 'rgba(34, 197, 94, 0.3)' : 'transparent'}`,
        gap: '0',
      }}
    >
      {/* Timestamp */}
      <span style={{
        width: '56px',
        minWidth: '56px',
        color: 'var(--text-3)',
        fontSize: '15px',
        paddingTop: '1px',
        userSelect: 'none',
        flexShrink: 0,
      }}>
        {formatTime(timestamp)}
      </span>

      {/* Username */}
      <span style={{
        width: '100px',
        minWidth: '100px',
        color: userColor,
        fontWeight: '500',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingTop: '1px',
        paddingRight: '8px',
        flexShrink: 0,
        fontSize: '16px',
      }}>
        {sender}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: isOwn ? 'rgba(232, 232, 232, 0.85)' : 'var(--text-1)',
          wordBreak: 'break-word',
          lineHeight: '1.5',
        }}>
          {payload.content}
        </div>

        {/* Reactions */}
        {(reactions.size > 0 || hovered) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginTop: '4px',
            flexWrap: 'wrap',
          }}>
            {Array.from(reactions.entries()).map(([emote, count]) => (
              <button
                key={emote}
                onClick={() => handleReact(emote)}
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-bright)',
                  color: 'var(--text-1)',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  fontSize: '15px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  lineHeight: 1.4,
                }}
              >
                {emote}
                <span style={{ color: 'var(--text-2)', fontSize: '14px' }}>{count}</span>
              </button>
            ))}
            <div style={{ position: 'relative' }}>
              {showPicker && (
                <ReactionPicker onSelect={handleReact} onClose={() => setShowPicker(false)} />
              )}
              <button
                onClick={() => setShowPicker(v => !v)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  padding: '2px 9px',
                  fontSize: '15px',
                  opacity: hovered ? 0.8 : 0,
                  transition: 'opacity 0.1s',
                }}
                title="React"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
