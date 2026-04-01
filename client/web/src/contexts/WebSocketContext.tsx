import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { MessageBuilder } from '../services/messageBuilder'
import { parseMessage } from '../services/messageParser'
import type { Message } from '../types/messages'
import { tokenStorage } from '../services/tokenStorage'

interface WebSocketContextType {
  isConnected: boolean
  messages: Message[]
  sendMessage: (message: any) => void
  reconnect: () => void
  disconnect: () => void
  clearMessages: () => void
  isReady: boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

interface WebSocketProviderProps {
  children: ReactNode
  username: string
  enabled?: boolean
  onUsernameAssigned?: (username: string, isGuest: boolean) => void
}

export function WebSocketProvider({ children, username, enabled = true, onUsernameAssigned }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isIntentionalDisconnect = useRef(false)
  const seenMessagesRef = useRef<Set<string>>(new Set())

  const connect = useCallback(() => {
    if (!enabled || !username) {
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      setIsConnected(true)

      const token = tokenStorage.getToken()

      const helloMessage = MessageBuilder.hello(token || undefined)
      ws.send(JSON.stringify(helloMessage))
    }

    ws.onmessage = (event) => {
      const parsedMessage = parseMessage(event.data)

      if (parsedMessage) {
        if (parsedMessage.type === 'hello') {
          const helloPayload = parsedMessage.payload as any

          if (helloPayload.user?.username) {
            if (onUsernameAssigned) {
              onUsernameAssigned(helloPayload.user.username, helloPayload.user.is_guest || false)
            }
          }

          setIsReady(true)
        }

        const fingerprint = parsedMessage.id || `${parsedMessage.type}-${parsedMessage.timestamp}-${JSON.stringify(parsedMessage.payload)}`
        if (seenMessagesRef.current.has(fingerprint)) {
          return
        }
        seenMessagesRef.current.add(fingerprint)
        setMessages(prev => [...prev, parsedMessage])
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsReady(false)
      wsRef.current = null

      if (!isIntentionalDisconnect.current && enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    wsRef.current = ws
  }, [username, enabled, onUsernameAssigned])

  const disconnect = useCallback(() => {
    isIntentionalDisconnect.current = true
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsReady(false)
  }, [])

  const reconnect = useCallback(() => {
    isIntentionalDisconnect.current = false
    disconnect()
    setTimeout(() => {
      connect()
    }, 500)
  }, [connect, disconnect])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.error('WebSocket not connected')
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    seenMessagesRef.current.clear()
  }, [])

  useEffect(() => {
    isIntentionalDisconnect.current = false
    connect()

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: WebSocketContextType = {
    isConnected,
    isReady,
    messages,
    sendMessage,
    reconnect,
    disconnect,
    clearMessages,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
