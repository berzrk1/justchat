import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useWebSocket } from './WebSocketContext'
import type { Message } from '../types/messages'

// Map of message_id → Map of emote → count
type ReactionsMap = Map<string, Map<string, number>>

interface ReactionsContextType {
  getMessageReactions: (messageId: string) => Map<string, number>
}

const ReactionsContext = createContext<ReactionsContextType | undefined>(undefined)

export function ReactionsProvider({ children }: { children: ReactNode }) {
  const [reactions, setReactions] = useState<ReactionsMap>(new Map())
  const { messages } = useWebSocket()
  const processedCountRef = useRef(0)

  useEffect(() => {
    const unprocessed = messages.slice(processedCountRef.current)
    unprocessed.forEach((msg: Message) => {
      if (msg.type === 'chat_send') {
        const { reactions } = msg.payload
        if (reactions && Object.keys(reactions).length > 0) {
          setReactions(prev => {
            if (prev.has(msg.id!)) return prev
            const newMap = new Map(prev)
            newMap.set(msg.id!, new Map(Object.entries(reactions)))
            return newMap
          })
        }
      } else if (msg.type === 'chat_react_add') {
        const { message_id, emote } = msg.payload
        setReactions(prev => {
          const newMap = new Map(prev)
          const msgReactions = new Map(newMap.get(message_id) || [])
          msgReactions.set(emote, (msgReactions.get(emote) || 0) + 1)
          newMap.set(message_id, msgReactions)
          return newMap
        })
      } else if (msg.type === 'chat_react_remove') {
        const { message_id, emote } = msg.payload
        setReactions(prev => {
          const newMap = new Map(prev)
          const msgReactions = new Map(newMap.get(message_id) || [])
          const count = (msgReactions.get(emote) || 0) - 1
          if (count <= 0) msgReactions.delete(emote)
          else msgReactions.set(emote, count)
          if (msgReactions.size === 0) newMap.delete(message_id)
          else newMap.set(message_id, msgReactions)
          return newMap
        })
      }
    })
    processedCountRef.current = messages.length
  }, [messages])

  const getMessageReactions = (messageId: string): Map<string, number> => {
    return reactions.get(messageId) || new Map()
  }

  return (
    <ReactionsContext.Provider value={{ getMessageReactions }}>
      {children}
    </ReactionsContext.Provider>
  )
}

export function useReactions() {
  const context = useContext(ReactionsContext)
  if (context === undefined) {
    throw new Error('useReactions must be used within a ReactionsProvider')
  }
  return context
}
