import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import { initializeMessageHandlers } from './config/messageRegistry'
import { MessageRenderer } from './components/messages/MessageRenderer'
import { MessageBuilder } from './services/messageBuilder'
import { Sidebar } from './components/Sidebar'
import { MembersList } from './components/MembersList'
import { LoginModal } from './components/LoginModal'
import { SignupModal } from './components/SignupModal'
import { CommandAutocomplete } from './components/CommandAutocomplete'
import { CommandArgHint } from './components/CommandArgHint'
import { ErrorToast, type Toast } from './components/ErrorToast'
import { useUser } from './contexts/UserContext'
import { useWebSocket } from './contexts/WebSocketContext'
import type { Message } from './types/messages'
import { filterCommands, getCommand, parseCommand, type Command } from './config/commandRegistry'

interface Channel {
  id: number
  name: string
}

interface Member {
  username: string
  isOnline: boolean
  isGuest: boolean
}

function App() {
  const { username, displayName, isAuthenticated, login, logout } = useUser()
  const { isConnected, isReady, messages, sendMessage: wsSendMessage, reconnect } = useWebSocket()
  const [message, setMessage] = useState('')
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [currentChannelId, setCurrentChannelId] = useState<number | null>(null)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joinChannelId, setJoinChannelId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const joinedChannelsRef = useRef<Set<number>>(new Set())

  const [channelMembers, setChannelMembers] = useState<Map<number, Member[]>>(new Map())

  const processedMessageIds = useRef<Set<string>>(new Set())

  const [typingUsers, setTypingUsers] = useState<Map<number, Map<string, number>>>(new Map())
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const lastTypingSentRef = useRef<Map<number, number>>(new Map())

  const [showCommandAutocomplete, setShowCommandAutocomplete] = useState(false)
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([])
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [commandHint, setCommandHint] = useState<Command | null>(null)
  const [currentArgIndex, setCurrentArgIndex] = useState(0)
  const messageInputRef = useRef<HTMLInputElement>(null)

  const [errorToasts, setErrorToasts] = useState<Toast[]>([])

  const [muteEndTime, setMuteEndTime] = useState<number | null>(null)
  const [muteTimeRemaining, setMuteTimeRemaining] = useState<number>(0)

  useEffect(() => {
    initializeMessageHandlers()
  }, [])

  useEffect(() => {
    messages.forEach((message, index) => {
      const messageKey = message.id || `${message.timestamp}-${message.type}-${index}`
      if (processedMessageIds.current.has(messageKey)) return
      if (message.type === 'error') {
        const payload = message.payload as { detail: string }
        setErrorToasts(prev => [...prev, { id: messageKey, detail: payload.detail }])
        processedMessageIds.current.add(messageKey)
      }
    })
  }, [messages])

  useEffect(() => {
    if (!isReady) {
      joinedChannelsRef.current.clear()
      setChannels([])
      setCurrentChannelId(null)
      setChannelMembers(new Map())
    }
  }, [isReady])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    messages.forEach((message, index) => {
      const messageKey = message.id || `${message.timestamp}-${message.type}-${index}`

      if (processedMessageIds.current.has(messageKey)) return

      if (message.type === 'channel_members') {
        const payload = message.payload as { channel_id: number; members: { username: string; is_guest: boolean }[] }
        const members: Member[] = payload.members.map(m => ({
          username: m.username,
          isOnline: true,
          isGuest: m.is_guest
        }))
        setChannelMembers(prev => {
          const updated = new Map(prev)
          updated.set(payload.channel_id, members)
          return updated
        })
        processedMessageIds.current.add(messageKey)
      }
    })
  }, [messages])

  useEffect(() => {
    messages.forEach((message, index) => {
      const messageKey = message.id || `${message.timestamp}-${message.type}-${index}`

      if (processedMessageIds.current.has(messageKey)) return

      if (message.type === 'chat_typing') {
        const payload = message.payload as { channel_id: number; user?: { username: string } }

        if (!payload.user) {
          processedMessageIds.current.add(messageKey)
          return
        }

        if (payload.user.username === username) {
          processedMessageIds.current.add(messageKey)
          return
        }

        const typingUsername = payload.user.username
        const channelId = payload.channel_id
        const timeoutKey = `${channelId}-${typingUsername}`

        const existingTimeout = typingTimeoutsRef.current.get(timeoutKey)
        if (existingTimeout) clearTimeout(existingTimeout)

        setTypingUsers(prev => {
          const updated = new Map(prev)
          const channelTyping = updated.get(channelId) || new Map()
          channelTyping.set(typingUsername, Date.now())
          updated.set(channelId, new Map(channelTyping))
          return updated
        })

        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const updated = new Map(prev)
            const channelTyping = updated.get(channelId)
            if (channelTyping) {
              channelTyping.delete(typingUsername)
              if (channelTyping.size === 0) {
                updated.delete(channelId)
              } else {
                updated.set(channelId, new Map(channelTyping))
              }
            }
            return updated
          })
          typingTimeoutsRef.current.delete(timeoutKey)
        }, 10000)

        typingTimeoutsRef.current.set(timeoutKey, timeout)
        processedMessageIds.current.add(messageKey)
      }

      if (message.type === 'chat_send') {
        const payload = message.payload as { channel_id: number; sender?: { username: string } }
        if (payload.sender?.username) {
          const channelId = payload.channel_id
          const senderUsername = payload.sender.username
          const timeoutKey = `${channelId}-${senderUsername}`

          const existingTimeout = typingTimeoutsRef.current.get(timeoutKey)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
            typingTimeoutsRef.current.delete(timeoutKey)
          }

          setTypingUsers(prev => {
            const updated = new Map(prev)
            const channelTyping = updated.get(channelId)
            if (channelTyping) {
              channelTyping.delete(senderUsername)
              if (channelTyping.size === 0) updated.delete(channelId)
              else updated.set(channelId, new Map(channelTyping))
            }
            return updated
          })
        }
      }
    })
  }, [messages, username])

  useEffect(() => {
    return () => {
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      typingTimeoutsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    messages.forEach((message, index) => {
      const messageKey = message.id || `${message.timestamp}-${message.type}-${index}`

      if (processedMessageIds.current.has(messageKey)) return

      if (message.type === 'chat_mute') {
        const payload = message.payload as { channel_id: number; target: string; duration?: number }
        if (payload.target === username) {
          if (payload.duration) {
            setMuteEndTime(Date.now() + (payload.duration * 1000))
            setMuteTimeRemaining(payload.duration)
          } else {
            setMuteEndTime(-1)
            setMuteTimeRemaining(0)
          }
        }
        processedMessageIds.current.add(messageKey)
      }

      if (message.type === 'chat_unmute') {
        const payload = message.payload as { channel_id: number; target: string }
        if (payload.target === username) {
          setMuteEndTime(null)
          setMuteTimeRemaining(0)
        }
        processedMessageIds.current.add(messageKey)
      }

      if (message.type === 'chat_kick') {
        const payload = message.payload as { channel_id: number; target: string; reason?: string }
        if (payload.target === username) {
          const channelId = payload.channel_id
          const channelName = channels.find(c => c.id === channelId)?.name || `Channel ${channelId}`
          const alertMessage = payload.reason
            ? `You have been kicked from ${channelName}\nReason: ${payload.reason}`
            : `You have been kicked from ${channelName}`
          alert(alertMessage)

          joinedChannelsRef.current.delete(channelId)
          setChannels(prev => prev.filter(c => c.id !== channelId))
          setChannelMembers(prev => {
            const updated = new Map(prev)
            updated.delete(channelId)
            return updated
          })
          setCurrentChannelId(prev => {
            if (prev === channelId) {
              const remaining = Array.from(joinedChannelsRef.current)
              return remaining.length > 0 ? remaining[0] : null
            }
            return prev
          })
        }
        processedMessageIds.current.add(messageKey)
      }
    })
  }, [messages, username])

  useEffect(() => {
    if (!muteEndTime || muteEndTime === -1) return

    const interval = setInterval(() => {
      const timeLeft = Math.max(0, Math.ceil((muteEndTime - Date.now()) / 1000))
      setMuteTimeRemaining(timeLeft)
      if (timeLeft === 0) {
        setMuteEndTime(null)
        setMuteTimeRemaining(0)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [muteEndTime])

  const filteredMessages = currentChannelId !== null
    ? messages.filter((msg: Message) => {
        if (msg.type === 'chat_send' && 'channel_id' in msg.payload) return msg.payload.channel_id === currentChannelId
        if ((msg.type === 'channel_join' || msg.type === 'channel_leave') && 'channel_id' in msg.payload) return msg.payload.channel_id === currentChannelId
        if (msg.type === 'chat_kick' && 'channel_id' in msg.payload) return msg.payload.channel_id === currentChannelId
        if (msg.type === 'chat_mute' && 'channel_id' in msg.payload) return msg.payload.channel_id === currentChannelId
        if (msg.type === 'chat_unmute' && 'channel_id' in msg.payload) return msg.payload.channel_id === currentChannelId
        return false
      })
    : []

  function handleJoinChannel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const channelId = parseInt(joinChannelId)
    if (isNaN(channelId) || channelId < 0) {
      alert('Please enter a valid channel ID (positive number)')
      return
    }

    if (joinedChannelsRef.current.has(channelId)) {
      alert('You have already joined this channel')
      setIsJoinModalOpen(false)
      setJoinChannelId('')
      return
    }

    wsSendMessage(MessageBuilder.channelJoin(channelId))
    joinedChannelsRef.current.add(channelId)

    if (!channels.find(c => c.id === channelId)) {
      setChannels(prev => [...prev, { id: channelId, name: `channel ${channelId}` }])
    }

    setCurrentChannelId(channelId)
    setIsJoinModalOpen(false)
    setJoinChannelId('')
  }

  function handleChannelSelect(channelId: number) {
    setCurrentChannelId(channelId)
  }

  function handleLeaveChannel(channelId: number) {
    wsSendMessage(MessageBuilder.channelLeave(channelId))
    joinedChannelsRef.current.delete(channelId)
    setChannels(prev => prev.filter(c => c.id !== channelId))
    setChannelMembers(prev => {
      const updated = new Map(prev)
      updated.delete(channelId)
      return updated
    })
    if (currentChannelId === channelId) {
      const remaining = channels.filter(c => c.id !== channelId)
      setCurrentChannelId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  function handleMessageChange(newMessage: string) {
    setMessage(newMessage)

    if (!newMessage.startsWith('/')) {
      setShowCommandAutocomplete(false)
      setCommandHint(null)
      if (currentChannelId !== null && newMessage.length > 0 && isConnected) {
        const now = Date.now()
        const lastSent = lastTypingSentRef.current.get(currentChannelId) || 0
        if (now - lastSent > 8000) {
          wsSendMessage(MessageBuilder.typingStart(currentChannelId))
          lastTypingSentRef.current.set(currentChannelId, now)
        }
      }
      return
    }

    if (newMessage === '/') {
      setFilteredCommands(filterCommands(''))
      setShowCommandAutocomplete(true)
      setSelectedCommandIndex(0)
      setCommandHint(null)
      return
    }

    const parsed = parseCommand(newMessage)
    if (!parsed) {
      setShowCommandAutocomplete(false)
      setCommandHint(null)
      return
    }

    const hasSpaceAfterCommand = newMessage.slice(1).includes(' ')

    if (hasSpaceAfterCommand) {
      const exactCommand = getCommand(parsed.command)
      if (exactCommand) {
        setShowCommandAutocomplete(false)
        setCommandHint(exactCommand)
        const endsWithSpace = newMessage.endsWith(' ')
        const argIdx = endsWithSpace ? parsed.args.length : Math.max(0, parsed.args.length - 1)
        setCurrentArgIndex(Math.min(argIdx, Math.max(0, exactCommand.arguments.length - 1)))
      } else {
        setShowCommandAutocomplete(false)
        setCommandHint(null)
      }
    } else {
      const matches = filterCommands(parsed.command)
      setFilteredCommands(matches)
      setShowCommandAutocomplete(matches.length > 0)
      setSelectedCommandIndex(0)
      setCommandHint(null)
    }
  }

  function handleCommandSelect(command: Command) {
    setMessage(`/${command.name} `)
    setShowCommandAutocomplete(false)
    if (command.arguments.length > 0) {
      setCommandHint(command)
      setCurrentArgIndex(0)
    } else {
      setCommandHint(null)
    }
    messageInputRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setShowCommandAutocomplete(false)
      setCommandHint(null)
      return
    }
    if (!showCommandAutocomplete) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedCommandIndex(prev => prev < filteredCommands.length - 1 ? prev + 1 : prev)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : 0)
    } else if (e.key === 'Tab' || (e.key === 'Enter' && filteredCommands.length > 0)) {
      e.preventDefault()
      const selected = filteredCommands[selectedCommandIndex]
      if (selected) handleCommandSelect(selected)
    }
  }

  function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!currentChannelId) {
      alert('Please join a channel first')
      return
    }

    if (!message.trim() || !isConnected) return

    if (message.startsWith('/')) {
      const parsed = parseCommand(message)
      if (!parsed) {
        alert('Invalid command format')
        return
      }

      if (parsed.command === 'kick') {
        if (parsed.args.length < 1) { alert('Usage: /kick <target> [reason]'); return }
        const target = parsed.args[0]
        const reason = parsed.args.slice(1).join(' ') || undefined
        wsSendMessage(MessageBuilder.chatKick(currentChannelId, target, reason))
        setMessage('')
      } else if (parsed.command === 'mute') {
        if (parsed.args.length < 1) { alert('Usage: /mute <target> [duration] [reason]'); return }
        const target = parsed.args[0]
        let duration: number | undefined = undefined
        let reasonStartIndex = 1
        if (parsed.args.length > 1) {
          const possibleDuration = parseInt(parsed.args[1])
          if (!isNaN(possibleDuration)) {
            duration = possibleDuration
            reasonStartIndex = 2
          }
        }
        const reason = parsed.args.slice(reasonStartIndex).join(' ') || undefined
        wsSendMessage(MessageBuilder.chatMute(currentChannelId, target, duration, reason))
        setMessage('')
      } else if (parsed.command === 'unmute') {
        if (parsed.args.length < 1) { alert('Usage: /unmute <target>'); return }
        wsSendMessage(MessageBuilder.chatUnmute(currentChannelId, parsed.args[0]))
        setMessage('')
      } else {
        alert(`Unknown command: ${parsed.command}`)
      }
    } else {
      wsSendMessage(MessageBuilder.chatSend(currentChannelId, message))
      setMessage('')
      lastTypingSentRef.current.delete(currentChannelId)
    }

    setShowCommandAutocomplete(false)
    setCommandHint(null)
  }

  function dismissToast(id: string) {
    setErrorToasts(prev => prev.filter(t => t.id !== id))
  }

  function handleLoginSuccess(loggedInUsername: string) {
    login(loggedInUsername)
    reconnect()
  }

  function handleLogout() {
    logout()
    reconnect()
  }

  // Typing indicator text
  const currentTyping = currentChannelId !== null ? typingUsers.get(currentChannelId) : null
  const typingText = (() => {
    if (!currentTyping || currentTyping.size === 0) return null
    const names = Array.from(currentTyping.keys())
    if (names.length === 1) return names[0]
    if (names.length === 2) return `${names[0]}, ${names[1]}`
    return `${names[0]} +${names.length - 1}`
  })()

  const currentChannel = currentChannelId !== null ? channels.find(c => c.id === currentChannelId) : null
  const isMuted = !!muteEndTime
  const inputDisabled = !isConnected || currentChannelId === null || isMuted

  const inputPlaceholder = isMuted
    ? muteEndTime === -1
      ? 'muted indefinitely'
      : `muted · ${Math.floor(muteTimeRemaining / 60)}:${(muteTimeRemaining % 60).toString().padStart(2, '0')} remaining`
    : currentChannelId !== null
    ? `message #${currentChannel?.name ?? currentChannelId}`
    : 'join a channel to start chatting'

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <ErrorToast toasts={errorToasts} onDismiss={dismissToast} />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignup={() => { setIsLoginModalOpen(false); setIsSignupModalOpen(true) }}
      />
      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onSignupSuccess={handleLoginSuccess}
        onSwitchToLogin={() => { setIsSignupModalOpen(false); setIsLoginModalOpen(true) }}
      />

      {/* Join Channel Modal */}
      {isJoinModalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
        }}>
          <div
            className="modal-appear"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-bright)',
              padding: '30px',
              width: '100%',
              maxWidth: '350px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--accent)', fontSize: '15px' }}>›</span>
                <span style={{ color: 'var(--text-2)', fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  join channel
                </span>
              </div>
              <button
                onClick={() => { setIsJoinModalOpen(false); setJoinChannelId('') }}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '19px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinChannel}>
              <div style={{ marginBottom: '30px' }}>
                <div style={{ color: 'var(--text-3)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>
                  channel id
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-bright)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--accent)', userSelect: 'none' }}>#</span>
                  <input
                    type="number"
                    value={joinChannelId}
                    onChange={(e) => setJoinChannelId(e.target.value)}
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      color: 'var(--text-1)', fontSize: '19px', caretColor: 'var(--accent)',
                    }}
                    autoFocus
                    min="0"
                    placeholder="1"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setIsJoinModalOpen(false); setJoinChannelId('') }}
                  style={{
                    flex: 1, background: 'none', border: '1px solid var(--border-bright)',
                    color: 'var(--text-2)', cursor: 'pointer', padding: '9px', fontSize: '16px',
                  }}
                >
                  cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                    color: 'var(--accent)', cursor: 'pointer', padding: '9px', fontSize: '16px',
                  }}
                >
                  join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Sidebar
        channels={channels}
        currentChannelId={currentChannelId}
        onChannelSelect={handleChannelSelect}
        onAddChannel={() => setIsJoinModalOpen(true)}
        onLeaveChannel={handleLeaveChannel}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
          height: 'var(--header-h)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-3)', userSelect: 'none' }}>#</span>
            <span style={{ color: currentChannel ? 'var(--text-1)' : 'var(--text-3)', fontWeight: '500', fontSize: '18px' }}>
              {currentChannel ? currentChannel.name : 'no channel selected'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {isAuthenticated ? (
              <>
                <span style={{ color: 'var(--text-2)', fontSize: '16px' }}>
                  {displayName}
                </span>
                <Link
                  to="/dashboard"
                  style={{ color: 'var(--text-2)', fontSize: '15px', textDecoration: 'none', letterSpacing: '0.04em' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                >
                  dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '15px', letterSpacing: '0.04em' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                >
                  logout
                </button>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-3)', fontSize: '15px' }}>guest</span>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  style={{
                    background: 'none', border: '1px solid var(--border-bright)',
                    color: 'var(--text-2)', cursor: 'pointer', fontSize: '15px',
                    padding: '2px 8px', letterSpacing: '0.04em',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                >
                  login
                </button>
              </>
            )}

            <span style={{
              color: isConnected ? 'var(--accent)' : 'var(--text-error)',
              fontSize: '14px',
              letterSpacing: '0.08em',
              userSelect: 'none',
            }}>
              ● {isConnected ? 'syn' : 'err'}
            </span>
          </div>
        </div>

        {/* Demo banner */}
        <div style={{
          padding: '6px 20px',
          borderBottom: '1px solid rgba(255, 170, 68, 0.12)',
          background: 'rgba(255, 170, 68, 0.03)',
          flexShrink: 0,
        }}>
          <span style={{ color: 'var(--text-warn)', fontSize: '15px', opacity: 0.75 }}>
            ─ demo: server resets hourly · open registration · join any channel by number
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {currentChannelId === null ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: '15px',
            }}>
              <span style={{ color: 'var(--text-3)', fontSize: '16px' }}>
                no channel selected
              </span>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                style={{
                  background: 'var(--accent-dim)', border: '1px solid var(--border-bright)',
                  color: 'var(--text-2)', cursor: 'pointer', padding: '8px 20px', fontSize: '16px',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-2)' }}
              >
                + join channel
              </button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', paddingTop: '24px', fontSize: '16px' }}>
              no messages in this channel
            </div>
          ) : (
            <>
              {filteredMessages.map((msg, index) => (
                <MessageRenderer
                  key={msg.id || `${msg.timestamp}-${index}`}
                  message={msg}
                  currentUsername={username}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Typing indicator */}
        {typingText && (
          <div style={{
            padding: '4px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '6px',
            flexShrink: 0,
            height: '33px',
          }}>
            <span style={{ color: 'var(--text-3)', fontSize: '15px' }}>{typingText} typing</span>
            <span className="blink" style={{ color: 'var(--accent)', fontSize: '15px', fontWeight: '600' }}>_</span>
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <form
            onSubmit={sendMessage}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}
          >
            {showCommandAutocomplete && (
              <CommandAutocomplete
                commands={filteredCommands}
                selectedIndex={selectedCommandIndex}
                onSelect={handleCommandSelect}
              />
            )}
            {!showCommandAutocomplete && commandHint && (
              <CommandArgHint
                command={commandHint}
                currentArgIndex={currentArgIndex}
              />
            )}

            <span style={{ color: 'var(--accent)', userSelect: 'none', fontSize: '19px', lineHeight: 1, flexShrink: 0 }}>
              ›
            </span>
            <input
              ref={messageInputRef}
              type="text"
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              disabled={inputDisabled}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-1)',
                fontSize: '18px',
                caretColor: 'var(--accent)',
                opacity: inputDisabled ? 0.35 : 1,
              }}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!isConnected || !message.trim() || currentChannelId === null || isMuted}
              style={{
                background: 'none',
                border: '1px solid var(--border-bright)',
                color: (!isConnected || !message.trim() || currentChannelId === null || isMuted) ? 'var(--text-3)' : 'var(--text-2)',
                cursor: (!isConnected || !message.trim() || currentChannelId === null || isMuted) ? 'not-allowed' : 'pointer',
                padding: '4px 13px',
                fontSize: '15px',
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}
            >
              send
            </button>
          </form>
        </div>
      </div>

      <MembersList
        members={currentChannelId !== null ? (channelMembers.get(currentChannelId) || []) : []}
        currentChannelId={currentChannelId}
      />
    </div>
  )
}

export default App
